import { DataMode } from "@prisma/client";

import { getAppConfig } from "@/lib/config";
import { clamp } from "@/lib/utils";
import type {
  MarketDataProvider,
  NormalizedMarket,
  ProviderPayload,
} from "@/server/market-data/types";

type RawRecord = Record<string, unknown>;

type FetchAttempt = {
  url: string;
  label: string;
};

const POSTGRES_INT_MAX = 2_147_483_647;

function asString(value: unknown) {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

function asBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    return lowered === "true" || lowered === "1";
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return false;
}

function parseArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function toPriceCents(value: unknown) {
  const numeric = asNumber(value);

  if (numeric === null) {
    return null;
  }

  const cents = numeric <= 1 ? Math.round(numeric * 100) : Math.round(numeric);
  return clamp(cents, 1, 99);
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeTags(...values: unknown[]) {
  return values
    .flatMap((value) => parseArray(value))
    .map((value) => asString(typeof value === "object" && value !== null ? (value as RawRecord).label ?? (value as RawRecord).name ?? value : value))
    .filter(Boolean)
    .slice(0, 8);
}

function buildAttempts() {
  const config = getAppConfig();
  const attempts: FetchAttempt[] = [];
  const seen = new Set<string>();

  const candidateUrls = [
    config.liveMarketApiUrl || "https://gamma-api.polymarket.com/events?active=true&closed=false&archived=false",
    "https://gamma-api.polymarket.com/markets?active=true&closed=false&archived=false",
  ];

  for (const candidate of candidateUrls) {
    if (!candidate || seen.has(candidate)) {
      continue;
    }

    seen.add(candidate);
    attempts.push({
      url: candidate,
      label: candidate.includes("/events") ? "Polymarket events" : "Polymarket markets",
    });
  }

  return attempts;
}

function withPaging(urlString: string, pageSize: number, offset: number) {
  const url = new URL(urlString);

  if (!url.searchParams.has("active")) {
    url.searchParams.set("active", "true");
  }

  if (!url.searchParams.has("closed")) {
    url.searchParams.set("closed", "false");
  }

  if (!url.searchParams.has("archived")) {
    url.searchParams.set("archived", "false");
  }

  if (!url.searchParams.has("order")) {
    url.searchParams.set("order", "volume24hr");
  }

  if (!url.searchParams.has("ascending")) {
    url.searchParams.set("ascending", "false");
  }

  url.searchParams.set("limit", String(pageSize));
  url.searchParams.set("offset", String(offset));
  return url;
}

function extractRecords(json: unknown) {
  if (Array.isArray(json)) {
    return json;
  }

  if (typeof json === "object" && json !== null) {
    const record = json as RawRecord;

    if (Array.isArray(record.data)) {
      return record.data;
    }

    if (Array.isArray(record.markets)) {
      return record.markets;
    }

    if (Array.isArray(record.events)) {
      return record.events;
    }
  }

  return [];
}

function flattenMarkets(records: unknown[]) {
  const flattened: RawRecord[] = [];

  for (const item of records) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const record = item as RawRecord;
    const nestedMarkets = parseArray(record.markets).filter(
      (entry): entry is RawRecord => typeof entry === "object" && entry !== null,
    );

    if (nestedMarkets.length) {
      for (const nested of nestedMarkets) {
        flattened.push({
          ...nested,
          eventTitle: record.title ?? record.question,
          eventSlug: record.slug,
          eventCategory: record.category,
          eventImage: record.image,
          eventIcon: record.icon,
          eventDescription: record.description,
          tags: normalizeTags(record.tags, nested.tags),
        });
      }
      continue;
    }

    flattened.push(record);
  }

  return flattened;
}

function parseOutcomePrices(raw: RawRecord) {
  const directYes = toPriceCents(raw.yesPrice ?? raw.bestAsk ?? raw.lastTradePrice);
  const directNo = toPriceCents(raw.noPrice);

  if (directYes !== null) {
    return {
      yesPriceCents: directYes,
      noPriceCents: directNo ?? 100 - directYes,
    };
  }

  const outcomes = parseArray(raw.outcomes);
  const outcomePrices = parseArray(raw.outcomePrices);

  if (outcomes.length && outcomePrices.length && outcomes.length === outcomePrices.length) {
    const normalizedLabels = outcomes.map((item) => asString(item).toUpperCase());
    const yesIndex = normalizedLabels.findIndex((label) => label.includes("YES"));
    const noIndex = normalizedLabels.findIndex((label) => label.includes("NO"));

    const yesPrice = yesIndex >= 0 ? toPriceCents(outcomePrices[yesIndex]) : null;
    const noPrice = noIndex >= 0 ? toPriceCents(outcomePrices[noIndex]) : null;

    if (yesPrice !== null) {
      return {
        yesPriceCents: yesPrice,
        noPriceCents: noPrice ?? 100 - yesPrice,
      };
    }
  }

  return null;
}

function parseStatus(raw: RawRecord) {
  const resolved = asBoolean(raw.resolved) || asBoolean(raw.isResolved);
  const hasOrderBookFlag = raw.enableOrderBook !== undefined;
  const closed =
    asBoolean(raw.closed) ||
    asBoolean(raw.isClosed) ||
    asBoolean(raw.archived) ||
    (hasOrderBookFlag && asBoolean(raw.enableOrderBook) === false);

  if (resolved) {
    return "RESOLVED" as const;
  }

  if (closed) {
    return "CLOSED" as const;
  }

  return "ACTIVE" as const;
}

function parseResolvedOutcomeKey(raw: RawRecord) {
  const winner = asString(raw.resolution ?? raw.winner ?? raw.resolvedOutcome).toUpperCase();

  if (winner.includes("YES")) {
    return "YES" as const;
  }

  if (winner.includes("NO")) {
    return "NO" as const;
  }

  return null;
}

function normalizeLiquidity(value: number | null) {
  if (value === null || value <= 0) {
    return 0;
  }

  return clamp(Math.round(Math.log10(value + 1) * 20), 0, 100);
}

function normalizeCurrencyCents(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return clamp(Math.round(value * 100), 0, POSTGRES_INT_MAX);
}

function mapRawMarket(raw: RawRecord): NormalizedMarket | null {
  const title = asString(raw.question ?? raw.title ?? raw.name);
  const prices = parseOutcomePrices(raw);
  const explicitSlug = asString(raw.slug);
  const slug = explicitSlug || slugify(title);

  if (!title || !slug || !prices) {
    return null;
  }

  const endDateValue =
    asString(raw.endDate ?? raw.end_date_iso ?? raw.endTime ?? raw.end_time ?? raw.endsAt) ||
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const endsAt = new Date(endDateValue);

  if (Number.isNaN(endsAt.getTime())) {
    return null;
  }

  const tags = normalizeTags(raw.tags, raw.category, raw.eventCategory);
  const category =
    asString(raw.category ?? raw.categoryName ?? raw.topic ?? raw.eventCategory) ||
    tags[0] ||
    "General";
  const volume24h =
    asNumber(raw.volume24hr ?? raw.volume24h ?? raw.oneDayVolume ?? raw.volume) ?? 0;
  const liquidityRaw =
    asNumber(raw.liquidityNum ?? raw.liquidity ?? raw.openInterest ?? raw.liquidityClob) ?? null;

  return {
    externalId: asString(raw.id ?? raw.marketId ?? raw.conditionId) || slug,
    slug,
    title,
    description:
      asString(raw.description ?? raw.subtitle ?? raw.summary ?? raw.eventDescription) ||
      "Live market imported from the configured public prediction-market feed.",
    category,
    tags,
    yesPriceCents: prices.yesPriceCents,
    noPriceCents: prices.noPriceCents,
    volume24hCents: normalizeCurrencyCents(volume24h),
    liquidityScore: normalizeLiquidity(liquidityRaw),
    featured: volume24h > 25_000,
    sourceUrl:
      asString(raw.url ?? raw.marketUrl ?? raw.sourceUrl) ||
      (explicitSlug ? `https://polymarket.com/event/${explicitSlug}` : null),
    imageUrl: asString(raw.image ?? raw.icon ?? raw.imageUrl ?? raw.eventImage ?? raw.eventIcon) || null,
    endsAt,
    status: parseStatus(raw),
    resolvedOutcomeKey: parseResolvedOutcomeKey(raw),
    resolvedAt: raw.resolvedAt ? new Date(asString(raw.resolvedAt)) : null,
    sourceMode: DataMode.LIVE,
  };
}

async function fetchAttempt(attempt: FetchAttempt, pageSize: number, apiKey: string | null) {
  const collected: RawRecord[] = [];

  for (let page = 0; page < 4; page += 1) {
    const url = withPaging(attempt.url, pageSize, page * pageSize);
    const response = await fetch(url, {
      cache: "no-store",
      headers: apiKey
        ? {
            Accept: "application/json",
            Authorization: `Bearer ${apiKey}`,
            "X-API-Key": apiKey,
          }
        : {
            Accept: "application/json",
          },
    });

    if (!response.ok) {
      throw new Error(`${attempt.label} returned ${response.status}.`);
    }

    const json = (await response.json()) as unknown;
    const pageRecords = flattenMarkets(extractRecords(json));

    if (!pageRecords.length) {
      break;
    }

    collected.push(...pageRecords);

    if (pageRecords.length < pageSize) {
      break;
    }
  }

  return collected;
}

export class LiveMarketProvider implements MarketDataProvider {
  name = "LiveProvider";

  async getMarkets(): Promise<ProviderPayload> {
    const config = getAppConfig();
    const attempts = buildAttempts();
    const errors: string[] = [];

    for (const attempt of attempts) {
      try {
        const rawMarkets = await fetchAttempt(
          attempt,
          config.marketSyncPageSize,
          config.liveMarketApiKey,
        );
        const deduped = new Map<string, NormalizedMarket>();

        for (const market of rawMarkets.map(mapRawMarket).filter((item): item is NormalizedMarket => item !== null)) {
          const key = market.externalId || market.slug;
          const existing = deduped.get(key);

          if (!existing || market.volume24hCents > existing.volume24hCents) {
            deduped.set(key, market);
          }
        }

        const markets = [...deduped.values()]
          .filter((market) => market.status === "ACTIVE" || market.status === "RESOLVED")
          .sort((left, right) => right.volume24hCents - left.volume24hCents)
          .slice(0, 200)
          .map((market, index) => ({
            ...market,
            featured: index < 12 || market.featured,
          }));

        if (!markets.length) {
          throw new Error(`${attempt.label} returned zero parsable binary markets.`);
        }

        return {
          providerName: this.name,
          sourceMode: DataMode.LIVE,
          markets,
        };
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `${attempt.label} failed.`);
      }
    }

    throw new Error(errors.join(" "));
  }
}

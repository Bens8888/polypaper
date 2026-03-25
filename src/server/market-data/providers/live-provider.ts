import { DataMode } from "@prisma/client";

import { getAppConfig } from "@/lib/config";
import { clamp } from "@/lib/utils";
import type {
  MarketDataProvider,
  NormalizedMarket,
  ProviderPayload,
} from "@/server/market-data/types";

type RawMarket = Record<string, unknown>;

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

    try {
      const parsed = JSON.parse(trimmed);

      if (typeof parsed === "number" && Number.isFinite(parsed)) {
        return parsed;
      }
    } catch {
      // Ignore JSON parse errors and fall through to Number().
    }

    const result = Number(trimmed);
    return Number.isFinite(result) ? result : null;
  }

  return null;
}

function parseArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value.split(",").map((item) => item.trim());
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

function parseOutcomePrices(raw: RawMarket) {
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

  if (outcomes.length && outcomePrices.length) {
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

  const outcomeObjects = outcomes.filter(
    (item): item is RawMarket => typeof item === "object" && item !== null,
  );

  if (outcomeObjects.length) {
    const yesOutcome = outcomeObjects.find((item) =>
      asString(item.label ?? item.name ?? item.title).toUpperCase().includes("YES"),
    );
    const noOutcome = outcomeObjects.find((item) =>
      asString(item.label ?? item.name ?? item.title).toUpperCase().includes("NO"),
    );
    const yesPrice = toPriceCents(
      yesOutcome?.price ?? yesOutcome?.probability ?? yesOutcome?.lastPrice,
    );
    const noPrice = toPriceCents(noOutcome?.price ?? noOutcome?.probability ?? noOutcome?.lastPrice);

    if (yesPrice !== null) {
      return {
        yesPriceCents: yesPrice,
        noPriceCents: noPrice ?? 100 - yesPrice,
      };
    }
  }

  return null;
}

function parseStatus(raw: RawMarket) {
  const resolved = Boolean(raw.resolved ?? raw.isResolved);
  const closed = Boolean(raw.closed ?? raw.isClosed);

  if (resolved) {
    return "RESOLVED" as const;
  }

  if (closed) {
    return "CLOSED" as const;
  }

  return "ACTIVE" as const;
}

function parseResolvedOutcomeKey(raw: RawMarket) {
  const winner = asString(raw.resolution ?? raw.winner ?? raw.resolvedOutcome).toUpperCase();

  if (winner.includes("YES")) {
    return "YES" as const;
  }

  if (winner.includes("NO")) {
    return "NO" as const;
  }

  return null;
}

function mapRawMarket(raw: RawMarket): NormalizedMarket | null {
  const title = asString(raw.question ?? raw.title ?? raw.name);
  const slug = asString(raw.slug);
  const prices = parseOutcomePrices(raw);

  if (!title || !slug || !prices) {
    return null;
  }

  const endDateValue =
    asString(raw.endDate ?? raw.end_date_iso ?? raw.endTime ?? raw.end_time ?? raw.endsAt) ||
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const category = asString(raw.category ?? raw.categoryName ?? raw.topic) || "General";
  const tags = parseArray(raw.tags).map((item) => asString(item)).filter(Boolean);
  const volume24h =
    asNumber(raw.volume24hr ?? raw.volume24h ?? raw.volume24Hour ?? raw.volume) ?? 0;
  const liquidityScore =
    asNumber(raw.liquidityScore ?? raw.liquidity ?? raw.openInterest) ?? 50;

  return {
    externalId: asString(raw.id ?? raw.marketId) || slug,
    slug,
    title,
    description:
      asString(raw.description ?? raw.subtitle ?? raw.summary) ||
      "Imported from the configured live market data source.",
    category,
    tags,
    yesPriceCents: prices.yesPriceCents,
    noPriceCents: prices.noPriceCents,
    volume24hCents: Math.max(0, Math.round(volume24h * 100)),
    liquidityScore: clamp(Math.round(liquidityScore), 0, 100),
    featured: Boolean(raw.featured ?? raw.isFeatured),
    sourceUrl: asString(raw.url ?? raw.marketUrl ?? raw.sourceUrl) || null,
    imageUrl: asString(raw.image ?? raw.icon ?? raw.imageUrl) || null,
    endsAt: new Date(endDateValue),
    status: parseStatus(raw),
    resolvedOutcomeKey: parseResolvedOutcomeKey(raw),
    resolvedAt: raw.resolvedAt ? new Date(asString(raw.resolvedAt)) : null,
    sourceMode: DataMode.LIVE,
  };
}

export class LiveMarketProvider implements MarketDataProvider {
  name = "LiveProvider";

  async getMarkets(): Promise<ProviderPayload> {
    const config = getAppConfig();

    if (!config.liveMarketApiUrl) {
      throw new Error("LIVE_MARKET_API_URL is not configured.");
    }

    const url = new URL(config.liveMarketApiUrl);

    if (!url.searchParams.has("limit")) {
      url.searchParams.set("limit", String(config.marketSyncPageSize));
    }

    const response = await fetch(url, {
      headers: config.liveMarketApiKey
        ? {
            Authorization: `Bearer ${config.liveMarketApiKey}`,
            "X-API-Key": config.liveMarketApiKey,
          }
        : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Live provider returned ${response.status}.`);
    }

    const json = (await response.json()) as unknown;
    const rawMarkets = Array.isArray(json)
      ? json
      : Array.isArray((json as { markets?: unknown[] }).markets)
        ? (json as { markets: unknown[] }).markets
        : Array.isArray((json as { data?: unknown[] }).data)
          ? (json as { data: unknown[] }).data
          : [];

    const markets = rawMarkets
      .filter((item): item is RawMarket => typeof item === "object" && item !== null)
      .map(mapRawMarket)
      .filter((market): market is NormalizedMarket => market !== null);

    if (!markets.length) {
      throw new Error("Live provider returned zero parsable markets.");
    }

    return {
      providerName: this.name,
      sourceMode: DataMode.LIVE,
      markets,
    };
  }
}

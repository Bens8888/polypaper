import { OutcomeKey } from "@prisma/client";

import { getAppConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { sleep } from "@/lib/utils";
import { LiveMarketProvider } from "@/server/market-data/providers/live-provider";
import { MockMarketProvider } from "@/server/market-data/providers/mock-provider";
import type {
  ExistingMarketInput,
  NormalizedMarket,
  ProviderPayload,
} from "@/server/market-data/types";
import {
  refreshLeaderboardSnapshots,
  settleResolvedPositionsTx,
} from "@/server/services/portfolio";

let lastSyncSummary:
  | {
      completedAt: number;
      sourceMode: string;
      providerName: string;
      updatedMarkets: number;
      fallbackReason?: string;
    }
  | null = null;

let syncPromise: Promise<{
  completedAt: number;
  sourceMode: string;
  providerName: string;
  updatedMarkets: number;
  fallbackReason?: string;
}> | null = null;

async function getExistingMarkets(): Promise<ExistingMarketInput[]> {
  const markets = await prisma.market.findMany({
    include: {
      outcomes: true,
    },
  });

  return markets.map((market) => ({
    externalId: market.externalId,
    slug: market.slug,
    title: market.title,
    description: market.description,
    category: market.category,
    tags: market.tags,
    yesPriceCents: market.outcomes.find((outcome) => outcome.key === "YES")?.priceCents ?? 50,
    volume24hCents: market.volume24hCents,
    liquidityScore: market.liquidityScore,
    featured: market.featured,
    sourceUrl: market.sourceUrl,
    endsAt: market.endsAt,
    status: market.status,
    resolvedOutcomeKey:
      market.resolvedOutcomeId && market.outcomes.find((outcome) => outcome.id === market.resolvedOutcomeId)
        ? (market.outcomes.find((outcome) => outcome.id === market.resolvedOutcomeId)?.key as OutcomeKey)
        : null,
    resolvedAt: market.resolvedAt,
  }));
}

async function fetchWithRetries(task: () => Promise<ProviderPayload>) {
  let lastError: unknown;

  for (const attempt of [1, 2, 3]) {
    try {
      return await task();
    } catch (error) {
      lastError = error;

      if (attempt < 3) {
        await sleep(attempt * 350);
      }
    }
  }

  throw lastError;
}

async function loadProviderPayload(existingMarkets: ExistingMarketInput[]) {
  const config = getAppConfig();
  const liveProvider = new LiveMarketProvider();
  const mockProvider = new MockMarketProvider();

  if (config.marketProviderMode === "mock") {
    return mockProvider.getMarkets(existingMarkets);
  }

  if (config.marketProviderMode === "live") {
    try {
      return await fetchWithRetries(() => liveProvider.getMarkets());
    } catch (error) {
      return {
        ...(await mockProvider.getMarkets(existingMarkets)),
        fallbackReason:
          error instanceof Error ? error.message : "Live provider failed; using mock fallback.",
      };
    }
  }

  try {
    return await fetchWithRetries(() => liveProvider.getMarkets());
  } catch (error) {
    return {
      ...(await mockProvider.getMarkets(existingMarkets)),
      fallbackReason:
        error instanceof Error ? error.message : "Live provider failed; using mock fallback.",
    };
  }
}

async function upsertMarketPayload(markets: NormalizedMarket[]) {
  await prisma.$transaction(async (tx) => {
    for (const market of markets) {
      const existingMarket = await tx.market.findUnique({
        where: {
          slug: market.slug,
        },
        include: {
          outcomes: true,
        },
      });

      const marketRecord =
        existingMarket ??
        (await tx.market.create({
          data: {
            externalId: market.externalId,
            slug: market.slug,
            title: market.title,
            description: market.description,
            category: market.category,
            tags: market.tags,
            sourceMode: market.sourceMode,
            sourceUrl: market.sourceUrl,
            imageUrl: market.imageUrl,
            liquidityScore: market.liquidityScore,
            volume24hCents: market.volume24hCents,
            featured: market.featured,
            status: market.status,
            endsAt: market.endsAt,
            resolvedAt: market.resolvedAt,
            priceUpdatedAt: new Date(),
            lastSyncedAt: new Date(),
          },
        }));

      const yesExisting =
        existingMarket?.outcomes.find((outcome) => outcome.key === "YES") ??
        (await tx.outcome.create({
          data: {
            marketId: marketRecord.id,
            key: "YES",
            label: "Yes",
            priceCents: market.yesPriceCents,
            previousPriceCents: market.yesPriceCents,
            change24hBps: 0,
          },
        }));

      const noExisting =
        existingMarket?.outcomes.find((outcome) => outcome.key === "NO") ??
        (await tx.outcome.create({
          data: {
            marketId: marketRecord.id,
            key: "NO",
            label: "No",
            priceCents: market.noPriceCents,
            previousPriceCents: market.noPriceCents,
            change24hBps: 0,
          },
        }));

      await tx.outcome.update({
        where: { id: yesExisting.id },
        data: {
          previousPriceCents: yesExisting.priceCents,
          priceCents: market.yesPriceCents,
          change24hBps: (market.yesPriceCents - yesExisting.priceCents) * 100,
        },
      });

      await tx.outcome.update({
        where: { id: noExisting.id },
        data: {
          previousPriceCents: noExisting.priceCents,
          priceCents: market.noPriceCents,
          change24hBps: (market.noPriceCents - noExisting.priceCents) * 100,
        },
      });

      const resolvedOutcomeId =
        market.resolvedOutcomeKey === "YES"
          ? yesExisting.id
          : market.resolvedOutcomeKey === "NO"
            ? noExisting.id
            : null;

      await tx.market.update({
        where: { id: marketRecord.id },
        data: {
          externalId: market.externalId,
          title: market.title,
          description: market.description,
          category: market.category,
          tags: market.tags,
          sourceMode: market.sourceMode,
          sourceUrl: market.sourceUrl,
          imageUrl: market.imageUrl,
          liquidityScore: market.liquidityScore,
          volume24hCents: market.volume24hCents,
          featured: market.featured,
          status: market.status,
          endsAt: market.endsAt,
          resolvedOutcomeId,
          resolvedAt: market.resolvedAt,
          priceUpdatedAt: new Date(),
          lastSyncedAt: new Date(),
        },
      });

      await tx.pricePoint.create({
        data: {
          marketId: marketRecord.id,
          yesPriceCents: market.yesPriceCents,
          noPriceCents: market.noPriceCents,
          volume24hCents: market.volume24hCents,
        },
      });
    }

    await settleResolvedPositionsTx(tx);
  });
}

async function deactivateMissingLiveMarkets(markets: NormalizedMarket[]) {
  const liveKeys = new Set(
    markets.flatMap((market) => [market.slug, market.externalId].filter(Boolean) as string[]),
  );

  const existingLiveMarkets = await prisma.market.findMany({
    where: {
      OR: [{ sourceMode: "LIVE" }, { sourceMode: "FALLBACK" }, { sourceMode: "MOCK" }],
      status: {
        in: ["ACTIVE", "RESOLVED"],
      },
    },
    select: {
      id: true,
      slug: true,
      externalId: true,
    },
  });

  const staleIds = existingLiveMarkets
    .filter((market) => !liveKeys.has(market.slug) && !(market.externalId && liveKeys.has(market.externalId)))
    .map((market) => market.id);

  if (!staleIds.length) {
    return;
  }

  await prisma.market.updateMany({
    where: {
      id: {
        in: staleIds,
      },
    },
    data: {
      status: "PAUSED",
    },
  });
}

export async function syncMarketData(force = false) {
  const config = getAppConfig();
  const now = Date.now();

  if (!force && lastSyncSummary && now - lastSyncSummary.completedAt < config.marketSyncIntervalMs) {
    return lastSyncSummary;
  }

  if (!force && syncPromise) {
    return syncPromise;
  }

  const runner = (async () => {
    const existingMarkets = await getExistingMarkets();
    const payload = await loadProviderPayload(existingMarkets);
    await upsertMarketPayload(payload.markets);

    if (payload.sourceMode === "LIVE") {
      await deactivateMissingLiveMarkets(payload.markets);
    }

    await prisma.activityLog.create({
      data: {
        type: "MARKET_SYNC",
        title: `${payload.providerName} sync complete`,
        message: `Updated ${payload.markets.length} markets using ${payload.sourceMode.toLowerCase()} pricing.`,
        metadata: {
          providerName: payload.providerName,
          sourceMode: payload.sourceMode,
          fallbackReason: payload.fallbackReason,
        },
      },
    });

    await refreshLeaderboardSnapshots();

    lastSyncSummary = {
      completedAt: Date.now(),
      providerName: payload.providerName,
      sourceMode: payload.sourceMode,
      updatedMarkets: payload.markets.length,
      fallbackReason: payload.fallbackReason,
    };

    return lastSyncSummary;
  })();

  syncPromise = runner.finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

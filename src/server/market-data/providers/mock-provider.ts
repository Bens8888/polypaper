import { DataMode } from "@prisma/client";

import { buildSeedMarkets } from "@/lib/seed-markets";
import { clamp } from "@/lib/utils";
import type {
  ExistingMarketInput,
  MarketDataProvider,
  NormalizedMarket,
  ProviderPayload,
} from "@/server/market-data/types";

function hashString(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function deriveMockPrice(basePrice: number, slug: string, bucket: number) {
  const hash = hashString(`${slug}:${bucket}`);
  const delta = (hash % 9) - 4;
  return clamp(basePrice + delta, 3, 97);
}

export class MockMarketProvider implements MarketDataProvider {
  name = "MockProvider";

  async getMarkets(existingMarkets: ExistingMarketInput[] = []): Promise<ProviderPayload> {
    const now = new Date();
    const minuteBucket = Math.floor(now.getTime() / 60_000);
    const sourceMode = existingMarkets.length ? DataMode.FALLBACK : DataMode.MOCK;

    const baseMarkets =
      existingMarkets.length > 0
        ? existingMarkets
        : buildSeedMarkets(now).map((market) => ({
            externalId: market.externalId,
            slug: market.slug,
            title: market.title,
            description: market.description,
            category: market.category,
            tags: market.tags,
            yesPriceCents: market.yesPriceCents,
            volume24hCents: market.volume24hCents,
            liquidityScore: market.liquidityScore,
            featured: market.featured ?? false,
            sourceUrl: market.sourceUrl ?? null,
            endsAt: market.endsAt,
            status: market.status ?? "ACTIVE",
            resolvedOutcomeKey: market.resolvedOutcomeKey ?? null,
            resolvedAt: market.resolvedAt ?? null,
          }));

    const markets: NormalizedMarket[] = baseMarkets.map((market) => {
      if (market.status === "RESOLVED") {
        const yesPriceCents = market.resolvedOutcomeKey === "YES" ? 100 : 0;
        return {
          externalId: market.externalId,
          slug: market.slug,
          title: market.title,
          description: market.description,
          category: market.category,
          tags: market.tags,
          yesPriceCents,
          noPriceCents: 100 - yesPriceCents,
          volume24hCents: market.volume24hCents,
          liquidityScore: market.liquidityScore,
          featured: market.featured,
          sourceUrl: market.sourceUrl,
          endsAt: market.endsAt,
          status: "RESOLVED",
          resolvedOutcomeKey: market.resolvedOutcomeKey,
          resolvedAt: market.resolvedAt,
          sourceMode,
        };
      }

      const yesPriceCents = deriveMockPrice(market.yesPriceCents, market.slug, minuteBucket);
      const volumeDrift = hashString(`volume:${market.slug}:${minuteBucket}`) % 180_000;

      return {
        externalId: market.externalId,
        slug: market.slug,
        title: market.title,
        description: market.description,
        category: market.category,
        tags: market.tags,
        yesPriceCents,
        noPriceCents: 100 - yesPriceCents,
        volume24hCents: market.volume24hCents + volumeDrift,
        liquidityScore: clamp(
          market.liquidityScore + ((hashString(`liq:${market.slug}:${minuteBucket}`) % 7) - 3),
          20,
          99,
        ),
        featured: market.featured,
        sourceUrl: market.sourceUrl,
        endsAt: market.endsAt,
        status: market.endsAt > now ? "ACTIVE" : "CLOSED",
        resolvedOutcomeKey: market.resolvedOutcomeKey,
        resolvedAt: market.resolvedAt,
        sourceMode,
      };
    });

    return {
      providerName: this.name,
      sourceMode,
      markets,
    };
  }
}

import type { DataMode, MarketStatus, OutcomeKey } from "@prisma/client";

export type ExistingMarketInput = {
  externalId: string | null;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  yesPriceCents: number;
  volume24hCents: number;
  liquidityScore: number;
  featured: boolean;
  sourceUrl: string | null;
  endsAt: Date;
  status: MarketStatus;
  resolvedOutcomeKey?: OutcomeKey | null;
  resolvedAt?: Date | null;
};

export type NormalizedMarket = {
  externalId?: string | null;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  yesPriceCents: number;
  noPriceCents: number;
  volume24hCents: number;
  liquidityScore: number;
  featured: boolean;
  sourceUrl?: string | null;
  imageUrl?: string | null;
  endsAt: Date;
  status: MarketStatus;
  resolvedOutcomeKey?: OutcomeKey | null;
  resolvedAt?: Date | null;
  sourceMode: DataMode;
};

export type ProviderPayload = {
  providerName: string;
  sourceMode: DataMode;
  markets: NormalizedMarket[];
  fallbackReason?: string;
};

export interface MarketDataProvider {
  name: string;
  getMarkets(existingMarkets?: ExistingMarketInput[]): Promise<ProviderPayload>;
}

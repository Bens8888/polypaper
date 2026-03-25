import { addDays, addHours, addMonths, subDays } from "date-fns";

export type SeedMarketDefinition = {
  externalId: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  yesPriceCents: number;
  volume24hCents: number;
  liquidityScore: number;
  endsAt: Date;
  featured?: boolean;
  sourceUrl?: string;
  status?: "ACTIVE" | "RESOLVED" | "CLOSED" | "PAUSED";
  resolvedOutcomeKey?: "YES" | "NO";
  resolvedAt?: Date;
};

export function buildSeedMarkets(now = new Date()): SeedMarketDefinition[] {
  return [
    {
      externalId: "macro-fed-cut-jun-2026",
      slug: "fed-cut-by-june-2026",
      title: "Will the Fed cut rates by June 2026?",
      description:
        "A high-liquidity macro market tracking whether the Federal Reserve delivers at least one rate cut by the June 2026 meeting.",
      category: "Macro",
      tags: ["rates", "fed", "macro"],
      yesPriceCents: 62,
      volume24hCents: 4_580_000,
      liquidityScore: 87,
      endsAt: addMonths(now, 2),
      featured: true,
      sourceUrl: "https://www.federalreserve.gov/",
    },
    {
      externalId: "crypto-btc-120k-q2",
      slug: "bitcoin-above-120k-by-june-2026",
      title: "Will Bitcoin trade above $120k by June 30, 2026?",
      description:
        "A flagship crypto market following whether BTC touches six figures plus by the end of Q2 2026.",
      category: "Crypto",
      tags: ["crypto", "bitcoin", "macro"],
      yesPriceCents: 39,
      volume24hCents: 6_710_000,
      liquidityScore: 92,
      endsAt: addMonths(now, 3),
      featured: true,
      sourceUrl: "https://www.coinbase.com/price/bitcoin",
    },
    {
      externalId: "equities-nvda-160-june",
      slug: "nvidia-above-160-june-2026",
      title: "Will NVIDIA close above $160 on June 30, 2026?",
      description:
        "Equities traders use this market to express conviction on NVIDIA's mid-year close relative to the $160 threshold.",
      category: "Equities",
      tags: ["equities", "ai", "semis"],
      yesPriceCents: 54,
      volume24hCents: 3_920_000,
      liquidityScore: 79,
      endsAt: addMonths(now, 3),
      sourceUrl: "https://www.nasdaq.com/",
    },
    {
      externalId: "sports-lakers-playoffs-2026",
      slug: "lakers-make-playoffs-2026",
      title: "Will the Lakers make the 2026 playoffs?",
      description:
        "A sports market pricing postseason qualification for Los Angeles in the 2025-26 NBA season.",
      category: "Sports",
      tags: ["sports", "nba"],
      yesPriceCents: 58,
      volume24hCents: 1_980_000,
      liquidityScore: 74,
      endsAt: addMonths(now, 1),
      sourceUrl: "https://www.nba.com/",
    },
    {
      externalId: "ai-open-source-model-q3",
      slug: "open-source-frontier-model-before-september-2026",
      title: "Will an open-source frontier AI model launch before September 2026?",
      description:
        "This technology market tracks whether an open-source model is broadly regarded as frontier-tier before September 2026.",
      category: "AI",
      tags: ["ai", "open-source", "models"],
      yesPriceCents: 71,
      volume24hCents: 2_760_000,
      liquidityScore: 83,
      endsAt: addMonths(now, 5),
      featured: true,
      sourceUrl: "https://huggingface.co/",
    },
    {
      externalId: "politics-aus-rate-cut-july",
      slug: "australia-rate-cut-by-july-2026",
      title: "Will Australia cut rates by July 2026?",
      description:
        "A regional macro market following the Reserve Bank of Australia and the path of policy easing into mid-2026.",
      category: "Macro",
      tags: ["australia", "rates", "macro"],
      yesPriceCents: 47,
      volume24hCents: 1_430_000,
      liquidityScore: 68,
      endsAt: addMonths(now, 4),
      sourceUrl: "https://www.rba.gov.au/",
    },
    {
      externalId: "spacex-starship-orbit-july",
      slug: "starship-orbit-before-july-2026",
      title: "Will Starship reach orbit before July 2026?",
      description:
        "A science and aerospace market tracking whether SpaceX successfully reaches orbit with Starship before July 2026.",
      category: "Science",
      tags: ["space", "spacex", "launch"],
      yesPriceCents: 64,
      volume24hCents: 2_110_000,
      liquidityScore: 77,
      endsAt: addMonths(now, 4),
      sourceUrl: "https://www.spacex.com/launches/",
    },
    {
      externalId: "energy-brent-95-2026",
      slug: "brent-above-95-by-august-2026",
      title: "Will Brent crude trade above $95 by August 2026?",
      description:
        "A commodity market following whether Brent crude spikes above $95 before the end of August 2026.",
      category: "Commodities",
      tags: ["oil", "commodities", "energy"],
      yesPriceCents: 32,
      volume24hCents: 1_160_000,
      liquidityScore: 65,
      endsAt: addMonths(now, 5),
      sourceUrl: "https://www.cmegroup.com/",
    },
    {
      externalId: "culture-oscar-streaming-2027",
      slug: "streaming-film-wins-best-picture-2027",
      title: "Will a streaming film win Best Picture in 2027?",
      description:
        "Entertainment market focused on whether a streaming-first release takes Best Picture at the 2027 Oscars.",
      category: "Culture",
      tags: ["film", "oscars", "streaming"],
      yesPriceCents: 28,
      volume24hCents: 890_000,
      liquidityScore: 59,
      endsAt: addMonths(now, 10),
      sourceUrl: "https://www.oscars.org/",
    },
    {
      externalId: "markets-sp500-6200-q2",
      slug: "sp500-above-6200-end-of-q2-2026",
      title: "Will the S&P 500 finish Q2 2026 above 6200?",
      description:
        "A broad equity-index market on whether the S&P 500 ends Q2 2026 above the 6200 handle.",
      category: "Equities",
      tags: ["equities", "sp500", "index"],
      yesPriceCents: 51,
      volume24hCents: 3_090_000,
      liquidityScore: 84,
      endsAt: addMonths(now, 3),
      featured: true,
      sourceUrl: "https://www.spglobal.com/spdji/en/indices/equity/sp-500/",
    },
    {
      externalId: "sports-f1-verstappen-win",
      slug: "verstappen-wins-next-race",
      title: "Will Verstappen win the next Formula 1 race?",
      description:
        "A short-duration sports market that reprices aggressively heading into race weekend.",
      category: "Sports",
      tags: ["sports", "f1", "motorsport"],
      yesPriceCents: 44,
      volume24hCents: 1_070_000,
      liquidityScore: 72,
      endsAt: addDays(now, 6),
      sourceUrl: "https://www.formula1.com/",
    },
    {
      externalId: "resolved-paper-example",
      slug: "did-papermarket-beta-launch-in-march-2026",
      title: "Did PaperMarket beta launch in March 2026?",
      description:
        "A resolved reference market included to demonstrate settlement logic and closed-position accounting in a safe paper-only environment.",
      category: "Platform",
      tags: ["papermarket", "resolved"],
      yesPriceCents: 100,
      volume24hCents: 220_000,
      liquidityScore: 40,
      endsAt: subDays(now, 5),
      status: "RESOLVED",
      resolvedOutcomeKey: "YES",
      resolvedAt: addHours(subDays(now, 5), 8),
    },
  ];
}

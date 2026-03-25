import { getEnv } from "@/lib/env";

export function getAppConfig() {
  const env = getEnv();

  return {
    name: "PaperMarket",
    description:
      "A clean, premium paper-trading prediction market with simulated balances and live-style pricing.",
    appUrl: env.APP_URL ?? env.NEXTAUTH_URL,
    startingBalanceCents: env.STARTING_BALANCE_CENTS,
    tradeFeeBps: env.TRADE_FEE_BPS,
    tradeSlippageBps: env.TRADE_SLIPPAGE_BPS,
    marketSyncIntervalMs: env.MARKET_SYNC_INTERVAL_SECONDS * 1000,
    marketSyncPageSize: env.MARKET_SYNC_PAGE_SIZE,
    marketProviderMode: env.MARKET_DATA_PROVIDER,
    liveMarketApiUrl: env.LIVE_MARKET_API_URL || null,
    liveMarketApiKey: env.LIVE_MARKET_API_KEY || null,
    demoCredentials: {
      email: env.DEMO_EMAIL,
      password: env.DEMO_PASSWORD,
    },
  };
}

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://papermarket:papermarket@localhost:5432/papermarket?schema=public"),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(16).default("change-me-before-production"),
  APP_URL: z.string().url().optional(),
  MARKET_DATA_PROVIDER: z.enum(["auto", "live", "mock"]).default("auto"),
  LIVE_MARKET_API_URL: z.union([z.string().url(), z.literal("")]).optional(),
  LIVE_MARKET_API_KEY: z.string().optional(),
  STARTING_BALANCE_CENTS: z.coerce.number().int().positive().default(10_000),
  TRADE_FEE_BPS: z.coerce.number().int().min(0).max(500).default(100),
  TRADE_SLIPPAGE_BPS: z.coerce.number().int().min(0).max(1_000).default(50),
  MARKET_SYNC_INTERVAL_SECONDS: z.coerce.number().int().min(15).max(3_600).default(60),
  MARKET_SYNC_PAGE_SIZE: z.coerce.number().int().min(10).max(200).default(40),
  ADMIN_EMAIL: z.string().email().default("admin@papermarket.local"),
  ADMIN_PASSWORD: z.string().min(8).default("PaperMarketAdmin123!"),
  DEMO_EMAIL: z.string().email().default("demo@papermarket.local"),
  DEMO_PASSWORD: z.string().min(8).default("PaperMarket123!"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }

  return cachedEnv;
}

import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72),
});

export const registerSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  username: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores only."),
  displayName: z.string().trim().min(2).max(40).optional(),
  password: z.string().min(8).max(72),
});

export const tradeSchema = z.object({
  marketId: z.string().min(1),
  outcomeKey: z.enum(["YES", "NO"]),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["MARKET", "LIMIT"]).default("MARKET"),
  shares: z.coerce.number().int().positive().max(10_000),
  limitPriceCents: z.coerce.number().int().min(1).max(99).optional(),
});

export const commentSchema = z.object({
  marketId: z.string().min(1),
  body: z.string().trim().min(2).max(800),
});

export const watchlistSchema = z.object({
  marketId: z.string().min(1),
});

export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores only."),
  displayName: z.string().trim().min(2).max(40).optional(),
  avatarUrl: z.union([z.string().url(), z.literal("")]).optional(),
});

export const marketsQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  category: z.string().trim().max(40).optional(),
  sort: z.enum(["trending", "new", "ending", "movers"]).default("trending"),
  limit: z.coerce.number().int().min(1).max(24).default(12),
  offset: z.coerce.number().int().min(0).default(0),
});

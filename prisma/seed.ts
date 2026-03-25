import "dotenv/config";

import { getEnv } from "../src/lib/env";
import { prisma } from "../src/lib/prisma";
import { buildSeedMarkets } from "../src/lib/seed-markets";
import { refreshLeaderboardSnapshots } from "../src/server/services/portfolio";
import { createPaperUser } from "../src/server/services/user-service";

async function seedMarkets() {
  const markets = buildSeedMarkets(new Date());

  for (const market of markets) {
    const marketRecord = await prisma.market.upsert({
      where: {
        slug: market.slug,
      },
      update: {
        externalId: market.externalId,
        title: market.title,
        description: market.description,
        category: market.category,
        tags: market.tags,
        liquidityScore: market.liquidityScore,
        volume24hCents: market.volume24hCents,
        featured: market.featured ?? false,
        status: market.status ?? "ACTIVE",
        sourceMode: market.status === "RESOLVED" ? "MOCK" : "FALLBACK",
        sourceUrl: market.sourceUrl,
        endsAt: market.endsAt,
        resolvedAt: market.resolvedAt ?? null,
        priceUpdatedAt: new Date(),
        lastSyncedAt: new Date(),
      },
      create: {
        externalId: market.externalId,
        slug: market.slug,
        title: market.title,
        description: market.description,
        category: market.category,
        tags: market.tags,
        liquidityScore: market.liquidityScore,
        volume24hCents: market.volume24hCents,
        featured: market.featured ?? false,
        status: market.status ?? "ACTIVE",
        sourceMode: market.status === "RESOLVED" ? "MOCK" : "FALLBACK",
        sourceUrl: market.sourceUrl,
        endsAt: market.endsAt,
        resolvedAt: market.resolvedAt ?? null,
        priceUpdatedAt: new Date(),
        lastSyncedAt: new Date(),
      },
    });

    const yesPriceCents = market.status === "RESOLVED" && market.resolvedOutcomeKey === "NO"
      ? 0
      : market.yesPriceCents;
    const noPriceCents = 100 - yesPriceCents;

    const yesOutcome = await prisma.outcome.upsert({
      where: {
        marketId_key: {
          marketId: marketRecord.id,
          key: "YES",
        },
      },
      update: {
        label: "Yes",
        previousPriceCents: yesPriceCents,
        priceCents: yesPriceCents,
        change24hBps: 0,
      },
      create: {
        marketId: marketRecord.id,
        key: "YES",
        label: "Yes",
        previousPriceCents: yesPriceCents,
        priceCents: yesPriceCents,
        change24hBps: 0,
      },
    });

    const noOutcome = await prisma.outcome.upsert({
      where: {
        marketId_key: {
          marketId: marketRecord.id,
          key: "NO",
        },
      },
      update: {
        label: "No",
        previousPriceCents: noPriceCents,
        priceCents: noPriceCents,
        change24hBps: 0,
      },
      create: {
        marketId: marketRecord.id,
        key: "NO",
        label: "No",
        previousPriceCents: noPriceCents,
        priceCents: noPriceCents,
        change24hBps: 0,
      },
    });

    await prisma.market.update({
      where: {
        id: marketRecord.id,
      },
      data: {
        resolvedOutcomeId:
          market.resolvedOutcomeKey === "YES"
            ? yesOutcome.id
            : market.resolvedOutcomeKey === "NO"
              ? noOutcome.id
              : null,
      },
    });

    const pricePointCount = await prisma.pricePoint.count({
      where: {
        marketId: marketRecord.id,
      },
    });

    if (pricePointCount === 0) {
      await prisma.pricePoint.create({
        data: {
          marketId: marketRecord.id,
          yesPriceCents,
          noPriceCents,
          volume24hCents: market.volume24hCents,
        },
      });
    }
  }
}

async function seedUsers() {
  const env = getEnv();

  const existingAdmin = await prisma.user.findUnique({
    where: { email: env.ADMIN_EMAIL },
  });

  if (!existingAdmin) {
    await createPaperUser({
      email: env.ADMIN_EMAIL,
      username: "admin",
      displayName: "PaperMarket Admin",
      password: env.ADMIN_PASSWORD,
      role: "ADMIN",
    });
  }

  const existingDemo = await prisma.user.findUnique({
    where: { email: env.DEMO_EMAIL },
  });

  if (!existingDemo) {
    await createPaperUser({
      email: env.DEMO_EMAIL,
      username: "demo",
      displayName: "Demo Trader",
      password: env.DEMO_PASSWORD,
      role: "USER",
    });
  }
}

async function main() {
  await seedMarkets();
  await seedUsers();
  await refreshLeaderboardSnapshots();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

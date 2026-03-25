import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type DbClient = PrismaClient | Prisma.TransactionClient;

type PortfolioPositionRecord = Prisma.PositionGetPayload<{
  include: {
    market: true;
    outcome: true;
  };
}>;

type PortfolioAccountRecord = Prisma.AccountGetPayload<{
  include: {
    user: {
      include: {
        positions: {
          include: {
            market: true;
            outcome: true;
          };
        };
      };
    };
  };
}>;

export function getMarkedPriceCents(position: PortfolioPositionRecord) {
  if (position.market.status === "RESOLVED" && position.market.resolvedOutcomeId) {
    return position.outcomeId === position.market.resolvedOutcomeId ? 100 : 0;
  }

  return position.outcome.priceCents;
}

export function calculatePositionMetrics(position: PortfolioPositionRecord) {
  const currentPriceCents = getMarkedPriceCents(position);
  const marketValueCents = position.shares * currentPriceCents;
  const unrealizedPnlCents = marketValueCents - position.costBasisCents;

  return {
    id: position.id,
    marketId: position.marketId,
    marketSlug: position.market.slug,
    marketTitle: position.market.title,
    category: position.market.category,
    outcomeKey: position.outcome.key,
    shares: position.shares,
    avgEntryPriceCents: position.avgEntryPriceCents,
    currentPriceCents,
    marketValueCents,
    costBasisCents: position.costBasisCents,
    realizedPnlCents: position.realizedPnlCents,
    unrealizedPnlCents,
    totalPnlCents: position.realizedPnlCents + unrealizedPnlCents,
    status: position.market.status,
    endsAt: position.market.endsAt,
    closedAt: position.closedAt,
    updatedAt: position.updatedAt,
  };
}

export function buildPortfolioOverview(
  account: { cashBalanceCents: number; startingBalanceCents: number },
  positions: PortfolioPositionRecord[],
) {
  const positionMetrics = positions.map(calculatePositionMetrics);
  const positionsValueCents = positionMetrics.reduce(
    (total, position) => total + position.marketValueCents,
    0,
  );
  const realizedPnlCents = positionMetrics.reduce(
    (total, position) => total + position.realizedPnlCents,
    0,
  );
  const unrealizedPnlCents = positionMetrics.reduce(
    (total, position) => total + position.unrealizedPnlCents,
    0,
  );
  const equityCents = account.cashBalanceCents + positionsValueCents;
  const totalReturnBps = Math.round(
    ((equityCents - account.startingBalanceCents) / account.startingBalanceCents) * 10_000,
  );

  return {
    cashBalanceCents: account.cashBalanceCents,
    positionsValueCents,
    equityCents,
    realizedPnlCents,
    unrealizedPnlCents,
    totalReturnBps,
    openPositions: positionMetrics.filter((position) => position.shares > 0).length,
    closedPositions: positionMetrics.filter((position) => position.shares === 0).length,
  };
}

export async function getPortfolioSnapshot(userId: string) {
  const account = await prisma.account.findUnique({
    where: { userId },
    include: {
      user: {
        include: {
          positions: {
            include: {
              market: true,
              outcome: true,
            },
            orderBy: {
              updatedAt: "desc",
            },
          },
        },
      },
    },
  });

  if (!account) {
    throw new Error("Account not found.");
  }

  const overview = buildPortfolioOverview(account, account.user.positions);
  const positions = account.user.positions.map(calculatePositionMetrics);
  const performance = await prisma.leaderboardSnapshot.findMany({
    where: { userId },
    orderBy: {
      createdAt: "desc",
    },
    take: 24,
  });

  return {
    overview,
    positions,
    performance: performance.reverse(),
  };
}

export async function settleResolvedPositionsTx(client: DbClient) {
  const openResolvedPositions = await client.position.findMany({
    where: {
      shares: { gt: 0 },
      settledAt: null,
      market: {
        status: "RESOLVED",
        resolvedOutcomeId: { not: null },
      },
    },
    include: {
      market: true,
      outcome: true,
      user: true,
    },
  });

  for (const position of openResolvedPositions) {
    const isWinner = position.market.resolvedOutcomeId === position.outcomeId;
    const payoutCents = isWinner ? position.shares * 100 : 0;
    const realizedIncrement = payoutCents - position.costBasisCents;

    await client.account.update({
      where: { userId: position.userId },
      data: {
        cashBalanceCents: {
          increment: payoutCents,
        },
      },
    });

    await client.position.update({
      where: { id: position.id },
      data: {
        shares: 0,
        costBasisCents: 0,
        avgEntryPriceCents: 0,
        realizedPnlCents: {
          increment: realizedIncrement,
        },
        settledPayoutCents: {
          increment: payoutCents,
        },
        settledAt: new Date(),
        closedAt: new Date(),
      },
    });

    await client.activityLog.create({
      data: {
        userId: position.userId,
        marketId: position.marketId,
        type: "POSITION_SETTLED",
        title: `Settled ${position.market.title}`,
        message: `${position.outcome.key} position settled for ${
          payoutCents / 100
        } USD in simulated payout.`,
        metadata: {
          payoutCents,
          outcomeKey: position.outcome.key,
          shares: position.shares,
          realizedIncrement,
        },
      },
    });
  }
}

function buildSnapshotRows(accounts: PortfolioAccountRecord[]) {
  return accounts
    .map((account) => {
      const overview = buildPortfolioOverview(account, account.user.positions);

      return {
        userId: account.userId,
        equityCents: overview.equityCents,
        cashBalanceCents: overview.cashBalanceCents,
        realizedPnlCents: overview.realizedPnlCents,
        unrealizedPnlCents: overview.unrealizedPnlCents,
        returnBps: overview.totalReturnBps,
      };
    })
    .sort((left, right) => right.returnBps - left.returnBps || right.equityCents - left.equityCents)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}

export async function refreshLeaderboardSnapshots(client: DbClient = prisma) {
  const accounts = await client.account.findMany({
    include: {
      user: {
        include: {
          positions: {
            include: {
              market: true,
              outcome: true,
            },
          },
        },
      },
    },
  });

  const rows = buildSnapshotRows(accounts);

  if (!rows.length) {
    return [];
  }

  await client.leaderboardSnapshot.createMany({
    data: rows,
  });

  return rows;
}

export async function getLatestLeaderboard() {
  const snapshots = await prisma.leaderboardSnapshot.findMany({
    distinct: ["userId"],
    orderBy: [
      {
        userId: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
    include: {
      user: true,
    },
  });

  return snapshots.sort((left, right) => {
    return right.returnBps - left.returnBps || right.equityCents - left.equityCents;
  });
}

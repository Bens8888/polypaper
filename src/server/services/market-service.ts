import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { calculatePositionMetrics, getLatestLeaderboard, getPortfolioSnapshot } from "@/server/services/portfolio";
import { syncMarketData } from "@/server/market-data/sync-service";

type MarketCardRecord = Prisma.MarketGetPayload<{
  include: {
    outcomes: true;
    watchlistItems: true;
    _count: {
      select: {
        comments: true;
        watchlistItems: true;
      };
    };
  };
}>;

function getYesOutcomePrice(market: MarketCardRecord) {
  return market.outcomes.find((outcome) => outcome.key === "YES");
}

function getNoOutcomePrice(market: MarketCardRecord) {
  return market.outcomes.find((outcome) => outcome.key === "NO");
}

function mapMarketCard(market: MarketCardRecord) {
  const yesOutcome = getYesOutcomePrice(market);
  const noOutcome = getNoOutcomePrice(market);

  return {
    id: market.id,
    slug: market.slug,
    title: market.title,
    description: market.description,
    category: market.category,
    tags: market.tags,
    featured: market.featured,
    status: market.status,
    endsAt: market.endsAt,
    sourceMode: market.sourceMode,
    yesPriceCents: yesOutcome?.priceCents ?? 50,
    noPriceCents: noOutcome?.priceCents ?? 50,
    yesChangeBps: yesOutcome?.change24hBps ?? 0,
    volume24hCents: market.volume24hCents,
    liquidityScore: market.liquidityScore,
    commentsCount: market._count.comments,
    watchlistCount: market._count.watchlistItems,
    watchlisted: market.watchlistItems.length > 0,
  };
}

function sortMarketCards(
  items: ReturnType<typeof mapMarketCard>[],
  sort: "trending" | "new" | "ending" | "movers",
) {
  return [...items].sort((left, right) => {
    if (sort === "new") {
      return right.endsAt.getTime() - left.endsAt.getTime();
    }

    if (sort === "ending") {
      return left.endsAt.getTime() - right.endsAt.getTime();
    }

    if (sort === "movers") {
      return Math.abs(right.yesChangeBps) - Math.abs(left.yesChangeBps);
    }

    return (
      right.volume24hCents - left.volume24hCents || right.liquidityScore - left.liquidityScore
    );
  });
}

function createMarketWhere(search?: string, category?: string): Prisma.MarketWhereInput {
  return {
    status: {
      in: ["ACTIVE", "RESOLVED"],
    },
    ...(category && category !== "All" ? { category } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export async function getLandingData() {
  await syncMarketData();

  const [markets, userCount] = await Promise.all([
    prisma.market.findMany({
      where: {
        featured: true,
        status: "ACTIVE",
      },
      include: {
        outcomes: true,
        watchlistItems: {
          take: 0,
        },
        _count: {
          select: {
            comments: true,
            watchlistItems: true,
          },
        },
      },
      take: 4,
      orderBy: {
        volume24hCents: "desc",
      },
    }),
    prisma.user.count(),
  ]);

  const totalVolume = await prisma.market.aggregate({
    _sum: {
      volume24hCents: true,
    },
  });

  return {
    featuredMarkets: markets.map(mapMarketCard),
    stats: {
      users: userCount,
      markets: await prisma.market.count(),
      volume24hCents: totalVolume._sum.volume24hCents ?? 0,
    },
  };
}

export async function getMarketsFeed(options: {
  userId: string;
  search?: string;
  category?: string;
  sort: "trending" | "new" | "ending" | "movers";
  limit: number;
  offset: number;
}) {
  await syncMarketData();

  const where = createMarketWhere(options.search, options.category);
  const markets = await prisma.market.findMany({
    where,
    include: {
      outcomes: true,
      watchlistItems: {
        where: {
          userId: options.userId,
        },
        take: 1,
      },
      _count: {
        select: {
          comments: true,
          watchlistItems: true,
        },
      },
    },
  });

  const mapped = sortMarketCards(markets.map(mapMarketCard), options.sort);
  const items = mapped.slice(options.offset, options.offset + options.limit);
  const nextOffset =
    options.offset + options.limit < mapped.length ? options.offset + options.limit : null;
  const categories = [...new Set(markets.map((market) => market.category))].sort();

  return {
    items,
    categories,
    nextOffset,
    total: mapped.length,
  };
}

export async function getMarketDetail(userId: string, slug: string) {
  await syncMarketData();

  const market = await prisma.market.findUnique({
    where: { slug },
    include: {
      outcomes: true,
      pricePoints: {
        orderBy: {
          createdAt: "desc",
        },
        take: 64,
      },
      comments: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: true,
        },
        take: 24,
      },
      fills: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: true,
          outcome: true,
        },
        take: 16,
      },
      watchlistItems: {
        where: {
          userId,
        },
        take: 1,
      },
      _count: {
        select: {
          comments: true,
          watchlistItems: true,
        },
      },
    },
  });

  if (!market) {
    throw new Error("Market not found.");
  }

  const account = await prisma.account.findUnique({
    where: { userId },
  });

  const positions = await prisma.position.findMany({
    where: {
      userId,
      marketId: market.id,
    },
    include: {
      market: true,
      outcome: true,
    },
  });

  const mappedPositions = positions.map(calculatePositionMetrics);
  const yesOutcome = market.outcomes.find((outcome) => outcome.key === "YES");
  const noOutcome = market.outcomes.find((outcome) => outcome.key === "NO");

  return {
    id: market.id,
    slug: market.slug,
    title: market.title,
    description: market.description,
    category: market.category,
    tags: market.tags,
    status: market.status,
    sourceMode: market.sourceMode,
    endsAt: market.endsAt,
    featured: market.featured,
    volume24hCents: market.volume24hCents,
    liquidityScore: market.liquidityScore,
    watchlisted: market.watchlistItems.length > 0,
    commentsCount: market._count.comments,
    watchlistCount: market._count.watchlistItems,
    outcomes: [
      {
        key: "YES",
        label: "Yes",
        priceCents: yesOutcome?.priceCents ?? 50,
        changeBps: yesOutcome?.change24hBps ?? 0,
      },
      {
        key: "NO",
        label: "No",
        priceCents: noOutcome?.priceCents ?? 50,
        changeBps: noOutcome?.change24hBps ?? 0,
      },
    ],
    cashBalanceCents: account?.cashBalanceCents ?? 0,
    positions: mappedPositions,
    chart: [...market.pricePoints]
      .reverse()
      .map((point) => ({
        time: point.createdAt,
        yesPriceCents: point.yesPriceCents,
        noPriceCents: point.noPriceCents,
        volume24hCents: point.volume24hCents,
      })),
    comments: market.comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      username: comment.user.username,
      displayName: comment.user.displayName ?? comment.user.username,
      avatarUrl: comment.user.avatarUrl,
    })),
    tradeFeed: market.fills.map((fill) => ({
      id: fill.id,
      createdAt: fill.createdAt,
      username: fill.user.username,
      outcomeKey: fill.outcome.key,
      shares: fill.shares,
      priceCents: fill.priceCents,
    })),
  };
}

export async function getDashboardData(userId: string) {
  await syncMarketData();

  const [marketRows, watchlistRows, activityRows, portfolio] = await Promise.all([
    prisma.market.findMany({
      where: {
        status: "ACTIVE",
      },
      include: {
        outcomes: true,
        watchlistItems: {
          where: {
            userId,
          },
          take: 1,
        },
        _count: {
          select: {
            comments: true,
            watchlistItems: true,
          },
        },
      },
    }),
    prisma.watchlistItem.findMany({
      where: {
        userId,
      },
      include: {
        market: {
          include: {
            outcomes: true,
            watchlistItems: {
              where: {
                userId,
              },
              take: 1,
            },
            _count: {
              select: {
                comments: true,
                watchlistItems: true,
              },
            },
          },
        },
      },
      take: 6,
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.activityLog.findMany({
      where: {
        OR: [{ userId }, { userId: null, type: "MARKET_SYNC" }],
      },
      include: {
        market: true,
      },
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
    }),
    getPortfolioSnapshot(userId),
  ]);

  const mappedMarketRows = marketRows.map(mapMarketCard);

  return {
    portfolio: portfolio.overview,
    performance: portfolio.performance,
    trendingMarkets: sortMarketCards(mappedMarketRows, "trending").slice(0, 6),
    newMarkets: sortMarketCards(mappedMarketRows, "new").slice(0, 6),
    endingSoon: sortMarketCards(mappedMarketRows, "ending").slice(0, 6),
    watchlist: watchlistRows.map((item) => mapMarketCard(item.market)),
    activity: activityRows.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      message: item.message,
      createdAt: item.createdAt,
      marketSlug: item.market?.slug ?? null,
      marketTitle: item.market?.title ?? null,
    })),
  };
}

export async function getActivityFeed(userId: string) {
  const [logs, orders] = await Promise.all([
    prisma.activityLog.findMany({
      where: {
        userId,
      },
      include: {
        market: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    }),
    prisma.order.findMany({
      where: {
        userId,
      },
      include: {
        market: true,
        outcome: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      type: log.type,
      title: log.title,
      message: log.message,
      createdAt: log.createdAt,
      marketSlug: log.market?.slug ?? null,
    })),
    orders: orders.map((order) => ({
      id: order.id,
      marketTitle: order.market.title,
      marketSlug: order.market.slug,
      outcomeKey: order.outcome.key,
      side: order.side,
      shares: order.shares,
      executionPriceCents: order.executionPriceCents,
      feeCents: order.feeCents,
      createdAt: order.createdAt,
      status: order.status,
    })),
  };
}

export async function getNotifications(userId: string) {
  const notifications = await prisma.activityLog.findMany({
    where: {
      OR: [{ userId }, { userId: null, type: "MARKET_SYNC" }],
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
  });

  return notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    createdAt: notification.createdAt,
  }));
}

export async function getLeaderboardData() {
  const snapshots = await getLatestLeaderboard();

  return {
    entries: snapshots.map((snapshot, index) => ({
      rank: index + 1,
      username: snapshot.user.username,
      displayName: snapshot.user.displayName ?? snapshot.user.username,
      avatarUrl: snapshot.user.avatarUrl,
      returnBps: snapshot.returnBps,
      equityCents: snapshot.equityCents,
      cashBalanceCents: snapshot.cashBalanceCents,
      realizedPnlCents: snapshot.realizedPnlCents,
      unrealizedPnlCents: snapshot.unrealizedPnlCents,
      createdAt: snapshot.createdAt,
    })),
  };
}

export async function getAdminOverview() {
  const [users, syncLog] = await Promise.all([
    prisma.user.findMany({
      include: {
        account: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    prisma.activityLog.findFirst({
      where: {
        type: "MARKET_SYNC",
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const latestLeaderboard = await getLatestLeaderboard();
  const snapshotByUserId = new Map(latestLeaderboard.map((item) => [item.userId, item]));

  return {
    users: users.map((user) => {
      const snapshot = snapshotByUserId.get(user.id);

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        cashBalanceCents: user.account?.cashBalanceCents ?? 0,
        equityCents: snapshot?.equityCents ?? user.account?.cashBalanceCents ?? 0,
        returnBps: snapshot?.returnBps ?? 0,
      };
    }),
    lastSync: syncLog?.createdAt ?? null,
  };
}

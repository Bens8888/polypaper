import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { AppError, jsonError, parseJsonBody } from "@/lib/http";
import { watchlistSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new AppError("Unauthorized", 401);
    }

    const payload = await parseJsonBody(request, watchlistSchema);
    const existing = await prisma.watchlistItem.findUnique({
      where: {
        userId_marketId: {
          userId: session.user.id,
          marketId: payload.marketId,
        },
      },
    });

    if (existing) {
      await prisma.watchlistItem.delete({
        where: {
          id: existing.id,
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          marketId: payload.marketId,
          type: "WATCHLIST_REMOVED",
          title: "Removed from watchlist",
          message: "Removed a market from the watchlist.",
        },
      });

      return NextResponse.json({ watchlisted: false });
    }

    await prisma.watchlistItem.create({
      data: {
        userId: session.user.id,
        marketId: payload.marketId,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        marketId: payload.marketId,
        type: "WATCHLIST_ADDED",
        title: "Added to watchlist",
        message: "Added a market to the watchlist.",
      },
    });

    return NextResponse.json({ watchlisted: true });
  } catch (error) {
    return jsonError(error, "Unable to update watchlist.");
  }
}

import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { AppError, getRequestIp, jsonError } from "@/lib/http";
import { assertRateLimit } from "@/server/security/rate-limit";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

const bodySchema = z.object({
  body: z.string().trim().min(2).max(800),
});

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new AppError("Unauthorized", 401);
    }

    assertRateLimit(`comment:${session.user.id}:${getRequestIp(request)}`, 20, 60_000);

    const data = bodySchema.parse(await request.json());
    const { slug } = await context.params;
    const market = await prisma.market.findUnique({
      where: { slug },
    });

    if (!market) {
      throw new AppError("Market not found.", 404);
    }

    const comment = await prisma.comment.create({
      data: {
        userId: session.user.id,
        marketId: market.id,
        body: data.body,
      },
      include: {
        user: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        marketId: market.id,
        type: "COMMENT_CREATED",
        title: "Comment posted",
        message: `Added a market comment on ${market.title}.`,
      },
    });

    return NextResponse.json({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      username: comment.user.username,
      displayName: comment.user.displayName ?? comment.user.username,
      avatarUrl: comment.user.avatarUrl,
    });
  } catch (error) {
    return jsonError(error, "Unable to add comment.");
  }
}

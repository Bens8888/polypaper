import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { AppError, getRequestIp, jsonError, parseJsonBody } from "@/lib/http";
import { tradeSchema } from "@/lib/validations";
import { assertRateLimit } from "@/server/security/rate-limit";
import { executeTrade } from "@/server/services/trading";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new AppError("Unauthorized", 401);
    }

    assertRateLimit(`trade:${session.user.id}:${getRequestIp(request)}`, 40, 60_000);
    const payload = await parseJsonBody(request, tradeSchema);
    const result = await executeTrade({
      userId: session.user.id,
      marketId: payload.marketId,
      outcomeKey: payload.outcomeKey,
      side: payload.side,
      type: payload.type,
      shares: payload.shares,
      limitPriceCents: payload.limitPriceCents,
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error, "Unable to execute paper trade.");
  }
}

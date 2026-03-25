import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { AppError, getRequestIp, jsonError } from "@/lib/http";
import { assertRateLimit } from "@/server/security/rate-limit";
import { syncMarketData } from "@/server/market-data/sync-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      throw new AppError("Forbidden", 403);
    }

    assertRateLimit(`admin-sync:${session.user.id}:${getRequestIp(request)}`, 10, 60_000);
    const result = await syncMarketData(true);

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error, "Unable to trigger sync.");
  }
}

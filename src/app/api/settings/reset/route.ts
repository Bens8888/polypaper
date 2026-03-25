import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { AppError, getRequestIp, jsonError } from "@/lib/http";
import { assertRateLimit } from "@/server/security/rate-limit";
import { resetPaperAccount } from "@/server/services/user-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new AppError("Unauthorized", 401);
    }

    assertRateLimit(`reset:${session.user.id}:${getRequestIp(request)}`, 3, 60_000);
    await resetPaperAccount(session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error, "Unable to reset account.");
  }
}

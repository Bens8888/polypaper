import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { AppError, jsonError } from "@/lib/http";
import { getMarketDetail } from "@/server/services/market-service";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new AppError("Unauthorized", 401);
    }

    const { slug } = await context.params;
    const data = await getMarketDetail(session.user.id, slug);
    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error, "Unable to load market details.");
  }
}

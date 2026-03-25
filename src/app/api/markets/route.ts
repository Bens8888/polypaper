import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { AppError, jsonError } from "@/lib/http";
import { marketsQuerySchema } from "@/lib/validations";
import { getMarketsFeed } from "@/server/services/market-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new AppError("Unauthorized", 401);
    }

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = marketsQuerySchema.parse(params);
    const data = await getMarketsFeed({
      userId: session.user.id,
      search: query.search,
      category: query.category,
      sort: query.sort,
      limit: query.limit,
      offset: query.offset,
    });

    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error, "Unable to load markets.");
  }
}

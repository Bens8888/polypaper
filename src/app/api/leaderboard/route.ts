import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getLeaderboardData } from "@/server/services/market-service";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getLeaderboardData();
  return NextResponse.json(data);
}

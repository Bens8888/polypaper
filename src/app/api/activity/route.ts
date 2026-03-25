import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getActivityFeed } from "@/server/services/market-service";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getActivityFeed(session.user.id);
  return NextResponse.json(data);
}

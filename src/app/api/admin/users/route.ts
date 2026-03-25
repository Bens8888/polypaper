import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getAdminOverview } from "@/server/services/market-service";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await getAdminOverview();
  return NextResponse.json(data);
}

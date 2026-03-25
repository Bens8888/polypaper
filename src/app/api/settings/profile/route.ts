import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { AppError, jsonError, parseJsonBody } from "@/lib/http";
import { profileSchema } from "@/lib/validations";
import { updatePaperUserProfile } from "@/server/services/user-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new AppError("Unauthorized", 401);
    }

    const payload = await parseJsonBody(request, profileSchema);
    const user = await updatePaperUserProfile(session.user.id, {
      username: payload.username,
      displayName: payload.displayName,
      avatarUrl: payload.avatarUrl || null,
    });

    return NextResponse.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(new AppError("Username is already taken.", 409));
    }

    return jsonError(error, "Unable to update profile.");
  }
}

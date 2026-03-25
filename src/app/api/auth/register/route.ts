import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";

import { AppError, jsonError, jsonSuccess, parseJsonBody, getRequestIp } from "@/lib/http";
import { registerSchema } from "@/lib/validations";
import { assertRateLimit } from "@/server/security/rate-limit";
import { createPaperUser } from "@/server/services/user-service";

export async function POST(request: NextRequest) {
  try {
    assertRateLimit(`register:${getRequestIp(request)}`, 5, 60_000);

    const data = await parseJsonBody(request, registerSchema);
    const user = await createPaperUser(data);

    return jsonSuccess({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(new AppError("Email or username already exists.", 409));
    }

    return jsonError(error, "Unable to create account.");
  }
}

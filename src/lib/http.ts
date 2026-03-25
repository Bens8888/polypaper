import { ZodError, type ZodSchema } from "zod";

import { NextRequest, NextResponse } from "next/server";

export class AppError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function jsonSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(error: unknown, fallbackMessage = "Something went wrong.") {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: error.issues[0]?.message ?? fallbackMessage,
      },
      { status: 422 },
    );
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function parseJsonBody<T>(request: NextRequest, schema: ZodSchema<T>) {
  const body = await request.json().catch(() => {
    throw new AppError("Invalid JSON body.", 400);
  });

  return schema.parse(body);
}

export function getRequestIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

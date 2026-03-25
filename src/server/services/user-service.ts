import { hash } from "bcryptjs";
import type { UserRole } from "@prisma/client";

import { getAppConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { refreshLeaderboardSnapshots } from "@/server/services/portfolio";

type CreatePaperUserInput = {
  email: string;
  username: string;
  password: string;
  displayName?: string;
  avatarUrl?: string;
  role?: UserRole;
};

export async function createPaperUser(input: CreatePaperUserInput) {
  const config = getAppConfig();
  const passwordHash = await hash(input.password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: input.email,
        username: input.username,
        displayName: input.displayName ?? input.username,
        avatarUrl: input.avatarUrl,
        passwordHash,
        role: input.role ?? "USER",
      },
    });

    await tx.account.create({
      data: {
        userId: createdUser.id,
        cashBalanceCents: config.startingBalanceCents,
        startingBalanceCents: config.startingBalanceCents,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: createdUser.id,
        type: "ACCOUNT_CREATED",
        title: "Paper account created",
        message: `Started with ${config.startingBalanceCents / 100} USD in simulated cash.`,
      },
    });

    return createdUser;
  });

  await refreshLeaderboardSnapshots();

  return user;
}

export async function updatePaperUserProfile(
  userId: string,
  input: { username: string; displayName?: string; avatarUrl?: string | null },
) {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      username: input.username,
      displayName: input.displayName ?? input.username,
      avatarUrl: input.avatarUrl || null,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId,
      type: "PROFILE_UPDATED",
      title: "Profile updated",
      message: "Updated profile settings for the paper trading account.",
    },
  });

  return updatedUser;
}

export async function resetPaperAccount(userId: string) {
  const config = getAppConfig();

  await prisma.$transaction(async (tx) => {
    await tx.fill.deleteMany({
      where: {
        userId,
      },
    });

    await tx.order.deleteMany({
      where: {
        userId,
      },
    });

    await tx.position.deleteMany({
      where: {
        userId,
      },
    });

    await tx.watchlistItem.deleteMany({
      where: {
        userId,
      },
    });

    await tx.account.update({
      where: {
        userId,
      },
      data: {
        cashBalanceCents: config.startingBalanceCents,
        startingBalanceCents: config.startingBalanceCents,
        resetCount: {
          increment: 1,
        },
        lastResetAt: new Date(),
      },
    });

    await tx.activityLog.create({
      data: {
        userId,
        type: "ACCOUNT_RESET",
        title: "Paper account reset",
        message: "Reset account balances and cleared all open paper positions.",
      },
    });
  });

  await refreshLeaderboardSnapshots();
}

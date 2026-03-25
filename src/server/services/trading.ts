import { prisma } from "@/lib/prisma";
import { clamp } from "@/lib/utils";
import { getAppConfig } from "@/lib/config";
import { refreshLeaderboardSnapshots } from "@/server/services/portfolio";

type ExecuteTradeInput = {
  userId: string;
  marketId: string;
  outcomeKey: "YES" | "NO";
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  shares: number;
  limitPriceCents?: number;
};

function computeExecutionPriceCents(sourcePriceCents: number, side: "BUY" | "SELL") {
  const config = getAppConfig();
  const slippage = Math.round((sourcePriceCents * config.tradeSlippageBps) / 10_000);
  return clamp(sourcePriceCents + (side === "BUY" ? slippage : -slippage), 1, 99);
}

function computeFeeCents(notionalCents: number) {
  const config = getAppConfig();
  return Math.round((notionalCents * config.tradeFeeBps) / 10_000);
}

export async function executeTrade(input: ExecuteTradeInput) {
  const result = await prisma.$transaction(async (tx) => {
    const account = await tx.account.findUnique({
      where: { userId: input.userId },
    });

    const market = await tx.market.findUnique({
      where: { id: input.marketId },
      include: {
        outcomes: true,
      },
    });

    if (!account || !market) {
      throw new Error("Account or market not found.");
    }

    if (market.status !== "ACTIVE") {
      throw new Error("Trading is unavailable for this market right now.");
    }

    const outcome = market.outcomes.find((item) => item.key === input.outcomeKey);

    if (!outcome) {
      throw new Error("Market outcome not found.");
    }

    const sourcePriceCents = outcome.priceCents;
    const executionPriceCents = computeExecutionPriceCents(sourcePriceCents, input.side);

    if (input.type === "LIMIT" && input.limitPriceCents) {
      const wouldExecute =
        input.side === "BUY"
          ? executionPriceCents <= input.limitPriceCents
          : executionPriceCents >= input.limitPriceCents;

      if (!wouldExecute) {
        throw new Error("Limit price was not satisfied by the simulated execution.");
      }
    }

    const notionalCents = executionPriceCents * input.shares;
    const feeCents = computeFeeCents(notionalCents);
    const position = await tx.position.findUnique({
      where: {
        userId_outcomeId: {
          userId: input.userId,
          outcomeId: outcome.id,
        },
      },
    });

    if (input.side === "BUY") {
      const totalDebitCents = notionalCents + feeCents;

      if (account.cashBalanceCents < totalDebitCents) {
        throw new Error("Insufficient paper cash for this order.");
      }

      const order = await tx.order.create({
        data: {
          userId: input.userId,
          marketId: market.id,
          outcomeId: outcome.id,
          side: input.side,
          type: input.type,
          status: "FILLED",
          shares: input.shares,
          limitPriceCents: input.limitPriceCents,
          sourcePriceCents,
          executionPriceCents,
          feeCents,
          slippageBps: getAppConfig().tradeSlippageBps,
          notionalCents,
        },
      });

      await tx.fill.create({
        data: {
          orderId: order.id,
          userId: input.userId,
          marketId: market.id,
          outcomeId: outcome.id,
          shares: input.shares,
          priceCents: executionPriceCents,
          feeCents,
        },
      });

      if (position) {
        const updatedCostBasis = position.costBasisCents + totalDebitCents;
        const updatedShares = position.shares + input.shares;

        await tx.position.update({
          where: { id: position.id },
          data: {
            shares: updatedShares,
            costBasisCents: updatedCostBasis,
            avgEntryPriceCents: Math.round(updatedCostBasis / updatedShares),
            closedAt: null,
          },
        });
      } else {
        await tx.position.create({
          data: {
            userId: input.userId,
            marketId: market.id,
            outcomeId: outcome.id,
            shares: input.shares,
            costBasisCents: totalDebitCents,
            avgEntryPriceCents: Math.round(totalDebitCents / input.shares),
          },
        });
      }

      await tx.account.update({
        where: { id: account.id },
        data: {
          cashBalanceCents: {
            decrement: totalDebitCents,
          },
        },
      });
    } else {
      if (!position || position.shares < input.shares) {
        throw new Error("Not enough shares to sell this position.");
      }

      const netCreditCents = notionalCents - feeCents;
      const allocatedCostBasis = Math.round(
        (position.costBasisCents / position.shares) * input.shares,
      );
      const realizedIncrement = netCreditCents - allocatedCostBasis;
      const remainingShares = position.shares - input.shares;
      const remainingCostBasis = Math.max(position.costBasisCents - allocatedCostBasis, 0);

      const order = await tx.order.create({
        data: {
          userId: input.userId,
          marketId: market.id,
          outcomeId: outcome.id,
          side: input.side,
          type: input.type,
          status: "FILLED",
          shares: input.shares,
          limitPriceCents: input.limitPriceCents,
          sourcePriceCents,
          executionPriceCents,
          feeCents,
          slippageBps: getAppConfig().tradeSlippageBps,
          notionalCents,
        },
      });

      await tx.fill.create({
        data: {
          orderId: order.id,
          userId: input.userId,
          marketId: market.id,
          outcomeId: outcome.id,
          shares: input.shares,
          priceCents: executionPriceCents,
          feeCents,
        },
      });

      await tx.position.update({
        where: { id: position.id },
        data: {
          shares: remainingShares,
          costBasisCents: remainingCostBasis,
          avgEntryPriceCents: remainingShares ? Math.round(remainingCostBasis / remainingShares) : 0,
          realizedPnlCents: {
            increment: realizedIncrement,
          },
          closedAt: remainingShares === 0 ? new Date() : null,
        },
      });

      await tx.account.update({
        where: { id: account.id },
        data: {
          cashBalanceCents: {
            increment: netCreditCents,
          },
        },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: input.userId,
        marketId: market.id,
        type: "TRADE_EXECUTED",
        title: `${input.side} ${input.outcomeKey}`,
        message: `${input.side} ${input.shares} ${input.outcomeKey} shares in ${market.title}.`,
        metadata: {
          executionPriceCents,
          feeCents,
          shares: input.shares,
          side: input.side,
          outcomeKey: input.outcomeKey,
        },
      },
    });

    return {
      executionPriceCents,
      feeCents,
      notionalCents,
      marketTitle: market.title,
      outcomeKey: input.outcomeKey,
      side: input.side,
      shares: input.shares,
    };
  });

  await refreshLeaderboardSnapshots();

  return result;
}

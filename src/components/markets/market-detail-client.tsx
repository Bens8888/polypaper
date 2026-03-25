"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareMore } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { apiGet, apiPost } from "@/lib/client-api";
import { formatCurrency, formatPercentFromBps, formatPercentFromProbability, formatRelative } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { PriceHistoryChart } from "@/components/charts/price-history-chart";
import { WatchlistButton } from "@/components/markets/watchlist-button";

type MarketDetailData = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  status: string;
  sourceMode: string;
  endsAt: string | Date;
  featured: boolean;
  volume24hCents: number;
  liquidityScore: number;
  watchlisted: boolean;
  commentsCount: number;
  watchlistCount: number;
  cashBalanceCents: number;
  outcomes: {
    key: string;
    label: string;
    priceCents: number;
    changeBps: number;
  }[];
  positions: {
    id: string;
    outcomeKey: string;
    shares: number;
    avgEntryPriceCents: number;
    currentPriceCents: number;
    marketValueCents: number;
    costBasisCents: number;
    realizedPnlCents: number;
    unrealizedPnlCents: number;
    totalPnlCents: number;
  }[];
  chart: {
    time: string | Date;
    yesPriceCents: number;
    noPriceCents: number;
    volume24hCents?: number;
  }[];
  comments: {
    id: string;
    body: string;
    createdAt: string | Date;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  }[];
  tradeFeed: {
    id: string;
    createdAt: string | Date;
    username: string;
    outcomeKey: string;
    shares: number;
    priceCents: number;
  }[];
};

type MarketDetailClientProps = {
  slug: string;
  initialData: MarketDetailData;
};

export function MarketDetailClient({ slug, initialData }: MarketDetailClientProps) {
  const queryClient = useQueryClient();
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [outcomeKey, setOutcomeKey] = useState<"YES" | "NO">("YES");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [shares, setShares] = useState(10);
  const [limitPrice, setLimitPrice] = useState<number | undefined>();
  const [comment, setComment] = useState("");

  const query = useQuery({
    queryKey: ["market", slug],
    queryFn: () => apiGet<MarketDetailData>(`/api/markets/${slug}`),
    initialData,
    refetchInterval: 30_000,
  });

  const market = query.data;
  const selectedOutcome = market.outcomes.find((outcome) => outcome.key === outcomeKey) ?? market.outcomes[0];
  const estimatedNotional = selectedOutcome.priceCents * shares;

  const tradeMutation = useMutation({
    mutationFn: () =>
      apiPost("/api/trades", {
        marketId: market.id,
        outcomeKey,
        side,
        type: orderType,
        shares,
        limitPriceCents: orderType === "LIMIT" ? limitPrice : undefined,
      }),
    onSuccess: () => {
      toast.success("Paper trade executed.");
      void query.refetch();
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const commentMutation = useMutation({
    mutationFn: () => apiPost(`/api/markets/${slug}/comments`, { body: comment }),
    onSuccess: () => {
      setComment("");
      toast.success("Comment added.");
      void query.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-6">
        <Card className="rounded-[32px]">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <Badge>{market.category}</Badge>
              <Badge variant="warning">{market.sourceMode.toLowerCase()} pricing</Badge>
              {market.featured ? <Badge variant="positive">Featured</Badge> : null}
            </div>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-3xl leading-tight">{market.title}</CardTitle>
                <CardDescription className="mt-3 max-w-3xl text-base leading-7">
                  {market.description}
                </CardDescription>
              </div>
              <WatchlistButton marketId={market.id} initialWatchlisted={market.watchlisted} size="sm" />
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            {[
              ["Ends", formatRelative(market.endsAt)],
              ["Volume", formatCurrency(market.volume24hCents)],
              ["Liquidity", `${market.liquidityScore}`],
              ["Cash", formatCurrency(market.cashBalanceCents)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[24px] border border-border bg-surface-soft p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">{label}</div>
                <div className="mt-2 text-xl font-semibold">{value}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle>Price history</CardTitle>
            <CardDescription>Near-live YES pricing from the provider layer with fallback continuity.</CardDescription>
          </CardHeader>
          <CardContent>
            <PriceHistoryChart data={market.chart} />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-[32px]">
            <CardHeader>
              <CardTitle>Open position summary</CardTitle>
              <CardDescription>Your exposure in this market, broken out by outcome.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {market.positions.length ? (
                market.positions.map((position) => (
                  <div key={position.id} className="rounded-[24px] border border-border bg-surface-soft p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">{position.outcomeKey}</div>
                      <div
                        className={`text-sm font-semibold ${
                          position.totalPnlCents >= 0 ? "text-accent" : "text-danger"
                        }`}
                      >
                        {formatCurrency(position.totalPnlCents)}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-foreground-muted">
                      <div>{position.shares} shares</div>
                      <div>Avg {formatPercentFromProbability(position.avgEntryPriceCents)}</div>
                      <div>Value {formatCurrency(position.marketValueCents)}</div>
                      <div>Unrealized {formatCurrency(position.unrealizedPnlCents)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-border bg-surface-soft p-4 text-sm text-foreground-muted">
                  No open position yet. Pick a side and simulate your first trade.
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="rounded-[32px]">
            <CardHeader>
              <CardTitle>Trade feed</CardTitle>
              <CardDescription>Recent simulated fills in this market.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {market.tradeFeed.map((trade) => (
                <div key={trade.id} className="flex items-center justify-between rounded-[22px] border border-border bg-surface-soft px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold">
                      {trade.username} {trade.outcomeKey}
                    </div>
                    <div className="text-xs text-foreground-muted">
                      {trade.shares} shares · {formatRelative(trade.createdAt)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">
                    {formatPercentFromProbability(trade.priceCents)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[32px]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <MessageSquareMore className="h-5 w-5 text-accent" />
              <div>
                <CardTitle>Market comments</CardTitle>
                <CardDescription>Internal discussion only, kept inside your PaperMarket workspace.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Textarea
                placeholder="Add context, conviction, or a trade note..."
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
              <div className="flex justify-end">
                <Button onClick={() => commentMutation.mutate()} disabled={!comment.trim() || commentMutation.isPending}>
                  {commentMutation.isPending ? "Posting..." : "Post comment"}
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {market.comments.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-border bg-surface-soft p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={item.displayName} image={item.avatarUrl} className="h-9 w-9" />
                    <div>
                      <div className="font-semibold">{item.displayName}</div>
                      <div className="text-xs text-foreground-muted">@{item.username} · {formatRelative(item.createdAt)}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-foreground-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle>Trade panel</CardTitle>
            <CardDescription>
              {side === "BUY" ? "Open or add to a position." : "Sell down existing simulated shares."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-2">
              {(["BUY", "SELL"] as const).map((value) => (
                <Button
                  key={value}
                  variant={side === value ? "default" : "secondary"}
                  onClick={() => setSide(value)}
                >
                  {value}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {market.outcomes.map((outcome) => (
                <Button
                  key={outcome.key}
                  variant={outcomeKey === outcome.key ? "default" : "secondary"}
                  onClick={() => setOutcomeKey(outcome.key as "YES" | "NO")}
                >
                  {outcome.label} {formatPercentFromProbability(outcome.priceCents)}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["MARKET", "LIMIT"] as const).map((value) => (
                <Button
                  key={value}
                  variant={orderType === value ? "outline" : "ghost"}
                  onClick={() => setOrderType(value)}
                >
                  {value}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Shares</label>
              <Input
                type="number"
                min={1}
                value={shares}
                onChange={(event) => setShares(Number(event.target.value) || 0)}
              />
            </div>
            {orderType === "LIMIT" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Limit price (cents)</label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={limitPrice ?? ""}
                  onChange={(event) => setLimitPrice(Number(event.target.value) || undefined)}
                />
              </div>
            ) : null}
            <div className="rounded-[24px] border border-border bg-surface-soft p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Selected price</span>
                <span className="font-semibold">{formatPercentFromProbability(selectedOutcome.priceCents)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Estimated notional</span>
                <span className="font-semibold">{formatCurrency(estimatedNotional)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-foreground-muted">24h move</span>
                <span className={selectedOutcome.changeBps >= 0 ? "text-accent" : "text-danger"}>
                  {selectedOutcome.changeBps >= 0 ? "+" : ""}
                  {formatPercentFromBps(selectedOutcome.changeBps)}
                </span>
              </div>
              <p className="mt-4 text-xs leading-6 text-foreground-muted">
                Execution applies configurable slippage and fees server-side for paper fills.
              </p>
            </div>
            <Button
              className="w-full"
              size="lg"
              disabled={tradeMutation.isPending || shares <= 0}
              onClick={() => tradeMutation.mutate()}
            >
              {tradeMutation.isPending ? "Executing..." : `${side} ${outcomeKey}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

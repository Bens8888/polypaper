import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";

import { formatCurrency, formatPercentFromBps, formatPercentFromProbability, formatRelative } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WatchlistButton } from "@/components/markets/watchlist-button";

export type MarketCardData = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  featured: boolean;
  status: string;
  endsAt: string | Date;
  sourceMode: string;
  yesPriceCents: number;
  noPriceCents: number;
  yesChangeBps: number;
  volume24hCents: number;
  liquidityScore: number;
  commentsCount: number;
  watchlistCount: number;
  watchlisted: boolean;
};

type MarketCardProps = {
  market: MarketCardData;
};

export function MarketCard({ market }: MarketCardProps) {
  const positive = market.yesChangeBps >= 0;

  return (
    <Card className="overflow-hidden rounded-[24px] border-border/90">
      <CardContent className="p-0">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{market.category}</Badge>
                {market.featured ? <Badge variant="positive">Featured</Badge> : null}
                <div className="text-[10px] uppercase tracking-[0.18em] text-foreground-muted">
                  {market.sourceMode.toLowerCase()} feed
                </div>
              </div>

              <Link href={`/markets/${market.slug}`} className="group block">
                <h3 className="text-lg font-semibold leading-7 transition group-hover:text-accent">
                  {market.title}
                </h3>
              </Link>
            </div>

            <WatchlistButton marketId={market.id} initialWatchlisted={market.watchlisted} />
          </div>

          <p className="mt-3 line-clamp-2 text-sm leading-6 text-foreground-muted">
            {market.description}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="rounded-[18px] border border-accent/15 bg-accent/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-accent">Yes</div>
              <div className="mt-2 text-2xl font-semibold">
                {formatPercentFromProbability(market.yesPriceCents)}
              </div>
              <div className={`mt-1 text-xs ${positive ? "text-accent" : "text-danger"}`}>
                {positive ? "+" : ""}
                {formatPercentFromBps(market.yesChangeBps)}
              </div>
            </div>

            <div className="rounded-[18px] border border-border bg-surface-soft p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">No</div>
              <div className="mt-2 text-2xl font-semibold">
                {formatPercentFromProbability(market.noPriceCents)}
              </div>
              <div className="mt-1 text-xs text-foreground-muted">Opposite side</div>
            </div>

            <div className="grid gap-2 rounded-[18px] border border-border bg-black/20 p-4 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-foreground-muted">Volume</div>
                <div className="mt-1 font-semibold">{formatCurrency(market.volume24hCents)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-foreground-muted">Ends</div>
                <div className="mt-1 flex items-center gap-2 font-semibold">
                  <Clock3 className="h-3.5 w-3.5 text-foreground-muted" />
                  {formatRelative(market.endsAt)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/80 bg-black/15 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-4 text-foreground-muted">
            <div>{market.liquidityScore} liquidity</div>
            <div>{market.commentsCount} comments</div>
          </div>

          <Link
            href={`/markets/${market.slug}`}
            className="inline-flex items-center gap-2 font-semibold text-accent"
          >
            Open market
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

import { requireSession } from "@/lib/auth";
import { formatCurrency, formatPercentFromBps, formatTimestamp } from "@/lib/format";
import { getDashboardData } from "@/server/services/market-service";
import { PerformanceChart } from "@/components/charts/performance-chart";
import { MarketCard } from "@/components/markets/market-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getDashboardData(session.user.id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Command center"
        title="Trade faster with a cleaner paper market dashboard"
        description="Track your simulated portfolio, scan fresh markets, watch what is ending soon, and manage ideas from one high-density workspace."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Cash balance", formatCurrency(data.portfolio.cashBalanceCents)],
          ["Portfolio equity", formatCurrency(data.portfolio.equityCents)],
          ["Unrealized PnL", formatCurrency(data.portfolio.unrealizedPnlCents)],
          ["Return", `${data.portfolio.totalReturnBps >= 0 ? "+" : ""}${formatPercentFromBps(data.portfolio.totalReturnBps)}`],
        ].map(([label, value]) => (
          <Card key={label} className="rounded-[30px]">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">{label}</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>Historical portfolio equity snapshots from your paper account.</CardDescription>
          </CardHeader>
          <CardContent>
            <PerformanceChart data={data.performance} />
          </CardContent>
        </Card>
        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle>Watchlist</CardTitle>
            <CardDescription>Your saved markets for quick monitoring and faster entries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.watchlist.length ? (
              data.watchlist.map((market) => (
                <div key={market.id} className="rounded-[24px] border border-border bg-surface-soft p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{market.title}</div>
                      <div className="mt-1 text-sm text-foreground-muted">{market.category}</div>
                    </div>
                    <Badge variant="positive">{market.yesPriceCents}% yes</Badge>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                eyebrow="Watchlist"
                title="No saved markets yet"
                description="Use the star button on a market card to build a personalized watchlist."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <Badge>Trending</Badge>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">High-volume markets</h2>
          </div>
        </div>
        <div className="market-grid">
          {data.trendingMarkets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4">
          <div>
            <Badge>New markets</Badge>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Fresh setups</h2>
          </div>
          <div className="market-grid">
            {data.newMarkets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        </section>
        <section className="space-y-4">
          <div>
            <Badge variant="warning">Ending soon</Badge>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Markets closing soon</h2>
          </div>
          <div className="market-grid">
            {data.endingSoon.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        </section>
      </div>

      <Card className="rounded-[32px]">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Trades, market syncs, and other account events in time order.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.activity.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-[24px] border border-border bg-surface-soft p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold">{item.title}</div>
                <div className="mt-1 text-sm text-foreground-muted">{item.message}</div>
              </div>
              <div className="text-sm text-foreground-muted">{formatTimestamp(item.createdAt)}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

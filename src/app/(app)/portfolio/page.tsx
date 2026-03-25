import { requireSession } from "@/lib/auth";
import { formatCurrency, formatPercentFromBps, formatPercentFromProbability, formatRelative } from "@/lib/format";
import { getPortfolioSnapshot } from "@/server/services/portfolio";
import { PerformanceChart } from "@/components/charts/performance-chart";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "Portfolio",
};

export default async function PortfolioPage() {
  const session = await requireSession();
  const portfolio = await getPortfolioSnapshot(session.user.id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Portfolio"
        title="Track cash, market value, and PnL across your paper positions"
        description="Open exposure, closed trades, realized gains, and equity history all stay synchronized with the paper-trading engine."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Cash", formatCurrency(portfolio.overview.cashBalanceCents)],
          ["Position value", formatCurrency(portfolio.overview.positionsValueCents)],
          ["Equity", formatCurrency(portfolio.overview.equityCents)],
          ["Realized PnL", formatCurrency(portfolio.overview.realizedPnlCents)],
          ["Return", `${portfolio.overview.totalReturnBps >= 0 ? "+" : ""}${formatPercentFromBps(portfolio.overview.totalReturnBps)}`],
        ].map(([label, value]) => (
          <Card key={label} className="rounded-[30px]">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">{label}</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-[32px]">
        <CardHeader>
          <CardTitle>Performance chart</CardTitle>
          <CardDescription>Historical portfolio snapshots, captured after trading and market sync events.</CardDescription>
        </CardHeader>
        <CardContent>
          <PerformanceChart data={portfolio.performance} />
        </CardContent>
      </Card>

      <Card className="rounded-[32px]">
        <CardHeader>
          <CardTitle>Positions</CardTitle>
          <CardDescription>All paper positions with marked value and current unrealized PnL.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {portfolio.positions.length ? (
            portfolio.positions.map((position) => (
              <div key={position.id} className="grid gap-3 rounded-[24px] border border-border bg-surface-soft p-4 md:grid-cols-[1.4fr_repeat(5,0.8fr)] md:items-center">
                <div>
                  <div className="font-semibold">{position.marketTitle}</div>
                  <div className="mt-1 text-sm text-foreground-muted">
                    {position.category} · {position.outcomeKey} · {formatRelative(position.endsAt)}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">Shares</div>
                  <div className="mt-1 font-semibold">{position.shares}</div>
                </div>
                <div className="text-sm">
                  <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">Avg entry</div>
                  <div className="mt-1 font-semibold">{formatPercentFromProbability(position.avgEntryPriceCents)}</div>
                </div>
                <div className="text-sm">
                  <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">Mark value</div>
                  <div className="mt-1 font-semibold">{formatCurrency(position.marketValueCents)}</div>
                </div>
                <div className="text-sm">
                  <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">Unrealized</div>
                  <div className={`mt-1 font-semibold ${position.unrealizedPnlCents >= 0 ? "text-accent" : "text-danger"}`}>
                    {formatCurrency(position.unrealizedPnlCents)}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">Realized</div>
                  <div className={`mt-1 font-semibold ${position.realizedPnlCents >= 0 ? "text-accent" : "text-danger"}`}>
                    {formatCurrency(position.realizedPnlCents)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              eyebrow="Portfolio"
              title="No positions yet"
              description="Your open positions will appear here once you start trading markets."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

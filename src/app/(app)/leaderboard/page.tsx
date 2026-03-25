import { requireSession } from "@/lib/auth";
import { formatCurrency, formatPercentFromBps } from "@/lib/format";
import { getLeaderboardData } from "@/server/services/market-service";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = {
  title: "Leaderboard",
};

export default async function LeaderboardPage() {
  await requireSession();
  const leaderboard = await getLeaderboardData();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Leaderboard"
        title="See who is compounding simulated capital the fastest"
        description="Rankings are based on current paper equity versus the original $100.00 starting balance."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {leaderboard.entries.slice(0, 3).map((entry, index) => (
          <Card key={entry.username} className="rounded-[32px]">
            <CardContent className="p-6">
              <Badge variant={index === 0 ? "positive" : "neutral"}>Rank #{entry.rank}</Badge>
              <div className="mt-4 flex items-center gap-3">
                <Avatar name={entry.displayName} image={entry.avatarUrl} />
                <div>
                  <div className="font-semibold">{entry.displayName}</div>
                  <div className="text-sm text-foreground-muted">@{entry.username}</div>
                </div>
              </div>
              <div className="mt-5 text-3xl font-semibold">
                {entry.returnBps >= 0 ? "+" : ""}
                {formatPercentFromBps(entry.returnBps)}
              </div>
              <div className="mt-2 text-sm text-foreground-muted">
                {formatCurrency(entry.equityCents)} total equity
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="rounded-[32px]">
        <CardHeader>
          <CardTitle>All traders</CardTitle>
          <CardDescription>Latest simulated standings across every paper account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {leaderboard.entries.map((entry) => (
            <div key={entry.username} className="grid gap-3 rounded-[24px] border border-border bg-surface-soft p-4 md:grid-cols-[0.4fr_1.6fr_0.8fr_0.8fr_0.8fr] md:items-center">
              <div className="text-lg font-semibold">#{entry.rank}</div>
              <div className="flex items-center gap-3">
                <Avatar name={entry.displayName} image={entry.avatarUrl} />
                <div>
                  <div className="font-semibold">{entry.displayName}</div>
                  <div className="text-sm text-foreground-muted">@{entry.username}</div>
                </div>
              </div>
              <div className="text-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">Return</div>
                <div className={`mt-1 font-semibold ${entry.returnBps >= 0 ? "text-accent" : "text-danger"}`}>
                  {entry.returnBps >= 0 ? "+" : ""}
                  {formatPercentFromBps(entry.returnBps)}
                </div>
              </div>
              <div className="text-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">Equity</div>
                <div className="mt-1 font-semibold">{formatCurrency(entry.equityCents)}</div>
              </div>
              <div className="text-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">Unrealized</div>
                <div className={`mt-1 font-semibold ${entry.unrealizedPnlCents >= 0 ? "text-accent" : "text-danger"}`}>
                  {formatCurrency(entry.unrealizedPnlCents)}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

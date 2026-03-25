import { requireSession } from "@/lib/auth";
import { formatCurrency, formatPercentFromProbability, formatTimestamp } from "@/lib/format";
import { getActivityFeed } from "@/server/services/market-service";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Activity",
};

export default async function ActivityPage() {
  const session = await requireSession();
  const activity = await getActivityFeed(session.user.id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account activity"
        title="Review your trades, profile actions, and account events"
        description="A full history of paper orders and account actions, helpful for reviewing execution and decision quality."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle>Trade history</CardTitle>
            <CardDescription>Executed market and limit orders from your paper account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.orders.map((order) => (
              <div key={order.id} className="rounded-[24px] border border-border bg-surface-soft p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">
                      {order.side} {order.outcomeKey} · {order.marketTitle}
                    </div>
                    <div className="mt-1 text-sm text-foreground-muted">
                      {order.shares} shares · {formatTimestamp(order.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {order.executionPriceCents ? formatPercentFromProbability(order.executionPriceCents) : "Pending"}
                    </div>
                    <div className="mt-1 text-sm text-foreground-muted">Fee {formatCurrency(order.feeCents)}</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle>Account log</CardTitle>
            <CardDescription>Profile changes, resets, sync events, and system notices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.logs.map((log) => (
              <div key={log.id} className="rounded-[24px] border border-border bg-surface-soft p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{log.title}</div>
                    <div className="mt-1 text-sm text-foreground-muted">{log.message}</div>
                  </div>
                  <div className="text-sm text-foreground-muted">{formatTimestamp(log.createdAt)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

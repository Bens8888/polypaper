"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { apiPost } from "@/lib/client-api";
import { formatCurrency, formatPercentFromBps, formatTimestamp } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AdminConsoleProps = {
  users: {
    id: string;
    email: string;
    username: string;
    role: string;
    createdAt: string | Date;
    cashBalanceCents: number;
    equityCents: number;
    returnBps: number;
  }[];
  lastSync?: string | Date | null;
};

export function AdminConsole({ users, lastSync }: AdminConsoleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function triggerSync() {
    startTransition(async () => {
      try {
        await apiPost("/api/admin/sync");
        toast.success("Market sync triggered.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to trigger sync.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px]">
        <CardHeader className="md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>Control plane</CardTitle>
            <CardDescription>
              Review user balances and force a provider sync when needed.
            </CardDescription>
          </div>
          <Button onClick={triggerSync} disabled={isPending}>
            {isPending ? "Syncing..." : "Trigger sync"}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-border bg-surface-soft p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">Users</div>
            <div className="mt-2 text-2xl font-semibold">{users.length}</div>
          </div>
          <div className="rounded-[24px] border border-border bg-surface-soft p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">Last sync</div>
            <div className="mt-2 text-sm font-semibold">{lastSync ? formatTimestamp(lastSync) : "Never"}</div>
          </div>
          <div className="rounded-[24px] border border-border bg-surface-soft p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">Top equity</div>
            <div className="mt-2 text-2xl font-semibold">
              {formatCurrency(Math.max(...users.map((user) => user.equityCents), 0))}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-[32px]">
        <CardHeader>
          <CardTitle>User accounts</CardTitle>
          <CardDescription>Recent paper accounts and their simulated standing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="grid gap-3 rounded-[24px] border border-border bg-surface-soft p-4 md:grid-cols-[1.4fr_repeat(4,0.7fr)] md:items-center">
              <div>
                <div className="font-semibold">{user.username}</div>
                <div className="text-sm text-foreground-muted">{user.email}</div>
              </div>
              <div className="text-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">Role</div>
                <div className="mt-1 font-semibold">{user.role}</div>
              </div>
              <div className="text-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">Cash</div>
                <div className="mt-1 font-semibold">{formatCurrency(user.cashBalanceCents)}</div>
              </div>
              <div className="text-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">Equity</div>
                <div className="mt-1 font-semibold">{formatCurrency(user.equityCents)}</div>
              </div>
              <div className="text-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">Return</div>
                <div className={`mt-1 font-semibold ${user.returnBps >= 0 ? "text-accent" : "text-danger"}`}>
                  {user.returnBps >= 0 ? "+" : ""}
                  {formatPercentFromBps(user.returnBps)}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

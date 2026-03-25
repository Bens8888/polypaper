"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { apiPost } from "@/lib/client-api";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SettingsFormProps = {
  profile: {
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    email: string;
  };
  accountSummary: {
    cashBalanceCents: number;
    equityCents: number;
  };
};

export function SettingsForm({ profile, accountSummary }: SettingsFormProps) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");

  function saveProfile() {
    startTransition(async () => {
      try {
        const user = await apiPost<{
          username: string;
          displayName?: string | null;
          avatarUrl?: string | null;
        }>("/api/settings/profile", {
          username,
          displayName,
          avatarUrl,
        });

        await update({
          user: {
            username: user.username,
            name: user.displayName ?? user.username,
            image: user.avatarUrl ?? null,
            role: session?.user?.role ?? "USER",
          },
        });

        toast.success("Profile updated.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update profile.");
      }
    });
  }

  function resetAccount() {
    const confirmed = window.confirm(
      "Reset your paper account back to $100.00 and clear positions, orders, and watchlist?",
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        await apiPost("/api/settings/reset");
        toast.success("Paper account reset.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to reset account.");
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <Card className="rounded-[32px]">
        <CardHeader>
          <CardTitle>Profile settings</CardTitle>
          <CardDescription>Manage your public trader identity and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input value={profile.email} disabled />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <Input value={username} onChange={(event) => setUsername(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Display name</label>
            <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Avatar URL</label>
            <Input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} />
          </div>
          <Button onClick={saveProfile} disabled={isPending}>
            {isPending ? "Saving..." : "Save profile"}
          </Button>
        </CardContent>
      </Card>
      <div className="space-y-6">
        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle>Account state</CardTitle>
            <CardDescription>Current paper balances and reset controls.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-border bg-surface-soft p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">Cash</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(accountSummary.cashBalanceCents)}</div>
            </div>
            <div className="rounded-[24px] border border-border bg-surface-soft p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">Equity</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(accountSummary.equityCents)}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
            <CardDescription>Resetting returns your paper cash to exactly $100.00.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="danger" onClick={resetAccount} disabled={isPending}>
              {isPending ? "Resetting..." : "Reset paper account"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Bell, ChevronRight, LogOut, Search, TrendingUp } from "lucide-react";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/client-api";
import { appNavigation, adminNavigation } from "@/lib/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { LogoMark } from "@/components/shared/logo-mark";

type TopbarProps = {
  user: {
    name?: string | null;
    username: string;
    role: "USER" | "ADMIN";
    image?: string | null;
  };
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
};

type TickerMarket = {
  id: string;
  slug: string;
  title: string;
  yesPriceCents: number;
  yesChangeBps: number;
};

export function Topbar({ user }: TopbarProps) {
  const pathname = usePathname();
  const navItems = user.role === "ADMIN" ? [...appNavigation, ...adminNavigation] : appNavigation;
  const pageLabel = navItems.find((item) => pathname.startsWith(item.href))?.label ?? "Overview";

  const { data: notifications } = useQuery<NotificationItem[]>({
    queryKey: ["notifications"],
    queryFn: () => apiGet("/api/notifications"),
    staleTime: 20_000,
  });

  const { data: tickerData } = useQuery<{ items: TickerMarket[] }>({
    queryKey: ["shell-ticker"],
    queryFn: () => apiGet("/api/markets?sort=movers&offset=0&limit=8&category=All"),
    staleTime: 20_000,
  });

  const tickerItems = [...(tickerData?.items ?? []), ...(tickerData?.items ?? [])];

  return (
    <div className="panel rounded-[24px] px-4 py-4 md:px-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="lg:hidden">
              <LogoMark />
            </div>
            <div className="hidden items-center gap-2 text-sm text-foreground-muted lg:flex">
              <span>Simulator</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{pageLabel}</span>
            </div>
            <Badge variant="warning" className="hidden md:inline-flex">
              Live pricing with paper execution
            </Badge>
          </div>

          <div className="flex flex-1 items-center gap-3 lg:max-w-[620px] lg:justify-end">
            <div className="hidden min-w-0 flex-1 items-center gap-3 rounded-full border border-border bg-surface-soft px-4 py-2.5 md:flex">
              <Search className="h-4 w-4 text-foreground-muted" />
              <div className="truncate text-sm text-foreground-muted">
                Search the full tape in Markets for faster entries and better scanning.
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-full border border-border bg-surface-soft px-3 py-2">
              <Avatar name={user.name ?? user.username} image={user.image} className="h-9 w-9" />
              <div className="hidden md:block">
                <div className="text-sm font-semibold">{user.name ?? user.username}</div>
                <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">
                  {user.role === "ADMIN" ? "Admin" : "Trader"}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="overflow-hidden rounded-[18px] border border-border bg-black/20 px-3 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-foreground-muted">
              <TrendingUp className="h-3.5 w-3.5" />
              Market movers
            </div>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {tickerItems.length ? (
                tickerItems.map((market, index) => (
                  <Link
                    key={`${market.id}-${index}`}
                    href={`/markets/${market.slug}`}
                    className="min-w-[220px] rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2.5"
                  >
                    <div className="truncate text-sm font-semibold">{market.title}</div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-foreground">{market.yesPriceCents}% yes</span>
                      <span className={market.yesChangeBps >= 0 ? "text-accent" : "text-danger"}>
                        {market.yesChangeBps >= 0 ? "+" : ""}
                        {(market.yesChangeBps / 100).toFixed(2)}%
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-sm text-foreground-muted">
                  Market movers will appear here after the live feed syncs.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[auto_1fr]">
            <div className="flex items-center gap-2 rounded-[18px] border border-border bg-black/20 px-3 py-3">
              <Bell className="h-4 w-4 text-accent" />
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">
                  Latest event
                </div>
                <div className="text-sm font-semibold">
                  {notifications?.[0]?.title ?? "Waiting for the next sync"}
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-border bg-black/20 px-3 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">Desk note</div>
              <p className="mt-1 line-clamp-1 text-sm text-foreground-muted">
                {notifications?.[0]?.message ?? "Trade and sync notifications will show up here."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto lg:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-3 py-2 text-sm ${
              pathname.startsWith(item.href)
                ? "bg-accent text-slate-950"
                : "bg-surface-soft text-foreground-muted"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

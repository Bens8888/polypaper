"use client";

import Link from "next/link";
import { Bell, ChevronRight, LogOut } from "lucide-react";
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

export function Topbar({ user }: TopbarProps) {
  const pathname = usePathname();
  const navItems = user.role === "ADMIN" ? [...appNavigation, ...adminNavigation] : appNavigation;
  const pageLabel = navItems.find((item) => pathname.startsWith(item.href))?.label ?? "Overview";

  const { data: notifications } = useQuery<NotificationItem[]>({
    queryKey: ["notifications"],
    queryFn: () => apiGet("/api/notifications"),
    staleTime: 20_000,
  });

  return (
    <div className="panel rounded-[28px] px-4 py-4 md:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="lg:hidden">
            <LogoMark />
          </div>
          <div className="hidden items-center gap-2 text-sm text-foreground-muted lg:flex">
            <span>Workspace</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{pageLabel}</span>
          </div>
          <Badge variant="warning" className="hidden md:inline-flex">
            Live pricing with paper execution
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="panel-muted hidden max-w-sm rounded-[22px] px-4 py-3 md:block">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-foreground-muted">
              <Bell className="h-3.5 w-3.5" />
              Notifications
            </div>
            <p className="mt-1 line-clamp-1 text-sm text-foreground">
              {notifications?.[0]?.title ?? "Market sync and portfolio events appear here."}
            </p>
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

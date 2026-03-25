"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNavigation, appNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "@/components/shared/logo-mark";

type SidebarNavProps = {
  isAdmin: boolean;
};

export function SidebarNav({ isAdmin }: SidebarNavProps) {
  const pathname = usePathname();
  const items = isAdmin ? [...appNavigation, ...adminNavigation] : appNavigation;

  return (
    <aside className="panel sticky top-4 hidden h-[calc(100vh-2rem)] w-[272px] flex-col rounded-[32px] p-5 lg:flex">
      <LogoMark />
      <div className="mt-8 flex-1 space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-foreground-muted transition hover:bg-white/5 hover:text-foreground",
                active && "bg-white/6 text-foreground ring-1 ring-inset ring-border-strong",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-accent" : "text-foreground-muted")} />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="panel-muted rounded-[28px] p-4">
        <Badge variant="positive">Simulation Mode</Badge>
        <p className="mt-3 text-sm leading-6 text-foreground-muted">
          All balances, fills, and rankings are simulated. No wallets, no real money, no on-chain
          actions.
        </p>
      </div>
    </aside>
  );
}

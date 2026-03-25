import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Zap } from "lucide-react";

import { auth } from "@/lib/auth";
import { getLandingData } from "@/server/services/market-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoMark } from "@/components/shared/logo-mark";
import { formatCurrency, formatPercentFromProbability } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [session, landing] = await Promise.all([auth(), getLandingData()]);
  const primaryHref = session?.user?.id ? "/dashboard" : "/register";

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="panel rounded-[32px] px-6 py-5 md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <LogoMark />
            <div className="flex items-center gap-3">
              <Badge variant="warning">Paper trading only</Badge>
              <Link href={session?.user?.id ? "/dashboard" : "/login"}>
                <Button variant="secondary">{session?.user?.id ? "Dashboard" : "Login"}</Button>
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="panel rounded-[36px] p-8 md:p-12">
            <Badge variant="positive">Premium market simulator</Badge>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight md:text-6xl lg:text-7xl">
              Prediction markets, polished for paper traders.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-foreground-muted">
              PaperMarket brings live-style market pricing, simulated execution, portfolio tracking,
              watchlists, leaderboards, and trader-grade dashboards together in a cleaner and more
              premium experience built purely for practice.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={primaryHref}>
                <Button size="lg" className="w-full sm:w-auto">
                  Start with $100.00
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Use demo account
                </Button>
              </Link>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                ["Near-live feed", "Live provider with automatic mock fallback"],
                ["Clean execution", "Configurable slippage, fees, and instant fills"],
                ["Account system", "Email login, sessions, profiles, and resettable balances"],
              ].map(([title, description]) => (
                <div key={title} className="panel-muted rounded-[26px] p-5">
                  <div className="text-sm font-semibold">{title}</div>
                  <p className="mt-2 text-sm leading-6 text-foreground-muted">{description}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <Card className="rounded-[36px]">
              <CardHeader>
                <Badge>Why it feels live</Badge>
                <CardTitle className="mt-3 text-2xl">A market stack built to keep moving.</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {[
                  {
                    icon: Zap,
                    title: "Low-friction pricing sync",
                    copy: "Auto-syncs market data and gracefully drops into fallback mode when live feeds are unavailable.",
                  },
                  {
                    icon: Sparkles,
                    title: "Trader-focused interface",
                    copy: "Dense market cards, instant watchlist controls, price history, PnL, and account state in one flow.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Zero real money surface area",
                    copy: "No wallets, no blockchain signing, no deposits, and every balance is explicitly simulated.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 rounded-[24px] border border-border bg-surface-soft p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6">
                      <item.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <p className="mt-1 text-sm leading-6 text-foreground-muted">{item.copy}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                [String(landing.stats.users), "traders"],
                [String(landing.stats.markets), "markets"],
                [formatCurrency(landing.stats.volume24hCents), "24h paper volume"],
              ].map(([value, label]) => (
                <Card key={label} className="rounded-[28px]">
                  <CardContent className="p-5">
                    <div className="text-2xl font-semibold">{value}</div>
                    <div className="mt-1 text-sm text-foreground-muted">{label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <Badge>Featured markets</Badge>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Markets that look and move like the real thing.</h2>
            </div>
            <Link href={primaryHref} className="hidden md:block">
              <Button variant="secondary">Open PaperMarket</Button>
            </Link>
          </div>
          <div className="market-grid mt-6">
            {landing.featuredMarkets.map((market) => (
              <Card key={market.id} className="rounded-[30px]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <Badge>{market.category}</Badge>
                    <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">
                      {market.sourceMode.toLowerCase()}
                    </div>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold leading-8">{market.title}</h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-foreground-muted">
                    {market.description}
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-accent/15 bg-accent/10 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-accent">Yes</div>
                      <div className="mt-2 text-2xl font-semibold">
                        {formatPercentFromProbability(market.yesPriceCents)}
                      </div>
                    </div>
                    <div className="rounded-[22px] border border-border bg-surface-soft p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-foreground-muted">No</div>
                      <div className="mt-2 text-2xl font-semibold">
                        {formatPercentFromProbability(market.noPriceCents)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between text-sm text-foreground-muted">
                    <span>{formatCurrency(market.volume24hCents)} volume</span>
                    <span>{market.liquidityScore} liquidity</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

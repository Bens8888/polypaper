"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { apiPost } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "@/components/shared/logo-mark";

type AuthFormProps = {
  mode: "login" | "register";
  demoEmail: string;
  demoPassword: string;
};

export function AuthForm({ mode, demoEmail, demoPassword }: AuthFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState(mode === "login" ? demoEmail : "");
  const [password, setPassword] = useState(mode === "login" ? demoPassword : "");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");

  const isLogin = mode === "login";

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        if (isLogin) {
          const result = await signIn("credentials", {
            redirect: false,
            email,
            password,
          });

          if (result?.error) {
            throw new Error("Invalid email or password.");
          }

          toast.success("Signed in.");
          router.push("/dashboard");
          router.refresh();
          return;
        }

        await apiPost("/api/auth/register", {
          email,
          password,
          username,
          displayName,
        });

        const loginResult = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (loginResult?.error) {
          throw new Error("Account created, but automatic sign-in failed.");
        }

        toast.success("Account created with $100.00 in paper cash.");
        router.push("/dashboard");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to continue.");
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="panel rounded-[32px] p-8 md:p-10">
        <LogoMark />
        <div className="mt-10">
          <Badge variant="warning">Simulation only</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Trade live-style prediction markets without risking real capital.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-foreground-muted">
            Every new PaperMarket account starts with exactly $100.00 in simulated cash, real-time
            style pricing, and a fallback market engine that keeps running even when live feeds do
            not.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ["$100.00", "starting paper cash"],
            ["Near-live", "market pricing sync"],
            ["No crypto", "wallet-free simulation"],
          ].map(([value, label]) => (
            <div key={label} className="panel-muted rounded-[24px] p-4">
              <div className="text-2xl font-semibold">{value}</div>
              <div className="mt-1 text-sm text-foreground-muted">{label}</div>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-[28px] border border-border bg-surface-soft p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-foreground-muted">
            Demo access
          </div>
          <div className="mt-3 text-sm leading-7 text-foreground">
            Use the seeded demo account instantly.
          </div>
          <div className="mt-3 space-y-1 text-sm text-foreground-muted">
            <div>Email: {demoEmail}</div>
            <div>Password: {demoPassword}</div>
          </div>
        </div>
      </div>
      <Card className="rounded-[32px]">
        <CardHeader className="pb-5">
          <Badge>{isLogin ? "Welcome back" : "Create account"}</Badge>
          <CardTitle className="mt-3 text-2xl">
            {isLogin ? "Sign in to PaperMarket" : "Open your paper trading account"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Continue with your username-backed account and simulated portfolio."
              : "No wallets. No crypto. Just prediction market practice with a premium trading interface."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isLogin ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input
                  placeholder="papertrader"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Display name</label>
                <Input
                  placeholder="Paper Trader"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </div>
            </>
          ) : null}
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
            />
          </div>
          <Button className="w-full" size="lg" onClick={handleSubmit} disabled={isPending}>
            {isPending
              ? "Working..."
              : isLogin
                ? "Enter dashboard"
                : "Create account with $100.00"}
          </Button>
          <p className="text-center text-sm text-foreground-muted">
            {isLogin ? "Need an account?" : "Already have an account?"}{" "}
            <Link
              href={isLogin ? "/register" : "/login"}
              className="font-semibold text-foreground transition hover:text-accent"
            >
              {isLogin ? "Create one" : "Sign in"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

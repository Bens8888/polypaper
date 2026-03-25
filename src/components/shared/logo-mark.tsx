import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
};

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent via-[#72edbc] to-chart-2 text-slate-950 shadow-[0_24px_48px_-24px_rgba(87,216,155,0.9)]">
        <span className="font-mono text-base font-bold">PM</span>
      </div>
      <div>
        <div className="text-base font-semibold tracking-tight">PaperMarket</div>
        <div className="text-xs uppercase tracking-[0.24em] text-foreground-muted">
          paper trading only
        </div>
      </div>
    </div>
  );
}

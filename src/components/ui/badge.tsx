import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
  {
    variants: {
      variant: {
        neutral: "bg-white/6 text-foreground-muted ring-1 ring-inset ring-border",
        positive: "bg-accent/14 text-accent ring-1 ring-inset ring-accent/25",
        warning: "bg-accent-warm/14 text-accent-warm ring-1 ring-inset ring-accent-warm/25",
        danger: "bg-danger/14 text-danger ring-1 ring-inset ring-danger/25",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-2xl border border-border bg-surface-soft px-4 text-sm text-foreground placeholder:text-foreground-muted/70 outline-none transition focus:border-accent/50 focus:bg-surface-strong",
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };

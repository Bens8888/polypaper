"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-accent px-4 py-2.5 text-slate-950 shadow-[0_14px_34px_-18px_rgba(87,216,155,0.7)] hover:bg-[#63e1a8]",
        secondary:
          "bg-surface-soft px-4 py-2.5 text-foreground ring-1 ring-inset ring-border hover:bg-surface-strong",
        ghost: "px-3 py-2 text-foreground-muted hover:bg-white/5 hover:text-foreground",
        outline:
          "bg-transparent px-4 py-2.5 text-foreground ring-1 ring-inset ring-border-strong hover:bg-surface-soft",
        danger:
          "bg-danger px-4 py-2.5 text-white shadow-[0_14px_34px_-18px_rgba(255,107,107,0.65)] hover:bg-[#ff7878]",
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-5 text-sm",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };

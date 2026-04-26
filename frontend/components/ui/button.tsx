// @ts-nocheck
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

/**
 * Plimsoll button system.
 *
 *  - `default`     : solid violet (primary CTA when gradient is too loud).
 *  - `gradient`    : the *only* hero CTA — uses --accent-grad.
 *  - `outline`     : hairline border, ghost on hover.
 *  - `ghost`       : transparent, raises on hover.
 *  - `secondary`   : low-contrast filled chip.
 *  - `destructive` : danger.
 *  - `link`        : inline text link.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-btn,0.625rem)] text-sm font-medium tracking-[-0.005em] transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]/40 focus-visible:ring-offset-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent-2)] text-white hover:bg-[var(--accent-3)] active:bg-[var(--accent-3)]",
        gradient:
          "bg-[var(--accent-grad)] text-white shadow-[0_0_0_1px_rgba(37,99,235,0.20),0_10px_30px_-12px_rgba(37,99,235,0.45)] hover:brightness-110 active:brightness-95",
        destructive:
          "bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90 focus-visible:ring-[var(--danger)]/40",
        outline:
          "border border-[var(--line-strong)] bg-white text-[var(--text-hi)] hover:bg-[var(--bg-1)] hover:border-[var(--accent-2)]/40",
        secondary:
          "bg-[rgba(37,99,235,0.06)] text-[var(--accent-3)] border border-[var(--line)] hover:bg-[rgba(37,99,235,0.10)]",
        ghost:
          "bg-transparent text-[var(--text-mid)] hover:bg-[rgba(37,99,235,0.06)] hover:text-[var(--text-hi)]",
        link:
          "text-[var(--accent-2)] underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5 text-[13px]",
        lg: "h-11 px-6 has-[>svg]:px-5 text-[15px]",
        xl: "h-12 px-7 has-[>svg]:px-6 text-base",
        icon: "size-9",
        pill: "h-9 px-4 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

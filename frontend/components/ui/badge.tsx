// @ts-nocheck
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.06em] w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-[var(--line)] bg-[rgba(255,255,255,0.04)] text-[var(--text-mid)]",
        secondary:
          "border-[var(--line)] bg-[rgba(255,255,255,0.06)] text-[var(--text-hi)]",
        accent:
          "border-[rgba(167,139,250,0.35)] bg-[rgba(124,58,237,0.12)] text-[var(--accent-1)]",
        success:
          "border-[rgba(34,211,168,0.30)] bg-[rgba(34,211,168,0.10)] text-[var(--success)]",
        warn:
          "border-[rgba(245,181,68,0.30)] bg-[rgba(245,181,68,0.10)] text-[var(--warn)]",
        destructive:
          "border-[rgba(255,84,112,0.30)] bg-[rgba(255,84,112,0.10)] text-[var(--danger)]",
        outline:
          "border-[var(--line-strong)] bg-transparent text-[var(--text-mid)] hover:text-[var(--text-hi)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };

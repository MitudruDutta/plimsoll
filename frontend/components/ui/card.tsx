// @ts-nocheck
import * as React from "react";

import { cn } from "./utils";

/**
 * Plimsoll glass card. Hairline border, soft inner highlight, deep
 * cinematic shadow. Use the `flat` prop for nested cards that should
 * not stack another shadow on top.
 */
function Card({
  className,
  flat = false,
  ...props
}: React.ComponentProps<"div"> & { flat?: boolean }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "relative flex flex-col gap-6 rounded-2xl border border-[var(--line)] text-[var(--text-hi)] transition-colors",
        flat
          ? "bg-[rgba(255,255,255,0.025)]"
          : "bg-[rgba(255,255,255,0.04)] backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_30px_60px_-30px_rgba(0,0,0,0.6)]",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <h4
      data-slot="card-title"
      className={cn(
        "leading-none text-[var(--text-hi)] tracking-[-0.02em] text-base font-medium",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-[var(--text-mid)] leading-relaxed", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 [&:last-child]:pb-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center px-6 pb-6 [.border-t]:pt-6 [.border-t]:border-[var(--line)]",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};

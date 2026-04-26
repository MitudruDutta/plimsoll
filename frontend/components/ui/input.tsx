// @ts-nocheck
import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-[var(--radius-btn,0.625rem)] px-3 py-2 text-[15px] leading-tight transition-all outline-none",
        "border border-[var(--line)] bg-[rgba(255,255,255,0.03)] text-[var(--text-hi)]",
        "placeholder:text-[var(--text-low)]",
        "selection:bg-[rgba(167,139,250,0.30)] selection:text-[var(--text-hi)]",
        "focus-visible:border-[rgba(167,139,250,0.55)] focus-visible:bg-[rgba(255,255,255,0.05)] focus-visible:ring-2 focus-visible:ring-[rgba(167,139,250,0.20)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--text-hi)]",
        "aria-invalid:border-[var(--danger)] aria-invalid:ring-2 aria-invalid:ring-[rgba(255,84,112,0.25)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };

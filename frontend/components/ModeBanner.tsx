// @ts-nocheck
import React from "react";
import { Info } from "lucide-react";

/**
 * `mode: "demo" | "live"` banner.
 *
 * PRD §F2.9 — every surface backed by mocked feeds (hedging,
 * visual-risk, market-sentinel) must render this until the live
 * data integration in §B13 ships. Pass `mode="live"` to render
 * nothing; pass `mode="demo"` to render the banner.
 *
 * The banner intentionally does NOT use the violet gradient —
 * we save that signal for product CTAs. Demo state should feel
 * like an info nudge, not a celebration.
 */
export type SurfaceMode = "demo" | "live";

interface ModeBannerProps {
  mode: SurfaceMode | undefined | null;
  /** Optional override copy. Defaults to PRD-aligned wording. */
  message?: string;
  /** Optional pillar label, e.g. "Hedging" / "Visual risk". */
  pillar?: string;
  className?: string;
}

const DEFAULT_COPY = "Demo data — wired to live feeds in v1.x.";

export const ModeBanner: React.FC<ModeBannerProps> = ({
  mode,
  message,
  pillar,
  className = "",
}) => {
  if (mode !== "demo") return null;

  return (
    <div
      role="status"
      className={
        "flex items-center gap-3 rounded-xl border border-[rgba(245,181,68,0.30)] bg-[rgba(245,181,68,0.06)] px-4 py-2.5 text-sm text-[var(--warn)] " +
        className
      }
    >
      <Info className="size-4 shrink-0" strokeWidth={2} />
      <div className="flex-1 leading-snug">
        <span className="font-mono uppercase tracking-[0.12em] text-[10.5px] mr-2 opacity-80">
          {pillar ? `${pillar} · DEMO` : "DEMO"}
        </span>
        <span className="text-[var(--text-mid)]">{message ?? DEFAULT_COPY}</span>
      </div>
    </div>
  );
};

export default ModeBanner;

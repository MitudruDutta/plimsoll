"use client";

import React from "react";
import {
  Anchor,
  ShieldCheck,
  TrendingUp,
  Workflow,
  FileSearch,
  Globe2,
} from "lucide-react";

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  copy: string;
}

const FEATURES: ReadonlyArray<Feature> = [
  {
    icon: Anchor,
    title: "Voyage replay",
    copy: "Scrub every minute of a journey: AIS pings, port stops, weather, and the calls your team actually made.",
  },
  {
    icon: ShieldCheck,
    title: "Live compliance",
    copy: "IMO, SOLAS, MARPOL, and port-state rules continuously scored against your vessel docs and routes.",
  },
  {
    icon: TrendingUp,
    title: "Smart hedging",
    copy: "When market sentinels fire, Plimsoll proposes hedge sizing with FFA depth, basis, and explainable risk.",
  },
  {
    icon: Workflow,
    title: "Agent workflow",
    copy: "Specialist agents debate the call — market, legal, ops — so you ship with a transparent reasoning trace.",
  },
  {
    icon: FileSearch,
    title: "Document audit",
    copy: "Drop a folder of PDFs. Plimsoll extracts, classifies, and flags the certificates you actually need.",
  },
  {
    icon: Globe2,
    title: "Global awareness",
    copy: "Strait closures, sanctions, weather windows — surfaced where they matter, not buried in a feed.",
  },
];

/**
 * `Features` — three-column editorial grid.
 *
 * Six terse capability cards stacked under a common section header.
 * Each card is a hairline surface with an accent-tinted icon chip,
 * matching the supermemory blue/white aesthetic.
 */
export const Features: React.FC = () => {
  return (
    <section id="product" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
            Built for operators
          </p>
          <h2 className="mt-3 text-balance text-[clamp(2rem,3.6vw,2.75rem)] font-semibold tracking-[-0.03em] text-[var(--text-hi)]">
            Every signal that moves your fleet,{" "}
            <span className="accent-serif text-[var(--accent-3)]">
              in one calm surface.
            </span>
          </h2>
          <p className="mt-4 text-[1rem] leading-relaxed text-[var(--text-mid)]">
            Plimsoll replaces a dozen tabs of weather, market, and compliance
            tools with a single replayable cockpit. Quietly opinionated, never
            noisy.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group relative bg-white p-7 transition-colors hover:bg-[var(--bg-1)]"
            >
              <div className="flex size-11 items-center justify-center rounded-xl border border-[var(--line)] bg-[rgba(37,99,235,0.06)] text-[var(--accent-3)] transition-colors group-hover:border-[rgba(37,99,235,0.25)]">
                <feature.icon className="size-5" />
              </div>
              <h3 className="mt-5 text-[1.0625rem] font-semibold tracking-[-0.01em] text-[var(--text-hi)]">
                {feature.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-mid)]">
                {feature.copy}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

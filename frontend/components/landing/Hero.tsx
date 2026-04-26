"use client";

import React from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "../ui/button";
import { useSupabaseAuth } from "../../context/SupabaseAuthContext";

/**
 * Marketing hero — supermemory-style editorial.
 *
 *  - Pill chip with accent dot + tagline.
 *  - Massive sans headline with one italic serif accent word.
 *  - Calm subhead, two CTAs (gradient primary, ghost secondary).
 *  - Faint blue dot-grid backdrop and conic glow halo so the hero
 *    feels alive without overpowering the editorial typography.
 */
export const Hero: React.FC = () => {
  const router = useRouter();
  const { isSignedIn } = useSupabaseAuth();

  return (
    <section className="relative isolate overflow-hidden pb-20 pt-36 md:pb-28 md:pt-44">
      {/* backdrop layers */}
      <div
        aria-hidden
        className="bg-blueprint absolute inset-0 -z-10 opacity-60"
      />
      <div
        aria-hidden
        className="glow-conic pointer-events-none absolute left-1/2 top-[-15%] -z-10 h-[640px] w-[1100px] -translate-x-1/2 opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-white"
      />

      <div className="mx-auto max-w-5xl px-6 text-center lg:px-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/80 px-3 py-1 text-[12px] font-medium text-[var(--text-mid)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-2)] opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent-2)]" />
          </span>
          Maritime intelligence, replayable end-to-end
        </span>

        <h1 className="mt-7 text-balance text-[clamp(2.75rem,6vw,4.75rem)] font-semibold leading-[1.04] tracking-[-0.045em] text-[var(--text-hi)]">
          The cockpit for{" "}
          <span className="accent-serif text-[var(--accent-3)]">
            maritime risk,
          </span>
          <br className="hidden md:block" /> compliance, and hedging.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-[1.0625rem] leading-relaxed text-[var(--text-mid)]">
          Plimsoll watches your vessels, ports, and trade lanes the way a great
          analyst would — quietly stitching market signals, vessel docs, and
          compliance gaps into a single, replayable decision.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            variant="gradient"
            size="lg"
            onClick={() => router.push(isSignedIn ? "/usershome" : "/sign-in")}
            className="group"
          >
            {isSignedIn ? "Open the cockpit" : "Start free"}
            <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => router.push("/demo")}
            className="border border-[var(--line)] bg-white/60 backdrop-blur hover:bg-white"
          >
            <Sparkles className="size-4 text-[var(--accent-2)]" />
            See live demo
          </Button>
        </div>

        <p className="mt-5 text-[12px] uppercase tracking-[0.18em] text-[var(--text-low)]">
          No credit card · Replay any voyage · 5-minute setup
        </p>
      </div>

      {/* Floating product preview card */}
      <div className="relative mx-auto mt-16 max-w-6xl px-6 lg:px-10">
        <div className="surface-glass overflow-hidden rounded-[24px] p-2">
          <div className="relative rounded-[18px] border border-[var(--line)] bg-white">
            <div className="flex items-center gap-1.5 border-b border-[var(--line)] px-4 py-3">
              <span className="size-2.5 rounded-full bg-[#FF5F57]" />
              <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="size-2.5 rounded-full bg-[#28C840]" />
              <span className="ml-3 font-mono text-[11px] tracking-[0.08em] text-[var(--text-low)]">
                plimsoll.app/cockpit
              </span>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-3">
              {[
                { label: "Voyages tracked", value: "1,284", trend: "+12.4%" },
                { label: "Compliance gaps", value: "37", trend: "-21%" },
                { label: "Hedge alpha (90d)", value: "+$2.1M", trend: "+8.7%" },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--bg-1)] p-5"
                >
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-low)]">
                    {kpi.label}
                  </p>
                  <p className="mt-2 font-mono text-[26px] font-semibold tracking-tight text-[var(--text-hi)]">
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-[12px] font-medium text-[var(--success)]">
                    {kpi.trend} vs. prior
                  </p>
                </div>
              ))}
            </div>
            <div className="grid gap-px bg-[var(--line)] md:grid-cols-2">
              <div className="bg-white p-6">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-low)]">
                  Active route
                </p>
                <p className="mt-2 font-mono text-sm text-[var(--text-hi)]">
                  CNSHA → SGSIN → NLRTM
                </p>
                <div className="mt-4 h-24 w-full rounded-lg bg-gradient-to-br from-[rgba(91,141,239,0.18)] via-[rgba(37,99,235,0.10)] to-transparent" />
              </div>
              <div className="bg-white p-6">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-low)]">
                  Reasoning trace
                </p>
                <ul className="mt-2 space-y-1.5 font-mono text-[12px] text-[var(--text-mid)]">
                  <li>→ market_sentinel: Brent +3.2% (HIGH)</li>
                  <li>→ doc_audit: 2 missing certificates</li>
                  <li>→ hedge_engine: rolling FFA 15kt</li>
                  <li className="text-[var(--accent-3)]">
                    → recommendation: add 8% short hedge
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

"use client";

import React from "react";
import { Activity, Clock3, Layers, MessagesSquare } from "lucide-react";

/**
 * `BentoGrid` — supermemory-inspired asymmetric showcase.
 *
 * A 6×2 bento on desktop, collapsing gracefully to a single column on
 * mobile. Each tile is a self-contained vignette of one Plimsoll
 * capability with a tiny visualization, not just copy.
 */
export const BentoGrid: React.FC = () => {
  return (
    <section id="bento" className="relative py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
            How it feels
          </p>
          <h2 className="mt-3 text-balance text-[clamp(2rem,3.6vw,2.75rem)] font-semibold tracking-[-0.03em] text-[var(--text-hi)]">
            One cockpit. Six honest{" "}
            <span className="accent-serif text-[var(--accent-3)]">
              moments of clarity.
            </span>
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-6 md:grid-rows-2">
          {/* 1. Wide hero tile - Reasoning trace */}
          <div className="surface-elevated relative overflow-hidden rounded-3xl p-7 md:col-span-4 md:row-span-1">
            <div className="flex items-center gap-2 text-[var(--accent-3)]">
              <MessagesSquare className="size-4" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                Replayable reasoning
              </span>
            </div>
            <h3 className="mt-3 text-[1.5rem] font-semibold tracking-[-0.02em] text-[var(--text-hi)]">
              See exactly why a recommendation fired.
            </h3>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--text-mid)]">
              Each agent contributes a traced step. Replay any voyage and
              inspect the full chain — market signal, legal lookup, hedge sizing
              — without leaving the cockpit.
            </p>

            <div className="mt-6 grid gap-2">
              {[
                {
                  agent: "market_sentinel",
                  msg: "Brent crude +3.2% — severity HIGH",
                  tone: "danger",
                },
                {
                  agent: "doc_audit",
                  msg: "2/14 certificates missing for NLRTM",
                  tone: "warn",
                },
                {
                  agent: "hedge_engine",
                  msg: "Suggest 8% short FFA, 30d roll",
                  tone: "accent",
                },
              ].map((step) => (
                <div
                  key={step.agent}
                  className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg-1)] px-4 py-3"
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      step.tone === "danger"
                        ? "bg-[var(--danger)]"
                        : step.tone === "warn"
                          ? "bg-[var(--warn)]"
                          : "bg-[var(--accent-2)]"
                    }`}
                  />
                  <span className="font-mono text-[12px] text-[var(--text-low)]">
                    {step.agent}
                  </span>
                  <span className="text-[13px] text-[var(--text-hi)]">
                    {step.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Compliance score */}
          <div className="surface-elevated relative overflow-hidden rounded-3xl p-7 md:col-span-2 md:row-span-1">
            <div className="flex items-center gap-2 text-[var(--accent-3)]">
              <Layers className="size-4" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                Compliance
              </span>
            </div>
            <p className="mt-4 font-mono text-[64px] font-semibold leading-none tracking-tight text-grad-accent">
              94<span className="text-[28px] text-[var(--text-low)]">/100</span>
            </p>
            <p className="mt-3 text-[13px] text-[var(--text-mid)]">
              Live regulatory score across IMO, SOLAS, MARPOL, and port-state
              rules.
            </p>
            <div className="mt-5 space-y-2">
              {[
                { label: "Vessel certs", pct: 100 },
                { label: "Port docs", pct: 88 },
                { label: "Crew records", pct: 94 },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-[11px] text-[var(--text-mid)]">
                    <span>{row.label}</span>
                    <span className="font-mono">{row.pct}%</span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-2)]">
                    <div
                      className="bg-grad-accent h-full"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Time-to-decision */}
          <div className="surface-elevated relative overflow-hidden rounded-3xl p-7 md:col-span-2 md:row-span-1">
            <div className="flex items-center gap-2 text-[var(--accent-3)]">
              <Clock3 className="size-4" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                Faster decisions
              </span>
            </div>
            <p className="mt-4 font-mono text-[44px] font-semibold leading-tight tracking-tight text-[var(--text-hi)]">
              4.2<span className="text-[20px] text-[var(--text-low)]"> min</span>
            </p>
            <p className="mt-1 text-[13px] text-[var(--text-mid)]">
              Median time from signal to confirmed hedge action.
            </p>
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[rgba(22,163,74,0.06)] px-2.5 py-1 text-[11px] font-medium text-[var(--success)]">
              <span className="size-1.5 rounded-full bg-[var(--success)]" />
              −67% vs. spreadsheet workflow
            </p>
          </div>

          {/* 4. Live signal feed */}
          <div className="surface-elevated relative overflow-hidden rounded-3xl p-7 md:col-span-4 md:row-span-1">
            <div className="flex items-center gap-2 text-[var(--accent-3)]">
              <Activity className="size-4" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                Market sentinel
              </span>
            </div>
            <h3 className="mt-3 text-[1.25rem] font-semibold tracking-[-0.02em] text-[var(--text-hi)]">
              Real signals, ranked by what your fleet actually carries.
            </h3>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                {
                  ticker: "BRENT",
                  price: "$83.41",
                  delta: "+3.2%",
                  tone: "warn",
                },
                {
                  ticker: "BDI",
                  price: "1,824",
                  delta: "−1.1%",
                  tone: "muted",
                },
                {
                  ticker: "FFA-CAPE Q4",
                  price: "$22,150",
                  delta: "+0.8%",
                  tone: "ok",
                },
                {
                  ticker: "USD/CNY",
                  price: "7.281",
                  delta: "+0.2%",
                  tone: "muted",
                },
              ].map((row) => (
                <div
                  key={row.ticker}
                  className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white px-4 py-3"
                >
                  <span className="font-mono text-[12px] tracking-[0.04em] text-[var(--text-mid)]">
                    {row.ticker}
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[14px] text-[var(--text-hi)]">
                      {row.price}
                    </span>
                    <span
                      className={`font-mono text-[12px] ${
                        row.tone === "warn"
                          ? "text-[var(--warn)]"
                          : row.tone === "ok"
                            ? "text-[var(--success)]"
                            : "text-[var(--text-low)]"
                      }`}
                    >
                      {row.delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BentoGrid;

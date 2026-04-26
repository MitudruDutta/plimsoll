"use client";

import dynamic from "next/dynamic";

const ClientApp = dynamic(() => import("./ClientApp"), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-[var(--bg-0)] text-[var(--text-hi)] flex items-center justify-center">
      <span className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-mid)]">
        Loading Plimsoll&hellip;
      </span>
    </main>
  ),
});

export default function ClientOnlyApp() {
  return <ClientApp />;
}

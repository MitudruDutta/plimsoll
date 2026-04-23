"use client";

import dynamic from "next/dynamic";

const ClientApp = dynamic(() => import("./ClientApp"), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <span className="text-sm text-white/70">Loading NaviGuard AI...</span>
    </main>
  ),
});

export default function ClientOnlyApp() {
  return <ClientApp />;
}

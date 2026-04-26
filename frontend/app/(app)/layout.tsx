"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CommonHeader } from "@/components/CommonHeader";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useSupabaseAuth();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.replace("/sign-in");
      } else {
        setAuthChecked(true);
      }
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-0)]">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-low)]">
          Loading…
        </p>
      </main>
    );
  }

  return (
    <>
      <CommonHeader />
      {children}
    </>
  );
}

// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Loader2, Mail, Lock, AlertCircle } from "lucide-react";

import { BRAND, PlimsollMark } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";

/**
 * Sign-in / sign-up page.
 *
 * Single-column form on a soft white blueprint background, with a
 * faint blue conic glow behind the card. Mirrors the supermemory.ai
 * landing rhythm: oversized hero, serif italic accent on one word,
 * generous whitespace, a single calm blue accent, and a hairline
 * card with no chrome.
 *
 * Auth runs on Supabase (PRD §F2): email/password + Google OAuth.
 * Tokens are pushed into the axios clients via SupabaseAuthProvider.
 */
export function SignInPage() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    signInWithPassword,
    signUpWithPassword,
    signInWithOAuth,
    configured,
  } = useSupabaseAuth();

  const isSignUp = (pathname ?? "").startsWith("/sign-up");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setInfo(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setBusy(true);
    try {
      if (isSignUp) {
        const { error, needsEmailConfirm } = await signUpWithPassword(
          email,
          password,
          name ? { full_name: name } : undefined,
        );
        if (error) {
          setError(error);
        } else if (needsEmailConfirm) {
          setInfo(
            "Check your inbox — confirm your email, then come back to sign in.",
          );
        } else {
          router.replace("/port");
        }
      } else {
        const { error } = await signInWithPassword(email, password);
        if (error) {
          setError(error);
        } else {
          router.replace("/port");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    const { error } = await signInWithOAuth("google");
    if (error) {
      setError(error);
      setBusy(false);
    }
  };

  return (
    <main className="relative isolate min-h-screen w-full overflow-hidden bg-[var(--bg-0)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 left-1/2 -translate-x-1/2 size-[1100px] glow-conic opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] glow-accent"
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1100px] flex-col items-center justify-center px-6 py-16">
        <Link
          href="/pay"
          className="mb-10 flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <PlimsollMark size={28} />
          <span className="font-medium tracking-[-0.01em] text-[var(--text-mid)]">
            {BRAND.short}
          </span>
        </Link>

        <motion.div
          className="mb-10 max-w-[640px] text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--text-hi)]">
            {isSignUp ? "Build your" : "Welcome back to the"}{" "}
            <span className="accent-serif text-grad-accent">
              {isSignUp ? "cockpit" : "cockpit"}
            </span>
            .
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-mid)]">
            {isSignUp
              ? "One account to validate routes, surface compliance gaps, and replay every agent decision — with citation-grade evidence on every output."
              : "Sign in to validate routes, surface compliance gaps, and replay every agent decision."}
          </p>
        </motion.div>

        <motion.div
          className="surface-glass relative w-full max-w-[440px] rounded-2xl p-6 sm:p-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          {!configured && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-[var(--warn)]/30 bg-[var(--warn)]/10 p-3 text-[12.5px] text-[var(--warn)]">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>
                Supabase keys are missing. Set{" "}
                <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
                and{" "}
                <code className="font-mono">
                  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
                </code>{" "}
                in <code className="font-mono">frontend/.env.local</code>.
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy || !configured}
            className="flex w-full items-center justify-center gap-2.5 rounded-[var(--radius-btn)] border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--text-hi)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--bg-1)] disabled:opacity-50"
          >
            <GoogleMark className="size-4" />
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--line)]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-low)]">
              or
            </span>
            <div className="h-px flex-1 bg-[var(--line)]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <Field
                label="Full name"
                icon={<UserMark className="size-4" />}
              >
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Captain Maersk"
                  className="w-full bg-transparent text-sm font-normal text-[var(--text-hi)] outline-none placeholder:text-[var(--text-low)]"
                />
              </Field>
            )}

            <Field label="Email" icon={<Mail className="size-4" />}>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@fleet.com"
                className="w-full bg-transparent text-sm font-normal text-[var(--text-hi)] outline-none placeholder:text-[var(--text-low)]"
                required
              />
            </Field>

            <Field label="Password" icon={<Lock className="size-4" />}>
              <input
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm font-normal text-[var(--text-hi)] outline-none placeholder:text-[var(--text-low)]"
                required
                minLength={6}
              />
            </Field>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/8 p-3 text-[12.5px] text-[var(--danger)]">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {info && !error && (
              <div className="flex items-start gap-2 rounded-lg border border-[var(--accent-2)]/30 bg-[var(--accent-2)]/8 p-3 text-[12.5px] text-[var(--accent-3)]">
                <span>{info}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full"
              disabled={busy || !configured}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              {isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-5 text-center text-[13px] text-[var(--text-mid)]">
            {isSignUp ? "Already have an account?" : "New to Plimsoll?"}{" "}
            <Link
              href={isSignUp ? "/sign-in" : "/sign-up"}
              className="font-medium text-[var(--accent-2)] hover:text-[var(--accent-3)]"
            >
              {isSignUp ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </motion.div>

        <p className="mt-8 font-mono text-xs uppercase tracking-[0.14em] text-[var(--text-low)]">
          {BRAND.long} &middot; Maritime risk &middot; Compliance &middot; Hedging
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  icon,
  children,
}: React.PropsWithChildren<{ label: string; icon: React.ReactNode }>) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-low)]">
        {label}
      </span>
      <span className="flex items-center gap-2.5 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--input-background)] px-3 py-2.5 transition-colors focus-within:border-[var(--accent-2)] focus-within:ring-2 focus-within:ring-[var(--accent-2)]/20">
        <span className="text-[var(--text-low)]">{icon}</span>
        {children}
      </span>
    </label>
  );
}

function GoogleMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.16c-.27 1.42-1.07 2.62-2.28 3.43v2.85h3.69C21.7 18.65 23 15.73 23 12.27z"
      />
      <path
        fill="#34A853"
        d="M12 23c3.08 0 5.66-1.02 7.55-2.77l-3.69-2.85c-1.02.69-2.34 1.1-3.86 1.1-2.97 0-5.49-2-6.39-4.7H1.83v2.95C3.7 20.45 7.56 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.61 13.78A6.86 6.86 0 0 1 5.27 12c0-.62.11-1.22.34-1.78V7.27H1.83A11 11 0 0 0 1 12c0 1.74.42 3.39 1.83 4.73l3.78-2.95z"
      />
      <path
        fill="#EA4335"
        d="M12 5.5c1.68 0 3.18.58 4.36 1.7l3.27-3.27C17.65 1.99 15.07 1 12 1 7.56 1 3.7 3.55 1.83 7.27l3.78 2.95C6.51 7.5 9.03 5.5 12 5.5z"
      />
    </svg>
  );
}

function UserMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}


export default SignInPage;

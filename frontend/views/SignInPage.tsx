// @ts-nocheck
import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { BRAND, PlimsollMark } from '../components/Brand';

/**
 * Sign-in page.
 *
 * Single-column glass card on a dark grain background, with a soft
 * conic accent glow behind the card. Mirrors the supermemory-style
 * landing rhythm: oversized hero, serif italic accent on one word,
 * editorial whitespace.
 *
 * Note: still wired to Clerk. PRD §F2 will swap this to Supabase
 * Auth in a separate PR; the visual shell stays the same.
 */
export function SignInPage() {
  return (
    <main className="relative isolate min-h-screen w-full overflow-hidden bg-[var(--bg-0)]">
      {/* Background atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 left-1/2 -translate-x-1/2 size-[1100px] glow-conic opacity-50"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] glow-accent"
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1100px] flex-col items-center justify-center px-6 py-16">
        {/* Brand line */}
        <div className="mb-10 flex items-center gap-3">
          <PlimsollMark size={28} />
          <span className="text-[var(--text-mid)] font-medium tracking-[-0.01em]">
            {BRAND.short}
          </span>
        </div>

        {/* Editorial hero */}
        <div className="mb-12 max-w-[640px] text-center">
          <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--text-hi)]">
            Welcome to the maritime{' '}
            <span className="accent-serif text-grad-accent">cockpit</span>.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-mid)]">
            Sign in to validate routes, surface compliance gaps, and
            replay every agent decision &mdash; with citation-grade evidence
            on every output.
          </p>
        </div>

        {/* Glass auth card */}
        <div className="surface-glass relative w-full max-w-[440px] rounded-2xl p-6 sm:p-8">
          <SignIn
            routing="path"
            path="/sign-in"
            afterSignInUrl="/port"
            afterSignUpUrl="/port"
            appearance={{
              variables: {
                colorPrimary: '#7C3AED',
                colorBackground: 'transparent',
                colorInputBackground: 'rgba(255,255,255,0.03)',
                colorText: '#F5F5F7',
                colorTextSecondary: '#A1A1AA',
                colorInputText: '#F5F5F7',
                fontFamily: 'var(--font-sans)',
                borderRadius: '0.625rem',
              },
              elements: {
                rootBox: { width: '100%' },
                card: {
                  background: 'transparent',
                  boxShadow: 'none',
                  border: 'none',
                  padding: 0,
                },
                headerTitle: { color: '#F5F5F7' },
                headerSubtitle: { color: '#A1A1AA' },
                socialButtonsBlockButton: {
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(255,255,255,0.03)',
                },
                formButtonPrimary: {
                  background:
                    'linear-gradient(135deg,#A78BFA 0%,#7C3AED 50%,#4F46E5 100%)',
                  textTransform: 'none',
                  fontWeight: 500,
                  letterSpacing: '-0.005em',
                },
                footerActionText: { color: '#A1A1AA' },
                footerActionLink: { color: '#A78BFA' },
              },
            }}
          />
        </div>

        <p className="mt-8 text-xs font-mono uppercase tracking-[0.14em] text-[var(--text-low)]">
          {BRAND.long} &middot; Maritime risk &middot; Compliance &middot; Hedging
        </p>
      </div>
    </main>
  );
}

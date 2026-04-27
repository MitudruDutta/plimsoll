"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { BRAND, BrandLockup } from "../Brand";
import { Button } from "../ui/button";
import { useSupabaseAuth } from "../../context/SupabaseAuthContext";

/**
 * Marketing navbar — sticky, glass, hairline blue.
 *
 * Used only on the public landing page (`/`). On scroll the bar tightens,
 * blurs the surface behind it, and lifts a soft hairline shadow so it
 * never competes with hero content.
 */
const NAV_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Cockpit", href: "/usershome" },
  { label: "Documents", href: "/documents" },
  { label: "Demo", href: "/demo" },
  { label: "Pricing", href: "/#pricing" },
];

export const Navbar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { isSignedIn } = useSupabaseAuth();
  const [scrolled, setScrolled] = useState<boolean>(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    if (href.startsWith("/")) {
      const hashIndex = href.indexOf("#");
      if (hashIndex !== -1 && (pathname === href.slice(0, hashIndex) || (pathname === "/" && hashIndex === 0))) {
        const target = document.getElementById(href.slice(hashIndex + 1));
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
      router.push(href);
      return;
    }
    const id = href.replace("#", "");
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-[var(--line)] bg-[rgba(255,255,255,0.78)] backdrop-blur-xl supports-[backdrop-filter]:bg-[rgba(255,255,255,0.62)]"
          : "bg-transparent",
      ].join(" ")}
      style={{ height: 60 }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1400px] items-center justify-between px-5 md:px-8">
        <BrandLockup size={26} onClick={() => router.push("/")} className="shrink-0" />

        <nav className="hidden md:flex items-center gap-1 ml-2" aria-label="Primary">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className={
                  'px-3.5 py-1.5 rounded-full text-[13px] font-medium tracking-[-0.005em] transition-colors ' +
                  (active
                    ? 'bg-[rgba(37,99,235,0.10)] text-[var(--accent-3)] border border-[rgba(37,99,235,0.30)]'
                    : 'text-[var(--text-mid)] hover:text-[var(--text-hi)] border border-transparent hover:border-[var(--line)]')
                }
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 md:gap-4">
          {isSignedIn ? (
            <Button
              variant="gradient"
              size="sm"
              onClick={() => router.push("/usershome")}
            >
              Open cockpit
            </Button>
          ) : (
            <Button
              variant="gradient"
              size="sm"
              onClick={() => router.push("/sign-in")}
              aria-label={`Sign in to ${BRAND.short}`}
            >
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

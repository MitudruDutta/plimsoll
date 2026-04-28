"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Github, Linkedin, Twitter } from "lucide-react";

import { BRAND, BrandLockup } from "../Brand";

interface FooterColumn {
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}

const COLUMNS: ReadonlyArray<FooterColumn> = [
  {
    title: "Product",
    links: [
      { label: "Cockpit", href: "/usershome" },
      { label: "Demo", href: "/demo" },
      { label: "Pricing", href: "/#pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#about" },
      { label: "Careers", href: "#careers" },
      { label: "Press", href: "#press" },
      { label: "Contact", href: "#contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "#docs" },
      { label: "Changelog", href: "#changelog" },
      { label: "Status", href: "#status" },
      { label: "Security", href: "#security" },
    ],
  },
];

const SOCIAL = [
  { label: "Twitter", icon: Twitter, href: "https://twitter.com" },
  { label: "GitHub", icon: Github, href: "https://github.com" },
  { label: "LinkedIn", icon: Linkedin, href: "https://linkedin.com" },
];

export const Footer: React.FC = () => {
  const router = useRouter();

  const handleNav = (href: string) => {
    if (href.startsWith("/")) {
      router.push(href);
      return;
    }
    if (href.startsWith("#")) {
      const target = document.getElementById(href.slice(1));
      if (target) target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="relative border-t border-[var(--line)] bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 max-w-sm">
            <BrandLockup size={28} onClick={() => router.push("/")} />
            <p className="mt-4 text-[14px] leading-relaxed text-[var(--text-mid)]">
              {BRAND.tagline}
            </p>
            <div className="mt-5 flex items-center gap-2">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="flex size-9 items-center justify-center rounded-full border border-[var(--line)] text-[var(--text-mid)] transition-colors hover:border-[rgba(37,99,235,0.3)] hover:text-[var(--accent-3)]"
                >
                  <s.icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-low)]">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => handleNav(link.href)}
                      className="text-[14px] text-[var(--text-mid)] transition-colors hover:text-[var(--accent-3)]"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-[var(--line)] pt-6 text-[12px] text-[var(--text-low)] md:flex-row">
          <span>
            © {new Date().getFullYear()} {BRAND.long}. All rights reserved.
          </span>
          <div className="flex items-center gap-5">
            <button
              onClick={() => handleNav("#privacy")}
              className="hover:text-[var(--text-mid)]"
            >
              Privacy
            </button>
            <button
              onClick={() => handleNav("#terms")}
              className="hover:text-[var(--text-mid)]"
            >
              Terms
            </button>
            <button
              onClick={() => handleNav("#cookies")}
              className="hover:text-[var(--text-mid)]"
            >
              Cookies
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

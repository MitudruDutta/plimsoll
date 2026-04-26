import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "antd/dist/reset.css";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans-base",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif-base",
  weight: ["400"],
  style: ["italic", "normal"],
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-base",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Plimsoll — Maritime Risk & Compliance Cockpit",
  description:
    "Plimsoll is a maritime supply-chain risk, compliance, and hedging platform. Connect your fleet, validate your route, and get a regulator-grade verdict in real time.",
  applicationName: "Plimsoll",
  authors: [{ name: "Plimsoll AI" }],
  keywords: [
    "maritime",
    "compliance",
    "risk",
    "hedging",
    "Plimsoll",
    "shipping",
    "supply chain",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark h-full antialiased ${sans.variable} ${serif.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-[var(--bg-0)] text-[var(--text-hi)] selection:bg-[rgba(167,139,250,0.25)]"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}

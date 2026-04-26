// @ts-nocheck
import React from "react";

/**
 * Plimsoll brand surface — single source of truth.
 * Update copy / wordmark / lockup here; every header, modal, and
 * empty-state pulls from this module.
 */
export const BRAND = {
  short: "Plimsoll",
  long: "Plimsoll AI",
  tagline: "Maritime risk, compliance, and hedging — replayable.",
  product: "Plimsoll Cockpit",
} as const;

interface PlimsollMarkProps {
  size?: number;
  className?: string;
  /** Render the mark as a flat outline rather than the gradient fill. */
  ghost?: boolean;
}

/**
 * The Plimsoll mark — an abstracted load-line ring with the canonical
 * "load line" tick. Renders as an inline SVG so it scales crisply at
 * any size and respects `currentColor` when used in monochrome chips.
 */
export const PlimsollMark: React.FC<PlimsollMarkProps> = ({
  size = 28,
  className = "",
  ghost = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Plimsoll mark"
      className={className}
    >
      <defs>
        <linearGradient id="plimsoll-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="50%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <circle
        cx="16"
        cy="16"
        r="13"
        stroke={ghost ? "currentColor" : "url(#plimsoll-grad)"}
        strokeWidth="2"
        opacity={ghost ? 0.7 : 1}
      />
      <line
        x1="3"
        y1="16"
        x2="29"
        y2="16"
        stroke={ghost ? "currentColor" : "url(#plimsoll-grad)"}
        strokeWidth="2"
      />
      <line
        x1="16"
        y1="3"
        x2="16"
        y2="29"
        stroke={ghost ? "currentColor" : "url(#plimsoll-grad)"}
        strokeWidth="1.25"
        opacity="0.55"
      />
    </svg>
  );
};

interface BrandLockupProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Header / sidebar lockup: gradient mark + wordmark with tight
 * tracking. Used in CommonHeader and the marketing nav.
 */
export const BrandLockup: React.FC<BrandLockupProps> = ({
  size = 28,
  showWordmark = true,
  className = "",
  onClick,
}) => (
  <div
    className={`flex items-center gap-2.5 select-none ${onClick ? "cursor-pointer" : ""} ${className}`}
    onClick={onClick}
  >
    <PlimsollMark size={size} />
    {showWordmark && (
      <span
        className="text-[var(--text-hi)] font-semibold tracking-[-0.02em]"
        style={{ fontSize: size * 0.62 }}
      >
        {BRAND.short}
      </span>
    )}
  </div>
);

export default BrandLockup;

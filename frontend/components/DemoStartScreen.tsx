"use client";
// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Play, X, Search, ArrowRight } from 'lucide-react';
import { GlobalPort } from '../utils/routeCalculator';
import { MAJOR_PORTS as PORTS } from '../data/ports';
import { PlimsollMark } from './Brand';
import { Button } from './ui/button';

interface DemoStartScreenProps {
  onStart: (origin: GlobalPort, destination: GlobalPort) => void;
  currentOrigin?: GlobalPort | null;
  currentDestination?: GlobalPort | null;
  isChanging?: boolean;
  onCancel?: () => void;
}

/**
 * Demo intake screen — calm, editorial, dark.
 *
 * The previous design used Microsoft-blue accents and dense panels.
 * This rewrite follows `designprompt.md`:
 *   - Plimsoll mark + serif italic accent in the hero.
 *   - Two glass columns for origin / destination with hairline borders.
 *   - The selected route renders as a quiet status pill, not a card.
 *   - Single gradient CTA. No competing color signals.
 */
export function DemoStartScreen({
  onStart,
  currentOrigin,
  currentDestination,
  isChanging = false,
  onCancel,
}: DemoStartScreenProps) {
  useEffect(() => {
    console.log('[DemoStartScreen] mounted', { ports: PORTS?.length });
  }, []);

  const [origin, setOrigin] = useState<GlobalPort | null>(currentOrigin || null);
  const [destination, setDestination] = useState<GlobalPort | null>(
    currentDestination || null,
  );
  const [originSearch, setOriginSearch] = useState('');
  const [destSearch, setDestSearch] = useState('');

  const filteredOriginPorts = useMemo(() => {
    if (!originSearch.trim()) return PORTS;
    const q = originSearch.toLowerCase();
    return PORTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q),
    );
  }, [originSearch]);

  const filteredDestPorts = useMemo(() => {
    if (!destSearch.trim()) return PORTS;
    const q = destSearch.toLowerCase();
    return PORTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q),
    );
  }, [destSearch]);

  const handleStart = () => {
    if (origin && destination) onStart(origin, destination);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,10,11,0.78)] p-6 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      {/* Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] glow-accent opacity-60"
      />

      <motion.div
        className="surface-glass relative w-full max-w-3xl overflow-hidden rounded-2xl p-7 sm:p-9"
        initial={{ scale: 0.96, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Close (only when changing route mid-flight) */}
        {isChanging && onCancel && (
          <button
            onClick={onCancel}
            aria-label="Close"
            className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-[var(--text-low)] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-hi)]"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        )}

        {/* Hero */}
        <div className="mb-7 flex items-start gap-4">
          <PlimsollMark size={36} />
          <div className="flex-1 min-w-0">
            <h2 className="m-0 text-[1.65rem] font-semibold leading-tight tracking-[-0.025em] text-[var(--text-hi)]">
              {isChanging ? 'Reroute the' : 'Simulate a'}{' '}
              <span className="accent-serif text-grad-accent">crisis</span>
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--text-mid)]">
              {isChanging
                ? 'Select a new origin and destination. The cockpit will replay the agent debate against the new corridor.'
                : 'Pick an origin and destination port — the cockpit will run a five-agent crisis debate end-to-end against the route.'}
            </p>
          </div>
        </div>

        {/* Two-column port pickers */}
        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <PortColumn
            tone="origin"
            label="Origin port"
            search={originSearch}
            setSearch={setOriginSearch}
            ports={filteredOriginPorts}
            selected={origin}
            disabled={destination}
            onSelect={setOrigin}
          />
          <PortColumn
            tone="destination"
            label="Destination port"
            search={destSearch}
            setSearch={setDestSearch}
            ports={filteredDestPorts}
            selected={destination}
            disabled={origin}
            onSelect={setDestination}
          />
        </div>

        {/* Selected route summary */}
        {origin && destination && (
          <motion.div
            className="mb-5 flex items-center justify-between rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.025)] px-4 py-2.5 text-[13px]"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="size-1.5 rounded-full bg-[var(--info)]" />
              <span className="truncate text-[var(--text-hi)]">{origin.name}</span>
              <ArrowRight
                className="size-3.5 text-[var(--text-low)]"
                strokeWidth={2}
              />
              <span className="size-1.5 rounded-full bg-[var(--danger)]" />
              <span className="truncate text-[var(--text-hi)]">
                {destination.name}
              </span>
            </div>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--text-low)]">
              Crisis route armed
            </span>
          </motion.div>
        )}

        {/* CTA */}
        <Button
          variant="gradient"
          size="xl"
          className="w-full"
          disabled={!origin || !destination}
          onClick={handleStart}
        >
          <Play className="size-4" strokeWidth={2} />
          {isChanging ? 'Update crisis route' : 'Start crisis simulation'}
        </Button>

        <p className="mt-4 text-center text-[11.5px] leading-relaxed text-[var(--text-low)]">
          {isChanging
            ? 'Updating the route discards the in-flight agent debate and restarts from the planning step.'
            : 'This simulation runs against fixture data. Live AIS / sanctions feeds wire in v1.x.'}
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────── */

interface PortColumnProps {
  tone: 'origin' | 'destination';
  label: string;
  search: string;
  setSearch: (v: string) => void;
  ports: GlobalPort[];
  selected: GlobalPort | null;
  disabled: GlobalPort | null;
  onSelect: (p: GlobalPort) => void;
}

const PortColumn: React.FC<PortColumnProps> = ({
  tone,
  label,
  search,
  setSearch,
  ports,
  selected,
  disabled,
  onSelect,
}) => {
  const dot = tone === 'origin' ? 'bg-[var(--info)]' : 'bg-[var(--danger)]';

  return (
    <div className="flex min-w-0 flex-col">
      <label className="mb-2 flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.14em] text-[var(--text-mid)]">
        <MapPin className="size-3.5 text-[var(--text-low)]" strokeWidth={2} />
        {label}
      </label>

      <div className="relative mb-2">
        <Search
          className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-low)]"
          strokeWidth={2}
        />
        <input
          type="text"
          placeholder="Search port or country…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-[var(--radius-btn,0.625rem)] border border-[var(--line)] bg-[rgba(255,255,255,0.03)] py-2 pl-9 pr-3 text-[13.5px] text-[var(--text-hi)] placeholder:text-[var(--text-low)] outline-none transition-colors focus:border-[rgba(167,139,250,0.45)] focus:bg-[rgba(255,255,255,0.05)]"
        />
      </div>

      <div className="scrollbar-plimsoll max-h-[260px] space-y-1 overflow-y-auto pr-1">
        {ports.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[var(--text-low)]">
            No ports match.
          </p>
        ) : (
          ports.map((port) => {
            const isSelected = selected?.name === port.name;
            const isDisabled = disabled?.name === port.name;
            return (
              <button
                key={port.name}
                onClick={() => onSelect(port)}
                disabled={isDisabled}
                className={
                  'flex w-full items-center gap-2.5 rounded-[var(--radius-btn,0.625rem)] border px-3 py-2 text-left transition-colors ' +
                  (isSelected
                    ? 'border-[rgba(167,139,250,0.40)] bg-[rgba(124,58,237,0.10)]'
                    : 'border-[var(--line)] bg-transparent hover:border-[var(--line-strong)] hover:bg-[rgba(255,255,255,0.03)]') +
                  (isDisabled ? ' opacity-40 pointer-events-none' : '')
                }
              >
                <span className={`size-1.5 rounded-full ${dot}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] text-[var(--text-hi)]">
                    {port.name}
                  </span>
                  <span className="block truncate text-[11.5px] text-[var(--text-low)]">
                    {port.country}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

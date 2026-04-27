// @ts-nocheck
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ship, AlertTriangle, CheckCircle, Info, ChevronLeft, ChevronRight, Map } from 'lucide-react';

interface LegendItem {
  icon?: React.ReactNode;
  color: string;
  label: string;
  description?: string;
  status?: 'critical' | 'warning' | 'safe' | 'info';
}

const legendItems: LegendItem[] = [
  {
    color: '#dc2626',
    label: 'Active Risk Route',
    description: 'Primary shipping route through crisis zone',
    status: 'critical',
    icon: <AlertTriangle className="w-3 h-3" strokeWidth={2} />,
  },
  {
    color: '#d97706',
    label: 'Alternative Route',
    description: 'Backup route with moderate risk',
    status: 'warning',
  },
  {
    color: '#16a34a',
    label: 'Safe Route',
    description: 'Recommended diversion path',
    status: 'safe',
    icon: <CheckCircle className="w-3 h-3" strokeWidth={2} />,
  },
  {
    color: '#2563eb',
    label: 'Origin Port',
    description: 'Departure point',
    status: 'info',
  },
  {
    color: '#dc2626',
    label: 'Destination Port',
    description: 'Target arrival point',
    status: 'info',
  },
];

export function RouteLegend() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.div
      className="absolute bottom-6 left-6 bg-white/95 border border-[var(--line-strong)] rounded-xl flex flex-col z-20 shadow-[0_12px_28px_-12px_rgba(15,23,42,0.25)]"
      initial={{ opacity: 0, x: -20 }}
      animate={{
        opacity: 1,
        x: 0,
        width: isCollapsed ? 28 : 320
      }}
      transition={{ duration: 0.3 }}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {/* Toggle Button - always positioned inside or properly aligned */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-5 top-2 w-5 h-8 bg-white border border-l-0 border-[var(--line-strong)] rounded-r-md flex items-center justify-center text-[var(--text-mid)] hover:text-[var(--accent-3)] hover:bg-[rgba(37,99,235,0.06)] transition-colors z-30"
      >
        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Content Container */}
      <div className={`transition-opacity duration-200 overflow-hidden ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {!isCollapsed && (
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--line)]">
              <Ship className="w-4 h-4 text-[var(--accent-2)]" strokeWidth={2} />
              <h3 className="text-[11px] font-semibold text-[var(--text-mid)] uppercase tracking-[0.12em]">
                Route Legend
              </h3>
            </div>

            {/* Legend Items */}
            <div className="space-y-3">
              {legendItems.map((item, index) => (
                <motion.div
                  key={item.label}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                >
                  {/* Color indicator or icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {item.icon ? (
                      <div
                        className={`p-1 rounded-md ${
                          item.status === 'critical'
                            ? 'bg-[rgba(220,38,38,0.10)] text-[#dc2626] border border-[rgba(220,38,38,0.25)]'
                            : item.status === 'warning'
                            ? 'bg-[rgba(217,119,6,0.10)] text-[#d97706] border border-[rgba(217,119,6,0.25)]'
                            : item.status === 'safe'
                            ? 'bg-[rgba(22,163,74,0.10)] text-[#16a34a] border border-[rgba(22,163,74,0.25)]'
                            : 'bg-[rgba(37,99,235,0.10)] text-[var(--accent-2)] border border-[rgba(37,99,235,0.25)]'
                        }`}
                      >
                        {item.icon}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-0.5 rounded-full"
                          style={{
                            backgroundColor: item.color,
                            boxShadow: `0 0 8px ${item.color}40`,
                          }}
                        />
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: item.color,
                            boxShadow: `0 0 6px ${item.color}`,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Label and description */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-[var(--text-hi)] mb-0.5">
                      {item.label}
                    </div>
                    {item.description && (
                      <div className="text-[10.5px] text-[var(--text-mid)] leading-tight">
                        {item.description}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer note */}
            <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-start gap-2">
              <Info className="w-3 h-3 text-[var(--text-low)] flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-[10.5px] text-[var(--text-mid)] leading-tight">
                Real-time route analysis powered by advanced AI and geopolitical risk data
              </p>
            </div>

            {/* Pulse indicator */}
            <div className="absolute top-4 right-4">
              <motion.div
                className="w-2 h-2 rounded-full bg-[var(--accent-2)]"
                animate={{
                  opacity: [1, 0.3, 1],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Collapsed State Indicator (Vertical Text) */}
      {isCollapsed && (
        <div className="h-full flex flex-col items-center py-4 gap-4">
          <Ship className="w-4 h-4 text-[var(--accent-2)]" strokeWidth={2} />
          <div className="[writing-mode:vertical-rl] rotate-180 text-[10.5px] font-mono uppercase tracking-[0.18em] text-[var(--text-mid)] whitespace-nowrap">
            LEGEND
          </div>
        </div>
      )}
    </motion.div>
  );
}
// @ts-nocheck
import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

export type AgentStatus = 'thinking' | 'completed' | 'alert' | 'idle';

interface AIAgentCardProps {
  icon: LucideIcon;
  name: string;
  role: string;
  status: AgentStatus;
  lastAction: string;
  isAdversarial?: boolean;
}

export function AIAgentCard({
  icon: Icon,
  name,
  role,
  status,
  lastAction,
  isAdversarial = false,
}: AIAgentCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'thinking':
        return '#2563eb';
      case 'completed':
        return '#16a34a';
      case 'alert':
        return '#dc2626';
      default:
        return '#94a3b8';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'thinking':
        return 'PROCESSING';
      case 'completed':
        return 'COMPLETED';
      case 'alert':
        return 'ALERT';
      default:
        return 'IDLE';
    }
  };

  const getProgress = () => {
    switch (status) {
      case 'completed':
        return 100;
      case 'thinking':
        return 65;
      case 'alert':
        return 40;
      default:
        return 0;
    }
  };

  return (
    <motion.div
      className={`relative bg-white border ${
        isAdversarial ? 'border-[rgba(124,58,237,0.30)]' : 'border-[var(--line)]'
      } rounded-xl p-4 overflow-hidden shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_4px_14px_-10px_rgba(15,23,42,0.30)]`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Subtle glow for adversarial agent */}
      {isAdversarial && (
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(124,58,237,0.06)] to-transparent pointer-events-none" />
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="p-2 rounded-lg"
            style={{
              backgroundColor: `${getStatusColor()}14`,
              border: `1px solid ${getStatusColor()}33`,
            }}
          >
            <Icon
              className="w-5 h-5"
              style={{ color: getStatusColor() }}
              strokeWidth={2}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-semibold text-[var(--text-hi)] text-sm tracking-[-0.01em]">
                {name}
              </h3>
              <span
                className="text-[10px] font-mono tracking-[0.06em] px-2 py-0.5 rounded-full"
                style={{
                  color: getStatusColor(),
                  backgroundColor: `${getStatusColor()}14`,
                  border: `1px solid ${getStatusColor()}40`,
                }}
              >
                {getStatusText()}
              </span>
            </div>
            <p className="text-[12px] text-[var(--text-mid)]">{role}</p>
          </div>
        </div>

        {/* Status bar */}
        <div className="mb-3 h-1.5 bg-[var(--bg-2)] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: getStatusColor() }}
            initial={{ width: 0 }}
            animate={{ width: `${getProgress()}%` }}
            transition={{
              duration: status === 'thinking' ? 2 : 1,
              ease: status === 'thinking' ? 'easeInOut' : 'easeOut',
            }}
          />
        </div>

        {/* Last action */}
        <div className="text-[12.5px] text-[var(--text-mid)] leading-relaxed">
          {isAdversarial ? (
            <div className="space-y-1">
              <div className="flex items-start gap-2">
                <span className="text-[#7c3aed] font-semibold shrink-0">Challenge:</span>
                <span className="text-[var(--text-mid)]">{lastAction}</span>
              </div>
              {status === 'completed' && (
                <div className="flex items-start gap-2">
                  <span className="text-[var(--success)] font-semibold shrink-0">Resolution:</span>
                  <span className="text-[var(--text-mid)]">Validated alternative route feasibility</span>
                </div>
              )}
            </div>
          ) : (
            lastAction
          )}
        </div>

        {/* Thinking animation */}
        {status === 'thinking' && (
          <div className="flex gap-1 mt-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: getStatusColor() }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

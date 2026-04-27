// @ts-nocheck
/**
 * DebateView - Adversarial Debate Panel
 * Displays the challenge-response debate flow between AI agents
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GitBranch, 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  Shield,
  ArrowRight,
  CheckCircle,
  XCircle,
  Swords,
  LucideIcon
} from 'lucide-react';
import { RAGSourceCard } from './RAGSourceCard';

// Agent configuration
const AGENT_CONFIG: Record<string, { icon: LucideIcon; color: string; name: string }> = {
  market_sentinel: { icon: AlertTriangle, color: '#dc2626', name: 'Market Sentinel' },
  risk_hedger: { icon: TrendingUp, color: '#d97706', name: 'Risk Hedger' },
  logistics: { icon: Package, color: '#2563eb', name: 'Logistics' },
  compliance: { icon: Shield, color: '#16a34a', name: 'Compliance' },
  adversarial: { icon: GitBranch, color: '#7c3aed', name: 'Adversarial' },
};

interface RAGSource {
  document_id: string;
  title: string;
  section?: string;
  content_snippet?: string;
  relevance_score: number;
  azure_service: string;
}

interface DebateExchange {
  exchange_id: string;
  challenger_agent: string;
  defender_agent: string;
  challenge: string;
  challenge_reason: string;
  response?: string;
  resolution?: string;
  resolution_accepted?: boolean;
  sources?: RAGSource[];
}

interface DebateViewProps {
  exchanges: DebateExchange[];
  activeExchangeIndex?: number;
  phase?: 'challenge' | 'response' | 'resolve' | 'complete';
}

export function DebateView({ 
  exchanges, 
  activeExchangeIndex = 0,
  phase = 'challenge'
}: DebateViewProps) {
  if (!exchanges || exchanges.length === 0) return null;

  const currentExchange = exchanges[activeExchangeIndex];
  const challengerConfig = AGENT_CONFIG[currentExchange?.challenger_agent] || AGENT_CONFIG.adversarial;
  const defenderConfig = AGENT_CONFIG[currentExchange?.defender_agent] || AGENT_CONFIG.logistics;
  
  const ChallengerIcon = challengerConfig.icon;
  const DefenderIcon = defenderConfig.icon;

  return (
    <div className="bg-white border border-[rgba(124,58,237,0.30)] rounded-xl overflow-hidden shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_4px_14px_-10px_rgba(15,23,42,0.30)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[rgba(124,58,237,0.08)] to-transparent px-4 py-3 border-b border-[rgba(124,58,237,0.20)]">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-[#7c3aed]" />
          <h3 className="text-sm font-semibold text-[var(--text-hi)] tracking-[-0.01em]">Adversarial Debate</h3>
          <span className="text-[10.5px] text-[var(--text-low)] ml-auto">
            Exchange {activeExchangeIndex + 1} of {exchanges.length}
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Challenge (Left side - Adversarial Agent) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-4"
        >
          <div className="flex items-start gap-3">
            <div
              className="p-2 rounded-sm shrink-0"
              style={{
                backgroundColor: `${challengerConfig.color}15`,
                border: `1px solid ${challengerConfig.color}30`,
              }}
            >
              <ChallengerIcon
                className="w-4 h-4"
                style={{ color: challengerConfig.color }}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12.5px] font-semibold text-[#7c3aed]">
                  {challengerConfig.name}
                </span>
                <span className="text-[10px] font-semibold text-[#b91c1c] bg-[rgba(220,38,38,0.10)] border border-[rgba(220,38,38,0.30)] px-1.5 py-0.5 rounded-full">
                  CHALLENGE
                </span>
              </div>
              <p className="text-[12.5px] text-[var(--text-mid)] leading-relaxed">
                {currentExchange?.challenge}
              </p>
              {currentExchange?.challenge_reason && (
                <p className="text-[10.5px] text-[var(--text-low)] mt-1 italic">
                  Reason: {currentExchange.challenge_reason}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Arrow connector */}
        <div className="flex justify-center my-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: phase !== 'challenge' ? 1 : 0.3, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <ArrowRight className="w-5 h-5 text-[var(--text-low)] rotate-90" />
          </motion.div>
        </div>

        {/* Response (Right side - Defender Agent) */}
        <AnimatePresence>
          {(phase === 'response' || phase === 'resolve' || phase === 'complete') && currentExchange?.response && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 ml-6"
            >
              <div className="flex items-start gap-3">
                <div
                  className="p-2 rounded-sm shrink-0"
                  style={{
                    backgroundColor: `${defenderConfig.color}15`,
                    border: `1px solid ${defenderConfig.color}30`,
                  }}
                >
                  <DefenderIcon
                    className="w-4 h-4"
                    style={{ color: defenderConfig.color }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12.5px] font-semibold" style={{ color: defenderConfig.color }}>
                      {defenderConfig.name}
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--accent-3)] bg-[rgba(37,99,235,0.10)] border border-[rgba(37,99,235,0.30)] px-1.5 py-0.5 rounded-full">
                      RESPONSE
                    </span>
                  </div>
                  <p className="text-[12.5px] text-[var(--text-mid)] leading-relaxed">
                    {currentExchange.response}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resolution */}
        <AnimatePresence>
          {(phase === 'resolve' || phase === 'complete') && currentExchange?.resolution && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 pt-3 border-t border-[var(--line)]"
            >
              <div className="flex items-start gap-2">
                {currentExchange.resolution_accepted ? (
                  <CheckCircle className="w-4 h-4 text-[var(--success)] shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12.5px] font-semibold text-[var(--text-hi)]">Resolution</span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                        currentExchange.resolution_accepted
                          ? 'text-[#15803d] bg-[rgba(22,163,74,0.10)] border-[rgba(22,163,74,0.30)]'
                          : 'text-[#b91c1c] bg-[rgba(220,38,38,0.10)] border-[rgba(220,38,38,0.30)]'
                      }`}
                    >
                      {currentExchange.resolution_accepted ? 'ACCEPTED' : 'REJECTED'}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-[var(--text-mid)] leading-relaxed">
                    {currentExchange.resolution}
                  </p>
                  
                  {/* Sources for resolution */}
                  {currentExchange.sources && currentExchange.sources.length > 0 && (
                    <RAGSourceCard sources={currentExchange.sources} compact />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Exchange progress dots */}
        {exchanges.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4 pt-3 border-t border-[var(--line)]">
            {exchanges.map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  index === activeExchangeIndex
                    ? 'bg-[#7c3aed]'
                    : index < activeExchangeIndex
                      ? 'bg-[rgba(124,58,237,0.45)]'
                      : 'bg-[rgba(15,23,42,0.12)]'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

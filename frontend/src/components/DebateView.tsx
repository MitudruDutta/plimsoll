/**
 * DebateView - ╄? * 
 * ずAdversarial Agentgent? * €Вㄧ
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

// Agent
const AGENT_CONFIG: Record<string, { icon: LucideIcon; color: string; name: string }> = {
  market_sentinel: { icon: AlertTriangle, color: '#c94444', name: 'Market Sentinel' },
  risk_hedger: { icon: TrendingUp, color: '#c9a227', name: 'Risk Hedger' },
  logistics: { icon: Package, color: '#4a90e2', name: 'Logistics' },
  compliance: { icon: Shield, color: '#5a9a7a', name: 'Compliance' },
  adversarial: { icon: GitBranch, color: '#9b59b6', name: 'Adversarial' },
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
    <div className="bg-[#0f1621] border border-purple-500/30 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/10 to-transparent px-4 py-3 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white/90">Adversarial Debate</h3>
          <span className="text-[10px] text-white/40 ml-auto">
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
                <span className="text-xs font-medium text-purple-400">
                  {challengerConfig.name}
                </span>
                <span className="text-[10px] text-red-400/80 bg-red-500/10 px-1.5 py-0.5 rounded">
                  CHALLENGE
                </span>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                {currentExchange?.challenge}
              </p>
              {currentExchange?.challenge_reason && (
                <p className="text-[10px] text-white/40 mt-1 italic">
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
            <ArrowRight className="w-5 h-5 text-white/20 rotate-90" />
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
                    <span className="text-xs font-medium" style={{ color: defenderConfig.color }}>
                      {defenderConfig.name}
                    </span>
                    <span className="text-[10px] text-blue-400/80 bg-blue-500/10 px-1.5 py-0.5 rounded">
                      RESPONSE
                    </span>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
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
              className="mt-4 pt-3 border-t border-[#1a2332]"
            >
              <div className="flex items-start gap-2">
                {currentExchange.resolution_accepted ? (
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-white/80">Resolution</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        currentExchange.resolution_accepted
                          ? 'text-green-400/80 bg-green-500/10'
                          : 'text-red-400/80 bg-red-500/10'
                      }`}
                    >
                      {currentExchange.resolution_accepted ? 'ACCEPTED' : 'REJECTED'}
                    </span>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">
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
          <div className="flex justify-center gap-1.5 mt-4 pt-3 border-t border-[#1a2332]">
            {exchanges.map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  index === activeExchangeIndex
                    ? 'bg-purple-400'
                    : index < activeExchangeIndex
                      ? 'bg-purple-400/40'
                      : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

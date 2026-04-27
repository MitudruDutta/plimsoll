"use client";
// @ts-nocheck
/**
 * ReasoningStep - Single CoT Reasoning Step Display
 * Shows an Agent's reasoning step including:
 * - Agent identity and action type
 * - Analysis content with typewriter effect
 * - Confidence score and RAG sources
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  Shield, 
  GitBranch,
  Clock,
  Zap,
  LucideIcon
} from 'lucide-react';
import { RAGSourceCard } from './RAGSourceCard';

// Agent configuration
const AGENT_CONFIG: Record<string, { icon: LucideIcon; color: string; name: string }> = {
  market_sentinel: { icon: AlertTriangle, color: '#dc2626', name: 'Market Sentinel' },
  risk_hedger: { icon: TrendingUp, color: '#d97706', name: 'Risk Hedger' },
};

// Action label mapping
const ACTION_LABELS: Record<string, string> = {
  detect: 'DETECTING',
  analyze: 'ANALYZING',
  validate: 'VALIDATING',
  challenge: 'CHALLENGING',
  calculate: 'CALCULATING',
  search: 'SEARCHING',
  recommend: 'RECOMMENDING',
};

interface RAGSource {
  document_id: string;
  title: string;
  section?: string;
  content_snippet?: string;
  relevance_score: number;
  azure_service: string;
}

interface ReasoningStepProps {
  stepId: string;
  agentId: string;
  action: string;
  title: string;
  content: string;
  confidence: number;
  azureService: string;
  sources?: RAGSource[];
  durationMs?: number;
  isActive?: boolean;
  isComplete?: boolean;
  showTypewriter?: boolean;
}

export function ReasoningStep({
  stepId,
  agentId,
  action,
  title,
  content,
  confidence,
  azureService,
  sources = [],
  durationMs = 0,
  isActive = false,
  isComplete = false,
  showTypewriter = false,
}: ReasoningStepProps) {
  const [displayedContent, setDisplayedContent] = useState(showTypewriter ? '' : content);
  
  const agentConfig = AGENT_CONFIG[agentId] || AGENT_CONFIG.market_sentinel;
  const Icon = agentConfig.icon;
  
  // Typewriter effect
  useEffect(() => {
    if (!showTypewriter || !isActive) {
      if (!showTypewriter) setDisplayedContent(content);
      return;
    }
    
    let animationFrameId: number;
    let startTime: number | null = null;
    const charDelay = 30; // 30ms per character

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const charCount = Math.floor(elapsed / charDelay);

      if (charCount <= content.length) {
        setDisplayedContent(content.slice(0, charCount));
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayedContent(content);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [content, showTypewriter, isActive]);

  // Confidence color
  const getConfidenceColor = () => {
    if (confidence >= 0.9) return '#16a34a';
    if (confidence >= 0.8) return '#2563eb';
    if (confidence >= 0.7) return '#d97706';
    return '#dc2626';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative bg-white border rounded-xl p-4 overflow-hidden shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_4px_14px_-10px_rgba(15,23,42,0.30)] ${
        isActive
          ? 'border-[rgba(37,99,235,0.45)] shadow-[0_8px_24px_-12px_rgba(37,99,235,0.30)]'
          : isComplete
            ? 'border-[rgba(22,163,74,0.30)]'
            : 'border-[var(--line)]'
      }`}
    >
      {/* Active indicator glow */}
      {isActive && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-[rgba(37,99,235,0.06)] to-transparent pointer-events-none"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Agent icon */}
          <div
            className="p-2 rounded-lg shrink-0"
            style={{
              backgroundColor: `${agentConfig.color}14`,
              border: `1px solid ${agentConfig.color}33`,
            }}
          >
            <Icon
              className="w-4 h-4"
              style={{ color: agentConfig.color }}
              strokeWidth={2}
            />
          </div>

          {/* Title and agent info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-semibold text-[var(--text-hi)] text-sm truncate tracking-[-0.01em]">
                {title}
              </h4>
              <span
                className="text-[10px] font-mono tracking-[0.06em] px-2 py-0.5 rounded-full shrink-0"
                style={{
                  color: agentConfig.color,
                  backgroundColor: `${agentConfig.color}14`,
                  border: `1px solid ${agentConfig.color}40`,
                }}
              >
                {ACTION_LABELS[action] || action.toUpperCase()}
              </span>
            </div>
            <p className="text-[11.5px] text-[var(--text-mid)]">{agentConfig.name}</p>
          </div>
        </div>

        {/* Content */}
        <div className="text-[12.5px] text-[var(--text-mid)] leading-relaxed mb-3">
          {displayedContent}
          {showTypewriter && isActive && displayedContent.length < content.length && (
            <motion.span
              className="inline-block w-2 h-4 bg-[var(--accent-2)] ml-0.5"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </div>

        {/* Metadata row */}
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-3">
            {/* Confidence */}
            <div className="flex items-center gap-1">
              <span className="text-[var(--text-low)]">Confidence:</span>
              <span
                className="font-mono font-semibold"
                style={{ color: getConfidenceColor() }}
              >
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>

            {/* Duration */}
            {durationMs > 0 && (
              <div className="flex items-center gap-1 text-[var(--text-low)]">
                <Clock className="w-3 h-3" />
                <span>{durationMs}ms</span>
              </div>
            )}
          </div>

          {/* Azure service badge */}
          <div className="flex items-center gap-1 text-[var(--text-mid)] bg-[var(--bg-1)] border border-[var(--line)] px-2 py-1 rounded-full">
            <Zap className="w-3 h-3 text-[var(--accent-3)]" />
            <span className="text-[9px] font-semibold">{azureService}</span>
          </div>
        </div>

        {/* RAG Sources */}
        {sources.length > 0 && (
          <RAGSourceCard sources={sources} />
        )}
      </div>

      {/* Progress indicator for active step */}
      {isActive && (
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-[var(--accent-2)]"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 3, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
}

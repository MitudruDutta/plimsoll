// @ts-nocheck
/**
 * RAGSourceCard - RAG Knowledge Source Display
 * Shows retrieved documents and citations from the Agent's knowledge base
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, ExternalLink, ChevronDown, ChevronUp, Database } from 'lucide-react';

interface RAGSource {
  document_id: string;
  title: string;
  section?: string;
  content_snippet?: string;
  relevance_score: number;
  azure_service: string;
}

interface RAGSourceCardProps {
  sources: RAGSource[];
  compact?: boolean;
}

export function RAGSourceCard({ sources, compact = false }: RAGSourceCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return '#5a9a7a';
    if (score >= 0.8) return '#4a90e2';
    return '#c9a227';
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors"
      >
        <Database className="w-3 h-3" />
        <span>{sources.length} knowledge source{sources.length > 1 ? 's' : ''}</span>
        {expanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2">
              {sources.map((source, index) => (
                <motion.div
                  key={source.document_id}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-[#0a0e1a] border border-[#1a2332] rounded-sm p-3"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="w-3.5 h-3.5 text-[#4a90e2] shrink-0" />
                      <span className="text-xs font-medium text-white/80 truncate">
                        {source.title}
                      </span>
                    </div>
                    <div
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        color: getScoreColor(source.relevance_score),
                        backgroundColor: `${getScoreColor(source.relevance_score)}20`,
                      }}
                    >
                      {(source.relevance_score * 100).toFixed(0)}%
                    </div>
                  </div>

                  {/* Section */}
                  {source.section && (
                    <div className="text-[10px] text-white/40 mb-2 flex items-center gap-1">
                      <ExternalLink className="w-2.5 h-2.5" />
                      {source.section}
                    </div>
                  )}

                  {/* Content snippet */}
                  {!compact && source.content_snippet && (
                    <div className="text-[11px] text-white/50 leading-relaxed italic border-l-2 border-[#4a90e2]/30 pl-2">
                      "{source.content_snippet}"
                    </div>
                  )}

                  {/* Azure service badge */}
                  <div className="mt-2 flex items-center gap-1">
                    <span className="text-[9px] text-white/30 bg-[#1a2332] px-1.5 py-0.5 rounded">
                      {source.azure_service}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

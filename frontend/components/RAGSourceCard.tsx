"use client";
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
    if (score >= 0.9) return '#16a34a';
    if (score >= 0.8) return '#2563eb';
    return '#d97706';
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-[11.5px] font-semibold text-[var(--text-mid)] hover:text-[var(--accent-3)] transition-colors"
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
                  className="bg-[var(--bg-1)] border border-[var(--line)] rounded-lg p-3"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="w-3.5 h-3.5 text-[var(--accent-3)] shrink-0" />
                      <span className="text-[12.5px] font-semibold text-[var(--text-hi)] truncate">
                        {source.title}
                      </span>
                    </div>
                    <div
                      className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{
                        color: getScoreColor(source.relevance_score),
                        backgroundColor: `${getScoreColor(source.relevance_score)}1a`,
                      }}
                    >
                      {(source.relevance_score * 100).toFixed(0)}%
                    </div>
                  </div>

                  {/* Section */}
                  {source.section && (
                    <div className="text-[10.5px] text-[var(--text-low)] mb-2 flex items-center gap-1">
                      <ExternalLink className="w-2.5 h-2.5" />
                      {source.section}
                    </div>
                  )}

                  {/* Content snippet */}
                  {!compact && source.content_snippet && (
                    <div className="text-[11.5px] text-[var(--text-mid)] leading-relaxed italic border-l-2 border-[rgba(37,99,235,0.30)] pl-2">
                      "{source.content_snippet}"
                    </div>
                  )}

                  {/* Azure service badge */}
                  <div className="mt-2 flex items-center gap-1">
                    <span className="text-[9px] font-semibold text-[var(--text-mid)] bg-white border border-[var(--line)] px-1.5 py-0.5 rounded-full">
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

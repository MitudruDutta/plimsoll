// @ts-nocheck
import { motion } from 'motion/react';
import { Shield, CheckCircle2, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import React from 'react';

export function AzureIntegration() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      className="bg-white border border-[var(--line)] rounded-xl overflow-hidden shadow-[0_2px_6px_-2px_rgba(15,23,42,0.06)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[rgba(37,99,235,0.04)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[rgba(37,99,235,0.10)] border border-[rgba(37,99,235,0.25)] rounded-md">
            <Shield className="w-4 h-4 text-[var(--accent-2)]" strokeWidth={1.75} />
          </div>
          <span className="text-sm font-semibold text-[var(--text-hi)] tracking-[-0.005em]">
            Powered by Microsoft Azure
          </span>
        </div>

        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-mid)]" strokeWidth={1.75} />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-mid)]" strokeWidth={1.75} />
        )}
      </button>

      {/* Status indicators - Always visible */}
      <div className="px-4 pb-3 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" strokeWidth={2} />
          <span className="text-[12.5px] text-[var(--text-mid)]">All systems secure</span>
        </div>
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-[var(--success)]" strokeWidth={2} />
          <span className="text-[12.5px] text-[var(--text-mid)]">Compliance validated</span>
        </div>
      </div>

      {/* Expanded details */}
      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4 pt-2 border-t border-[var(--line)] space-y-3">
          {/* Services */}
          <div>
            <div className="text-[10.5px] font-semibold text-[var(--text-mid)] uppercase tracking-[0.12em] mb-2">
              Active Services
            </div>
            <div className="space-y-1.5">
              {[
                'Azure OpenAI Service',
                'Azure Cognitive Search',
                'Azure Monitor',
                'Azure Key Vault',
              ].map((service, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-[var(--accent-2)]" />
                  <span className="text-[12px] text-[var(--text-mid)]">{service}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance */}
          <div>
            <div className="text-[10.5px] font-semibold text-[var(--text-mid)] uppercase tracking-[0.12em] mb-2">
              Compliance
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['SOC 2', 'ISO 27001', 'GDPR', 'HIPAA'].map((cert, i) => (
                <span
                  key={i}
                  className="text-[10.5px] px-2 py-0.5 bg-[rgba(22,163,74,0.10)] text-[#15803d] border border-[rgba(22,163,74,0.30)] rounded-full font-mono font-semibold"
                >
                  {cert}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

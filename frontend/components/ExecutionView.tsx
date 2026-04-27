// @ts-nocheck
/**
 * ExecutionView - Execution Phase View Component
 *
 * Displays real-time decision execution progress:
 * - Execution steps list (pending -> executing -> complete animation)
 * - Final execution summary
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Loader2,
  CheckCircle2,
  Circle,
  Rocket,
  Ship,
  Shield,
  MapPin,
  Fuel,
  Bell,
  Zap,
} from "lucide-react";

interface ExecutionStep {
  step_id: string;
  action: string;
  title: string;
  description: string;
  azure_service: string;
  duration_ms: number;
  status?: "pending" | "executing" | "complete";
}

interface ExecutionSummary {
  total_steps: number;
  total_duration_ms: number;
  actions_completed: string[];
  final_status: string;
  risk_score_before: number;
  risk_score_after: number;
  estimated_savings: string;
}

interface ExecutionViewProps {
  steps: ExecutionStep[];
  activeStepIndex: number;
  summary?: ExecutionSummary | null;
  phase: "pending" | "executing" | "complete";
}

const getActionIcon = (action: string) => {
  switch (action) {
    case "carrier_notification":
    case "customer_notification":
      return <Bell className="w-4 h-4" />;
    case "slot_confirmation":
      return <Ship className="w-4 h-4" />;
    case "insurance_update":
      return <Shield className="w-4 h-4" />;
    case "route_activation":
      return <MapPin className="w-4 h-4" />;
    case "fuel_hedging":
      return <Fuel className="w-4 h-4" />;
    default:
      return <Zap className="w-4 h-4" />;
  }
};

export function ExecutionView({
  steps,
  activeStepIndex,
  summary,
  phase,
}: ExecutionViewProps) {
  if (phase === "pending" && steps.length === 0) {
    return (
      <div className="text-center py-8">
        <Rocket className="w-8 h-8 text-[var(--text-low)] mx-auto mb-2" />
        <p className="text-[12.5px] text-[var(--text-mid)]">
          Waiting for user confirmation...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Execution Steps List */}
      <div className="space-y-2">
        {steps.map((step, index) => {
          const isActive = index === activeStepIndex;
          const isComplete = index < activeStepIndex;
          const isPending = index > activeStepIndex;

          return (
            <motion.div
              key={step.step_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                relative p-3 rounded-xl border transition-all
                ${isActive
                  ? "bg-[rgba(37,99,235,0.06)] border-[rgba(37,99,235,0.40)]"
                  : isComplete
                    ? "bg-[rgba(22,163,74,0.06)] border-[rgba(22,163,74,0.30)]"
                    : "bg-white border-[var(--line)]"
                }
              `}
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className="mt-0.5">
                  {isComplete ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5 rounded-full bg-[var(--success)] flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </motion.div>
                  ) : isActive ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 rounded-full bg-[var(--accent-2)] flex items-center justify-center"
                    >
                      <Loader2 className="w-3 h-3 text-white" />
                    </motion.div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-[var(--line-strong)] flex items-center justify-center">
                      <Circle className="w-3 h-3 text-[var(--text-low)]" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`${isActive ? "text-[var(--accent-3)]" : isComplete ? "text-[var(--success)]" : "text-[var(--text-low)]"}`}>
                      {getActionIcon(step.action)}
                    </span>
                    <h4 className={`text-[12.5px] font-semibold ${isActive ? "text-[var(--text-hi)]" : isComplete ? "text-[var(--text-hi)]" : "text-[var(--text-mid)]"}`}>
                      {step.title}
                    </h4>
                  </div>
                  <p className={`text-[11px] ${isActive ? "text-[var(--text-mid)]" : "text-[var(--text-low)]"}`}>
                    {step.description}
                  </p>
                  {isActive && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: step.duration_ms / 1000, ease: "linear" }}
                      className="h-0.5 bg-[var(--accent-2)] mt-2 rounded-full"
                    />
                  )}
                </div>

                {/* Duration / Azure Service */}
                <div className="text-right shrink-0">
                  <span className={`text-[10.5px] font-mono font-semibold ${isComplete ? "text-[var(--success)]" : "text-[var(--text-low)]"}`}>
                    {isComplete ? `${(step.duration_ms / 1000).toFixed(1)}s` : isPending ? "Pending" : "..."}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Execution Summary */}
      <AnimatePresence>
        {phase === "complete" && summary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-gradient-to-br from-[rgba(22,163,74,0.08)] to-transparent border border-[rgba(22,163,74,0.30)] rounded-xl"
          >
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
              <h3 className="text-sm font-semibold text-[var(--text-hi)] tracking-[-0.01em]">
                Execution Complete
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white border border-[var(--line)] p-2.5 rounded-lg">
                <span className="text-[var(--text-low)] block mb-1 text-[10.5px] font-mono uppercase tracking-[0.08em]">Total Time</span>
                <span className="text-[var(--text-hi)] font-semibold">
                  {(summary.total_duration_ms / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="bg-white border border-[var(--line)] p-2.5 rounded-lg">
                <span className="text-[var(--text-low)] block mb-1 text-[10.5px] font-mono uppercase tracking-[0.08em]">Steps Completed</span>
                <span className="text-[var(--text-hi)] font-semibold">{summary.total_steps}</span>
              </div>
              <div className="bg-white border border-[var(--line)] p-2.5 rounded-lg">
                <span className="text-[var(--text-low)] block mb-1 text-[10.5px] font-mono uppercase tracking-[0.08em]">Risk Score</span>
                <span className="text-[var(--success)] font-semibold">
                  {summary.risk_score_before} → {summary.risk_score_after}
                </span>
              </div>
              <div className="bg-white border border-[var(--line)] p-2.5 rounded-lg">
                <span className="text-[var(--text-low)] block mb-1 text-[10.5px] font-mono uppercase tracking-[0.08em]">Savings</span>
                <span className="text-[var(--success)] font-semibold">
                  {summary.estimated_savings}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[var(--line)]">
              <p className="text-[10.5px] font-mono uppercase tracking-[0.10em] text-[var(--text-low)] mb-2">Actions Completed</p>
              <ul className="space-y-1">
                {summary.actions_completed.map((action, i) => (
                  <li key={i} className="text-[12px] text-[var(--text-mid)] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-[var(--success)]" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

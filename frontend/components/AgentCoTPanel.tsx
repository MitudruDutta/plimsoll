"use client";
// @ts-nocheck
﻿/**
 * AgentCoTPanel - Agent Chain-of-Thought Main Panel
 *
 * Integrated display:
 * - Real-time reasoning step stream (typewriter effect)
 * - Adversarial debate view
 * - Final decision card
 * - Execution progress view (NEW)
 *
 * Used to demonstrate transparent and traceable AI decision-making to Imagine Cup judges
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Brain,
  ListTree,
  Swords,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity,
  Rocket,
  Check,
  FileText,
  UserCog,
  AlertTriangle,
} from "lucide-react";
import { ReasoningStep } from "./ReasoningStep";
import { DebateView } from "./DebateView";
import { ExecutionView } from "./ExecutionView";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "./ui/alert-dialog";
import "../styles/reasoning.css";

// Type Definitions
interface RAGSource {
  document_id: string;
  title: string;
  section?: string;
  content_snippet?: string;
  relevance_score: number;
  azure_service: string;
}

interface CoTStep {
  step_id: string;
  agent_id: string;
  action: string;
  title: string;
  content: string;
  confidence: number;
  azure_service: string;
  sources?: RAGSource[];
  duration_ms?: number;
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

interface FinalDecision {
  decision_id: string;
  final_recommendation: string;
  recommendation_details?: {
    route_change?: string;
    additional_days?: number;
    additional_cost?: string;
    risk_reduction?: string;
    savings?: string;
  };
  total_duration_ms?: number;
  approval_options?: Array<{
    id: string;
    label: string;
    action: string;
  }>;
}

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

interface AgentCoTPanelProps {
  steps: CoTStep[];
  debates: DebateExchange[];
  decision?: FinalDecision | null;
  activeStepIndex?: number;
  activeDebateIndex?: number;
  debatePhase?: "challenge" | "response" | "resolve" | "complete";
  isActive?: boolean;
  // NEW: Execution props
  executionSteps?: ExecutionStep[];
  activeExecutionIndex?: number;
  executionPhase?: "pending" | "executing" | "complete";
  executionSummary?: ExecutionSummary | null;
  awaitingConfirmation?: boolean;
  onConfirmDecision?: (action: string) => void;
  selectedRoute?: { name: string; distance: number; estimatedTime: number; riskLevel: string; waypointNames: string[]; description: string } | null;
}

type TabType = "stream" | "debate" | "decision" | "execution";

export function AgentCoTPanel({
  steps = [],
  debates = [],
  decision = null,
  activeStepIndex = -1,
  activeDebateIndex = 0,
  debatePhase = "challenge",
  isActive = false,
  // NEW
  executionSteps = [],
  activeExecutionIndex = -1,
  executionPhase = "pending",
  executionSummary = null,
  awaitingConfirmation = false,
  onConfirmDecision,
  selectedRoute = null,
}: AgentCoTPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("stream");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto switch to debate tab
  useEffect(() => {
    if (debates.length > 0 && activeStepIndex >= steps.length - 1) {
      setActiveTab("debate");
    }
  }, [debates.length, activeStepIndex, steps.length]);

  // Auto switch to decision tab
  useEffect(() => {
    if (decision && executionSteps.length === 0) {
      setActiveTab("decision");
    }
  }, [decision, executionSteps.length]);

  // Auto switch to execution tab
  useEffect(() => {
    if (executionSteps.length > 0 || executionPhase !== "pending") {
      setActiveTab("execution");
    }
  }, [executionSteps.length, executionPhase]);

  // Auto scroll to latest step
  useEffect(() => {
    if (scrollContainerRef.current && activeStepIndex >= 0) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [activeStepIndex, steps.length]);

  const tabs: {
    id: TabType;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }[] = [
    {
      id: "stream",
      label: "Reasoning",
      icon: <ListTree className="w-3.5 h-3.5" />,
      count: steps.length,
    },
    {
      id: "debate",
      label: "Debate",
      icon: <Swords className="w-3.5 h-3.5" />,
      count: debates.length,
    },
    {
      id: "decision",
      label: "Decision",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    {
      id: "execution",
      label: "Execution",
      icon: <Rocket className="w-3.5 h-3.5" />,
      count: executionSteps.length > 0 ? executionSteps.length : undefined,
    },
  ];

  return (
    <div className="bg-[var(--bg-1)] border-b border-[var(--line)]">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className="w-4 h-4 text-[var(--accent-3)]" />
            {(isActive || executionPhase === "executing") && (
              <motion.div
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--accent-2)]"
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
          <h2 className="text-xs font-semibold text-[var(--text-mid)] tracking-wider uppercase">
            Chain-of-Thought
          </h2>
          {isActive && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--accent-3)] bg-[var(--accent-2)]/10 px-2 py-0.5 rounded-sm">
              <Activity className="w-3 h-3" />
              LIVE
            </span>
          )}
          {executionPhase === "executing" && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--warn)] bg-[var(--warn)]/10 px-2 py-0.5 rounded-sm">
              <Rocket className="w-3 h-3" />
              EXECUTING
            </span>
          )}
          {executionPhase === "complete" && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded-sm">
              <CheckCircle2 className="w-3 h-3" />
              COMPLETE
            </span>
          )}
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-[var(--text-low)]" />
        ) : (
          <ChevronUp className="w-4 h-4 text-[var(--text-low)]" />
        )}
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Tabs */}
            <div className="flex border-b border-[var(--line)]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? "text-[var(--accent-3)] border-b-2 border-[var(--accent-2)] bg-[var(--accent-2)]/5"
                      : "text-[var(--text-low)] hover:text-[var(--text-mid)]"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="text-[9px] bg-[var(--bg-2)] px-1.5 py-0.5 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Active Route Context */}
            {selectedRoute && (
              <div className="mx-4 mt-3 mb-1 p-2.5 rounded-sm border border-[var(--line)] bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedRoute.riskLevel === 'high' ? '#c94444' : selectedRoute.riskLevel === 'medium' ? '#e8a547' : '#5a9a7a' }} />
                    <span className="text-[10px] text-[var(--text-hi)] font-medium">{selectedRoute.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-mid)]">
                    <span>{selectedRoute.distance.toLocaleString()} nm</span>
                    <span>~{selectedRoute.estimatedTime}d</span>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <div
              ref={scrollContainerRef}
              className="max-h-[400px] overflow-y-auto cot-scroll-container"
            >
              {/* Reasoning Stream */}
              {activeTab === "stream" && (
                <div className="p-4 space-y-3">
                  {steps.length === 0 ? (
                    <div className="text-center py-8">
                      <Brain className="w-8 h-8 text-[rgba(15,23,42,0.20)] mx-auto mb-2" />
                      <p className="text-xs text-[var(--text-low)]">
                        Waiting for reasoning chain...
                      </p>
                    </div>
                  ) : (
                    steps.map((step, index) => (
                      <ReasoningStep
                        key={step.step_id}
                        stepId={step.step_id}
                        agentId={step.agent_id}
                        action={step.action}
                        title={step.title}
                        content={step.content}
                        confidence={step.confidence}
                        azureService={step.azure_service}
                        sources={step.sources}
                        durationMs={step.duration_ms}
                        isActive={index === activeStepIndex}
                        isComplete={index < activeStepIndex}
                        showTypewriter={index === activeStepIndex}
                      />
                    ))
                  )}
                </div>
              )}

              {/* Debate View */}
              {activeTab === "debate" && (
                <div className="p-4">
                  {debates.length === 0 ? (
                    <div className="text-center py-8">
                      <Swords className="w-8 h-8 text-[rgba(15,23,42,0.20)] mx-auto mb-2" />
                      <p className="text-xs text-[var(--text-low)]">No debates yet...</p>
                    </div>
                  ) : (
                    <DebateView
                      exchanges={debates}
                      activeExchangeIndex={activeDebateIndex}
                      phase={debatePhase}
                    />
                  )}
                </div>
              )}

              {/* Decision View */}
              {activeTab === "decision" && (
                <div className="p-4">
                  {!decision ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-8 h-8 text-[rgba(15,23,42,0.20)] mx-auto mb-2" />
                      <p className="text-xs text-[var(--text-low)]">
                        Decision pending...
                      </p>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-br from-[#5a9a7a]/10 to-transparent border border-[var(--success)]/30 rounded-sm p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                        <h3 className="text-sm font-semibold text-[var(--text-hi)]">
                          Recommended Action
                        </h3>
                      </div>

                      <p className="text-lg font-medium text-[var(--text-hi)] mb-4">
                        {decision.final_recommendation}
                      </p>

                      {decision.recommendation_details && (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {decision.recommendation_details.route_change && (
                            <div className="bg-[var(--bg-1)] p-2 rounded-sm">
                              <span className="text-[var(--text-low)] block mb-1">
                                Route
                              </span>
                              <span className="text-[var(--text-hi)]">
                                {decision.recommendation_details.route_change}
                              </span>
                            </div>
                          )}
                          {decision.recommendation_details.additional_days && (
                            <div className="bg-[var(--bg-1)] p-2 rounded-sm">
                              <span className="text-[var(--text-low)] block mb-1">
                                Extra Days
                              </span>
                              <span className="text-[var(--text-hi)]">
                                +
                                {
                                  decision.recommendation_details
                                    .additional_days
                                }
                              </span>
                            </div>
                          )}
                          {decision.recommendation_details.additional_cost && (
                            <div className="bg-[var(--bg-1)] p-2 rounded-sm">
                              <span className="text-[var(--text-low)] block mb-1">
                                Cost
                              </span>
                              <span className="text-[var(--text-hi)]">
                                {
                                  decision.recommendation_details
                                    .additional_cost
                                }
                              </span>
                            </div>
                          )}
                          {decision.recommendation_details.savings && (
                            <div className="bg-[var(--bg-1)] p-2 rounded-sm">
                              <span className="text-[var(--text-low)] block mb-1">
                                Savings
                              </span>
                              <span className="text-[var(--success)] font-medium">
                                {decision.recommendation_details.savings}
                              </span>
                            </div>
                          )}
                          {decision.recommendation_details.risk_reduction && (
                            <div className="bg-[var(--bg-1)] p-2 rounded-sm col-span-2">
                              <span className="text-[var(--text-low)] block mb-1">
                                Risk Reduction
                              </span>
                              <span className="text-[var(--success)] font-medium">
                                {decision.recommendation_details.risk_reduction}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {decision.total_duration_ms && (
                        <div className="mt-4 pt-3 border-t border-[var(--line)] text-center">
                          <span className="text-[10px] text-[var(--text-low)]">
                            Decision made in{" "}
                            {(decision.total_duration_ms / 1000).toFixed(1)}s
                          </span>
                        </div>
                      )}

                      {/* Human-in-the-Loop Confirmation Buttons */}
                      {onConfirmDecision && awaitingConfirmation && executionPhase === "pending" && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 pt-4 border-t border-[var(--line)]"
                        >
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-[var(--warn)] animate-pulse" />
                            <p className="text-[10px] text-[var(--warn)] font-medium uppercase tracking-wider">
                              Human Approval Required
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {/* Approve with confirmation dialog */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  className="flex-1 flex items-center justify-center gap-2 py-2.5 min-h-[44px] bg-[var(--success)] hover:bg-[#0e7a3a] text-white text-xs font-medium rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#5a9a7a]/50"
                                >
                                  <Check className="w-4 h-4" />
                                  Approve & Execute
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-white border-[var(--line)] text-[var(--text-hi)]">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2 text-[var(--text-hi)]">
                                    <AlertTriangle className="w-5 h-5 text-[var(--warn)]" />
                                    Confirm Route Change Execution
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-[var(--text-mid)]">
                                    This action will:
                                    <ul className="mt-2 ml-4 space-y-1 list-disc text-[var(--text-mid)]">
                                      <li>Notify the vessel captain of the route change</li>
                                      <li>Update shipping schedules and documentation</li>
                                      <li>Trigger automated compliance checks</li>
                                      <li>Send customer notifications with new ETA</li>
                                    </ul>
                                    <p className="mt-3 text-[var(--warn)]">
                                      This action cannot be easily undone once execution begins.
                                    </p>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-[var(--bg-2)] text-[var(--text-mid)] border-[var(--line)] hover:bg-[rgba(37,99,235,0.10)] hover:text-white">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => onConfirmDecision("approve")}
                                    className="bg-[var(--success)] hover:bg-[#0e7a3a] text-[var(--text-hi)]"
                                  >
                                    <Check className="w-4 h-4 mr-2" />
                                    Confirm & Execute
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            
                            <button
                              onClick={() => onConfirmDecision("details")}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 min-h-[44px] bg-[var(--bg-2)] hover:bg-[rgba(37,99,235,0.10)] text-[var(--text-mid)] text-xs font-medium rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#4a90e2]/50"
                            >
                              <FileText className="w-4 h-4" />
                              Details
                            </button>
                            
                            {/* Override with confirmation dialog */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  className="flex-1 flex items-center justify-center gap-2 py-2.5 min-h-[44px] bg-[var(--danger)] hover:bg-[#b91c1c] text-white text-xs font-medium rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#c75050]/50"
                                >
                                  <UserCog className="w-4 h-4" />
                                  Override
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-white border-[var(--line)] text-[var(--text-hi)]">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2 text-[var(--text-hi)]">
                                    <AlertTriangle className="w-5 h-5 text-[var(--danger)]" />
                                    Manual Override
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-[var(--text-mid)]">
                                    You are about to override the AI recommendation.
                                    <p className="mt-2 text-[var(--danger)]">
                                      This will bypass the suggested route change and require manual decision-making.
                                    </p>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-[var(--bg-2)] text-[var(--text-mid)] border-[var(--line)] hover:bg-[rgba(37,99,235,0.10)] hover:text-white">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => onConfirmDecision("manual")}
                                    className="bg-[var(--danger)] hover:bg-[#b91c1c] text-[var(--text-hi)]"
                                  >
                                    <UserCog className="w-4 h-4 mr-2" />
                                    Confirm Override
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              {/* Execution View - NEW */}
              {activeTab === "execution" && (
                <div className="p-4">
                  <ExecutionView
                    steps={executionSteps}
                    activeStepIndex={activeExecutionIndex}
                    summary={executionSummary}
                    phase={executionPhase}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

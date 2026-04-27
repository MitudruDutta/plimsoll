// @ts-nocheck
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useWebSocket } from '../services/websocket';

import { GlobalMap2D } from '../components/GlobalMap2D';
import { GlobalMap3D } from '../components/GlobalMap3D';
import { RouteSelector } from '../components/RouteSelector';
import { CrisisTimeline } from '../components/CrisisTimeline';
import { DemoStartScreen } from '../components/DemoStartScreen';

import { AzureBadges } from '../components/AzureBadges';
import { AgentWorkflow } from '../components/AgentWorkflow';
import { AgentCoTPanel } from '../components/AgentCoTPanel';
import { VisualRiskPanel } from '../components/VisualRiskPanel';
import { CompliancePanel } from '../components/CompliancePanel';

import { Route, GlobalPort, calculateRoutes } from '../utils/routeCalculator';
import { Ship } from '../utils/shipData';
import { ShipDetailsCard } from '../components/ShipDetailsCard';
import { Home, Globe, Map, RefreshCw, Shield, Brain, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Keyboard, X, Activity, Eye } from 'lucide-react';
import { useHeader } from '../context/HeaderContext';

// Keyboard shortcuts configuration
const KEYBOARD_SHORTCUTS = [
  { key: 'v', action: 'Toggle 2D/3D view', label: 'V' },
  { key: 'r', action: 'Focus route selector', label: 'R' },
  { key: 'a', action: 'Toggle AI panel', label: 'A' },
  { key: 'Escape', action: 'Close dialogs/panels', label: 'Esc' },
  { key: '?', action: 'Show keyboard shortcuts', label: '?' },
];

const SIDEBAR_TAB_THEME = {
  intelligence: { accent: '#4a90e2', activeBg: 'rgba(74, 144, 226, 0.16)', border: 'rgba(74, 144, 226, 0.34)' },
  agents: { accent: '#2dd4bf', activeBg: 'rgba(45, 212, 191, 0.16)', border: 'rgba(45, 212, 191, 0.34)' },
  risk: { accent: '#c084fc', activeBg: 'rgba(192, 132, 252, 0.16)', border: 'rgba(192, 132, 252, 0.34)' },
  compliance: { accent: '#f59e0b', activeBg: 'rgba(245, 158, 11, 0.16)', border: 'rgba(245, 158, 11, 0.34)' },
} as const;

import {
  MarketSentinelResponse,
  runSimpleAnalysis,
  runAnalysis,
  createLaneWatchlist
} from '../services/marketSentinel';

import {
  RiskAssessment,
  HedgeRecommendation,
  assessRisk,
  recommendStrategy,
  DEFAULT_OPERATION_PARAMS,
} from '../services/hedgeApi';

import {
  getDemoAnalysis,
} from '../services/visualRiskApi';

// CoT Type Definitions
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

// Execution types (NEW)
interface ExecutionStep {
  step_id: string;
  action: string;
  title: string;
  description: string;
  azure_service: string;
  duration_ms: number;
  status?: 'pending' | 'executing' | 'complete';
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

import { useLocation, useNavigate } from 'react-router-dom';
// ...
import { MAJOR_PORTS } from '../data/ports';

// ... (inside DemoPage component)
export const DemoPage: React.FC = () => {
  const { connect, events, send } = useWebSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const [demoStarted, setDemoStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const [origin, setOrigin] = useState<GlobalPort | null>(null);
  const [destination, setDestination] = useState<GlobalPort | null>(null);

  const [is3D, setIs3D] = useState(false);
  const [isChangingRoute, setIsChangingRoute] = useState(false);

  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedShip, setSelectedShip] = useState<Ship | null>(null);

  // === Market Sentinel State ===
  const [marketSentinelData, setMarketSentinelData] = useState<MarketSentinelResponse | null>(null);
  const [marketSentinelLoading, setMarketSentinelLoading] = useState(false);
  const [marketSentinelError, setMarketSentinelError] = useState<string | null>(null);

  // === Risk Hedger State ===
  const [hedgeRiskData, setHedgeRiskData] = useState<RiskAssessment | null>(null);
  const [hedgeRecommendation, setHedgeRecommendation] = useState<HedgeRecommendation | null>(null);
  const [hedgeLoading, setHedgeLoading] = useState(false);
  const [hedgeError, setHedgeError] = useState<string | null>(null);

  // === CoT State Management ===
  const [cotSteps, setCotSteps] = useState<CoTStep[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [debates, setDebates] = useState<DebateExchange[]>([]);
  const [activeDebateIndex, setActiveDebateIndex] = useState(0);
  const [debatePhase, setDebatePhase] = useState<'challenge' | 'response' | 'resolve' | 'complete'>('challenge');
  const [finalDecision, setFinalDecision] = useState<FinalDecision | null>(null);
  const [isCotActive, setIsCotActive] = useState(false);

  // === Execution State (NEW) ===
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [activeExecutionIndex, setActiveExecutionIndex] = useState(-1);
  const [executionPhase, setExecutionPhase] = useState<'pending' | 'executing' | 'complete'>('pending');
  const [executionSummary, setExecutionSummary] = useState<ExecutionSummary | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  // === Visual Risk State (NEW) ===
  const [visualRiskAnalyzing, setVisualRiskAnalyzing] = useState(false);
  const [visualRiskSource, setVisualRiskSource] = useState('');
  const [visualRiskLocation, setVisualRiskLocation] = useState('');
  const [visualRiskAnalysis, setVisualRiskAnalysis] = useState<any>(null);

  // === Keyboard Shortcuts State ===
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // === Sidebar Tab State ===
  const [sidebarTab, setSidebarTab] = useState<'intelligence' | 'agents' | 'risk' | 'compliance'>('intelligence');

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Shift+? to show keyboard shortcuts
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowKeyboardHelp(prev => !prev);
        return;
      }

      // Escape to close panels/dialogs
      if (e.key === 'Escape') {
        setShowKeyboardHelp(false);
        setSelectedShip(null);
        return;
      }

      // V to toggle 2D/3D view
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setIs3D(prev => !prev);
        return;
      }

      // A to toggle AI/CoT panel
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setIsCotActive(prev => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // === Resizable Right Sidebar ===
  const [sidebarWidth, setSidebarWidth] = useState(420);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const isResizing = useRef(false);
  const minWidth = 320;
  const maxWidth = 600;

  // === Resizable Bottom Panel ===
  const [bottomHeight, setBottomHeight] = useState(220);
  const [isBottomCollapsed, setIsBottomCollapsed] = useState(false);
  const isResizingBottom = useRef(false);
  const minBottomHeight = 120;
  const maxBottomHeight = 400;
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    if (isRightCollapsed) return;
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [isRightCollapsed]);

  const handleBottomMouseDown = useCallback(() => {
    if (isBottomCollapsed) return;
    isResizingBottom.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [isBottomCollapsed]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(Math.min(maxWidth, Math.max(minWidth, newWidth)));
    }
    if (isResizingBottom.current && mapContainerRef.current) {
      const containerRect = mapContainerRef.current.getBoundingClientRect();
      const newHeight = containerRect.bottom - e.clientY;
      setBottomHeight(Math.min(maxBottomHeight, Math.max(minBottomHeight, newHeight)));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    isResizingBottom.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Auto-start logic
  useEffect(() => {
    if (!demoStarted) {
      // Check for state from navigation or use defaults
      const stateOrigin = location.state?.origin;
      const stateDestination = location.state?.destination;

      const defaultOrigin = MAJOR_PORTS.find(p => p.name === 'Shanghai') || MAJOR_PORTS[0];
      const defaultDestination = MAJOR_PORTS.find(p => p.name === 'Rotterdam') || MAJOR_PORTS[1];

      handleStartDemo(stateOrigin || defaultOrigin, stateDestination || defaultDestination);
    }
  }, []); // Run once on mount

  // === Time Animation Loop ===
  useEffect(() => {
    if (!demoStarted) return;

    // Use setInterval for integer-level updates (more stable than high-freq RAF)
    const intervalId = setInterval(() => {
      setCurrentTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [demoStarted]);

  // === WebSocket Event Handling ===
  useEffect(() => {
    if (events.length === 0) return;
    const lastEvent = events[events.length - 1];
    console.log('Processing Event:', lastEvent.type, lastEvent);

    switch (lastEvent.type) {
      // --- CoT Events ---
      case 'COT_START':
        setIsCotActive(true);
        setCotSteps([]);
        setActiveStepIndex(-1);
        break;

      case 'COT_STEP':
        setCotSteps(prev => {
          // Avoid duplicates if using React.StrictMode or re-renders
          if (prev.find(s => s.step_id === lastEvent.data.step_id)) return prev;
          return [...prev, lastEvent.data];
        });
        setActiveStepIndex(lastEvent.step_index);
        break;

      case 'RAG_CITATION':
        // Update the corresponding step with sources
        setCotSteps(prev => prev.map(step => {
          if (step.step_id === lastEvent.step_id || step.agent_id === lastEvent.agent_id) {
            return {
              ...step,
              sources: lastEvent.sources
            };
          }
          return step;
        }));
        break;

      // --- Debate Events ---
      case 'DEBATE_START':
        setDebatePhase('challenge');
        setDebates([]);
        break;

      case 'DEBATE_CHALLENGE':
        setDebates(prev => [...prev, {
          exchange_id: lastEvent.data.exchange_id,
          challenger_agent: lastEvent.data.challenger,
          defender_agent: lastEvent.data.defender,
          challenge: lastEvent.data.challenge,
          challenge_reason: lastEvent.data.reason
        }]);
        setActiveDebateIndex(lastEvent.exchange_index);
        setDebatePhase('challenge');
        break;

      case 'DEBATE_RESPONSE':
        setDebates(prev => prev.map(ex => {
          if (ex.exchange_id === lastEvent.data.exchange_id) {
            return { ...ex, response: lastEvent.data.response };
          }
          return ex;
        }));
        setDebatePhase('response');
        break;

      case 'DEBATE_RESOLVE':
        setDebates(prev => prev.map(ex => {
          if (ex.exchange_id === lastEvent.data.exchange_id) {
            return {
              ...ex,
              resolution: lastEvent.data.resolution,
              resolution_accepted: lastEvent.data.accepted,
              sources: lastEvent.data.sources
            };
          }
          return ex;
        }));
        setDebatePhase('resolve');
        break;

      // --- Decision Events ---
      case 'DECISION_READY':
        setFinalDecision({
          decision_id: lastEvent.data.decision_id || 'dec-001',
          final_recommendation: lastEvent.data.final_recommendation,
          recommendation_details: lastEvent.data.recommendation_details,
          total_duration_ms: lastEvent.data.total_duration_ms,
          approval_options: lastEvent.data.approval_options
        });
        break;

      case 'AWAITING_CONFIRMATION':
        setAwaitingConfirmation(true);
        break;

      case 'CONFIRMATION_RECEIVED':
        setAwaitingConfirmation(false);
        break;

      // --- Execution Events ---
      case 'EXECUTION_START':
        setExecutionPhase('executing');
        setExecutionSteps([]);
        break;

      case 'EXECUTION_STEP':
        setExecutionSteps(prev => {
          if (prev.find(s => s.step_id === lastEvent.data.step_id)) return prev;
          return [...prev, lastEvent.data];
        });
        setActiveExecutionIndex(lastEvent.step_index);
        break;

      case 'EXECUTION_STEP_COMPLETE':
        setExecutionSteps(prev => prev.map(step => {
          if (step.step_id === lastEvent.step_id) {
            return { ...step, status: 'complete' };
          }
          return step;
        }));
        break;

      case 'EXECUTION_COMPLETE':
        setExecutionPhase('complete');
        setExecutionSummary(lastEvent.data);
        break;

      case 'DEMO_COMPLETE':
        // Optional: Show final summary modal or notification
        console.log("Demo Sequence Completed", lastEvent.summary);
        break;

      // --- Visual Risk Events (NEW) ---
      case 'VISUAL_RISK_START':
        setVisualRiskAnalyzing(true);
        setVisualRiskSource(lastEvent.source || 'Satellite Feed');
        setVisualRiskLocation(lastEvent.location || '');
        setVisualRiskAnalysis(null);
        break;

      case 'VISUAL_RISK_RESULT':
        setVisualRiskAnalyzing(false);
        setVisualRiskAnalysis(lastEvent.analysis);
        break;
    }
  }, [events]);

  const scenarioPhase = useMemo(() => {
    const t = currentTime % 60;
    if (t < 5) return 'Monitoring pre-incident';
    if (t < 15) return 'Detection & validation';
    if (t < 25) return 'Threat confirmation';
    if (t < 35) return 'Response orchestration';
    if (t < 45) return 'Reroute & mitigation';
    return 'Stabilization & review';
  }, [currentTime]);

  const startBackendDemo = async () => {
    try {
      const response = await fetch('/api/demo/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: 'crisis_455pm' }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.websocket_url) connect(data.websocket_url);
      } else {
        console.warn('Backend not ready, running in UI-only mode');
      }
    } catch (e) {
      console.warn('Backend unreachable, running in UI-only mode', e);
    }
  };

  const handleStartDemo = async (originPort: GlobalPort, destinationPort: GlobalPort) => {
    setOrigin(originPort);
    setDestination(destinationPort);

    setDemoStarted(true);
    // ... (rest of reset logic)
    setIsChangingRoute(false);

    // Calculate dynamic routes immediately
    const newRoutes = calculateRoutes(originPort.coordinates, destinationPort.coordinates);
    setRoutes(newRoutes);
    // Select the first route (usually fastest) by default
    if (newRoutes.length > 0) {
      setSelectedRoute(newRoutes[0]);
    } else {
      setSelectedRoute(null);
    }

    // Reset CoT state
    setCotSteps([]);
    setActiveStepIndex(-1);
    setDebates([]);
    setActiveDebateIndex(0);
    setDebatePhase('challenge');
    setFinalDecision(null);
    setIsCotActive(false);
    setSelectedShip(null);

    // Reset Hedge state
    setHedgeRiskData(null);
    setHedgeRecommendation(null);
    setHedgeLoading(false);
    setHedgeError(null);

    // Reset Execution state (NEW)
    setExecutionSteps([]);
    setActiveExecutionIndex(-1);
    setExecutionPhase('pending');
    setExecutionSummary(null);
    setAwaitingConfirmation(false);

    // Reset Visual Risk state (NEW)
    setVisualRiskAnalyzing(false);
    setVisualRiskSource('');
    setVisualRiskLocation('');
    setVisualRiskAnalysis(null);

    setCurrentTime(0);

    await startBackendDemo();
  };

  // ...

  // Handle user confirmation of decision (NEW)
  const handleConfirmDecision = async (action: string) => {
    console.log('[Decision Confirmation] User clicked:', action);
    // WebSocket
    // 
    const message = {
      action: "confirm",
      confirmation_type: action
    };
    console.log('[Decision Confirmation] Sending message:', message);
    send(message);
    console.log('[Decision Confirmation] Message sent');
  };

  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);
  };

  // Run Market Sentinel analysis
  const runMarketSentinel = useCallback(async () => {
    if (marketSentinelLoading) return; // Prevent double clicks

    setMarketSentinelLoading(true);
    setMarketSentinelError(null);

    // Safety timeout to ensure loading state is reset
    const timeoutId = setTimeout(() => {
      setMarketSentinelLoading(false);
    }, 8000);

    try {
      let response: MarketSentinelResponse;

      // If we have origin/destination, run with lane watchlist
      if (origin && destination) {
        // Extract port codes from names (e.g., "Shanghai" -> "CNSHA")
        const originCode = getPortCode(origin.name);
        const destinationCode = getPortCode(destination.name);

        if (originCode && destinationCode) {
          // Include route waypoint context if a route is selected
          const routeEntities: string[] = [];
          if (selectedRoute?.waypointNames) {
            selectedRoute.waypointNames.forEach(wp => {
              const code = getPortCode(wp);
              if (code) routeEntities.push(`Port of ${wp}`);
            });
          }
          const params = createLaneWatchlist(originCode, destinationCode, ['general cargo'], routeEntities);
          response = await runAnalysis(params);
        } else {
          response = await runSimpleAnalysis();
        }
      } else {
        response = await runSimpleAnalysis();
      }

      clearTimeout(timeoutId); // Clear safety timeout on success
      setMarketSentinelData(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setMarketSentinelError(errorMessage);
      console.error('Market Sentinel error:', err);
    } finally {
      clearTimeout(timeoutId);
      setMarketSentinelLoading(false);
    }
  }, [origin, destination, selectedRoute, marketSentinelLoading]);

  // Run Hedge Analysis (assess risk + recommend strategy)
  const runHedgeAnalysis = useCallback(async () => {
    if (hedgeLoading) return;

    setHedgeLoading(true);
    setHedgeError(null);

    const timeoutId = setTimeout(() => {
      setHedgeLoading(false);
    }, 12000);

    try {
      const routeName = selectedRoute
        ? selectedRoute.name
        : origin && destination
          ? `${origin.name} → ${destination.name}`
          : DEFAULT_OPERATION_PARAMS.current_route;

      const params = {
        ...DEFAULT_OPERATION_PARAMS,
        current_route: routeName,
      };

      // Step 1: Assess risk
      const riskData = await assessRisk(params);
      setHedgeRiskData(riskData);

      // Step 2: Recommend strategy (auto-detect crisis from market)
      const isCrisis = riskData.urgency === 'CRITICAL' || riskData.market_regime === 'crisis';
      const recommendation = await recommendStrategy(params, isCrisis);
      setHedgeRecommendation(recommendation);

      clearTimeout(timeoutId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setHedgeError(errorMessage);
      console.error('Hedge analysis error:', err);
    } finally {
      clearTimeout(timeoutId);
      setHedgeLoading(false);
    }
  }, [origin, destination, selectedRoute, hedgeLoading]);

  // Auto-trigger hedge analysis when Market Sentinel detects HIGH/CRITICAL
  useEffect(() => {
    if (!marketSentinelData?.signal_packet) return;
    const severity = marketSentinelData.signal_packet.severity;
    if ((severity === 'HIGH' || severity === 'CRITICAL') && !hedgeRiskData && !hedgeLoading) {
      runHedgeAnalysis();
    }
  }, [marketSentinelData]);

  // Run Visual Risk Analysis on demand (REST API)
  const runVisualRiskAnalysis = useCallback(async (scenario: string = 'suez_blockage') => {
    if (visualRiskAnalyzing) return;

    setVisualRiskAnalyzing(true);
    setVisualRiskSource('Satellite Feed');
    setVisualRiskLocation(scenario === 'port_congestion' ? 'Rotterdam Port' : 'Suez Canal');
    setVisualRiskAnalysis(null);

    try {
      const result = await getDemoAnalysis(scenario);
      setVisualRiskAnalysis(result.analysis);
    } catch (err) {
      console.error('Visual risk analysis error:', err);
      setVisualRiskAnalysis(null);
    } finally {
      setVisualRiskAnalyzing(false);
    }
  }, [visualRiskAnalyzing]);

  // Helper to convert port names to codes
  const getPortCode = (portName: string): string | null => {
    const portCodes: Record<string, string> = {
      'Shanghai': 'CNSHA',
      'Singapore': 'SGSIN',
      'Rotterdam': 'NLRTM',
      'Los Angeles': 'USLAX',
      'Long Beach': 'USLGB',
      'Hong Kong': 'HKHKG',
      'Shenzhen': 'CNSZX',
      'Busan': 'KRPUS',
      'Hamburg': 'DEHAM',
      'Antwerp': 'BEANR',
      'Dubai': 'AEJEA',
      'Mumbai': 'INBOM',
      'Tokyo': 'JPTYO',
      'New York': 'USNYC',
      'Felixstowe': 'GBFXT',
      'Colombo': 'LKCMB',
      'Tanjung Pelepas': 'MYTPP',
      'Port Klang': 'MYPKG',
    };
    return portCodes[portName] || null;
  };

  // Header Integration
  const { setSubtitle, setExtraContent, resetHeader } = useHeader();

  useEffect(() => {
    if (demoStarted) {
      setSubtitle(`${origin?.name} → ${destination?.name} · T+${currentTime.toFixed(0)}s · ${scenarioPhase}`);

      setExtraContent(
        <div className="flex items-center gap-2.5">
          {isCotActive && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-[rgba(37,99,235,0.32)] bg-[rgba(37,99,235,0.10)] animate-pulse">
              <Brain className="w-3.5 h-3.5 text-[#1d4ed8]" strokeWidth={2.2} />
              <span className="text-[11.5px] font-semibold tracking-[-0.005em] text-[#1d4ed8]">CoT Active</span>
            </div>
          )}

          <button
            onClick={() => setIsChangingRoute(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[var(--text-hi)] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_8px_18px_-12px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-px hover:border-[rgba(37,99,235,0.45)] hover:text-[var(--accent-3)]"
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.2} />
            Change Route
          </button>

          <div className="inline-flex items-center gap-0.5 rounded-full border border-[var(--line-strong)] bg-white p-0.5 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_8px_18px_-12px_rgba(15,23,42,0.35)]">
            <button
              onClick={() => setIs3D(false)}
              aria-pressed={!is3D}
              className={
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold transition-all ' +
                (!is3D
                  ? 'bg-[var(--accent-2)] text-white shadow-[0_4px_12px_-4px_rgba(37,99,235,0.55)]'
                  : 'text-[var(--text-mid)] hover:text-[var(--text-hi)]')
              }
            >
              <Map className="w-3.5 h-3.5" strokeWidth={2.2} />
              2D
            </button>
            <button
              onClick={() => setIs3D(true)}
              aria-pressed={is3D}
              className={
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold transition-all ' +
                (is3D
                  ? 'bg-[var(--accent-2)] text-white shadow-[0_4px_12px_-4px_rgba(37,99,235,0.55)]'
                  : 'text-[var(--text-mid)] hover:text-[var(--text-hi)]')
              }
            >
              <Globe className="w-3.5 h-3.5" strokeWidth={2.2} />
              3D
            </button>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(22,163,74,0.30)] bg-[rgba(22,163,74,0.10)] px-3 py-1.5">
            <span className="size-1.5 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-[11.5px] font-semibold text-[#15803d]">System Running</span>
          </div>
        </div>
      );
    }
    return () => resetHeader();
  }, [demoStarted, currentTime, scenarioPhase, isCotActive, is3D, origin, destination]);

  if (!demoStarted) {
    return <DemoStartScreen onStart={handleStartDemo} />;
  }

  return (
    <div className="demo-page h-screen max-h-screen bg-[#eef3fa] text-[var(--text-hi)] overflow-hidden flex flex-col">
      {/* Page-scoped typography reset to avoid global base button/label styles affecting alignment */}
      <style>{`
        .demo-page button { font-size: 0.75rem; line-height: 1rem; }
        .demo-page label  { font-size: 0.75rem; line-height: 1rem; }
      `}</style>

      {/* Route Change Modal */}
      {isChangingRoute && (
        <DemoStartScreen
          onStart={handleStartDemo}
          currentOrigin={origin}
          currentDestination={destination}
          isChanging={true}
          onCancel={() => setIsChangingRoute(false)}
        />
      )}

      {/* Header is now provided by CommonHeader in App.jsx for unified design */}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Map section */}
        <div ref={mapContainerRef} className="flex-1 flex flex-col relative min-h-0 overflow-hidden">
          <div className="flex-1 relative min-h-0 overflow-hidden">
            {/* Route Selector */}
            {routes.length > 0 && (
              <RouteSelector routes={routes} selectedRoute={selectedRoute} onRouteSelect={handleRouteSelect} />
            )}

            {is3D ? (
              <GlobalMap3D
                origin={origin || undefined}
                destination={destination || undefined}
                routes={routes}
                onRouteSelect={handleRouteSelect}
                selectedRouteFromParent={selectedRoute}
              />
            ) : (
              <GlobalMap2D
                origin={origin || undefined}
                destination={destination || undefined}
                routes={routes}
                onRouteSelect={handleRouteSelect}
                selectedRouteFromParent={selectedRoute}
                currentTime={currentTime}
                onShipSelect={setSelectedShip}
              />

            )}


          </div>

          {/* Resize Handle for Bottom Panel */}
          <div
            className="h-1.5 cursor-row-resize transition-colors z-10 group flex items-center justify-center relative bg-[var(--line)]"
            onMouseDown={handleBottomMouseDown}
          >
            <div className="w-16 h-1 bg-[var(--line-strong)] group-hover:bg-[var(--accent-2)] rounded-full transition-colors" />

            {/* Bottom Collapse Button */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent drag start
                setIsBottomCollapsed(!isBottomCollapsed);
              }}
              aria-label={isBottomCollapsed ? 'Expand timeline' : 'Collapse timeline'}
              className="absolute right-4 -top-3 w-7 h-5 bg-white rounded-t-md flex items-center justify-center text-[var(--text-mid)] hover:text-[var(--accent-3)] hover:bg-white transition-colors z-20 border border-b-0 border-[var(--line-strong)] shadow-[0_-4px_10px_-6px_rgba(15,23,42,0.18)]"
            >
              {isBottomCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Timeline */}
          <div
            className="shrink-0 transition-all duration-300 ease-in-out border-t border-[var(--line)] bg-white"
            style={{
              height: isBottomCollapsed ? 0 : bottomHeight,
              overflow: 'hidden'
            }}
          >
            <div style={{ height: bottomHeight }}>
              <CrisisTimeline
                executionPhase={executionPhase}
                onShipClick={setSelectedShip}
              />
            </div>
          </div>
        </div>

        {/* Resizable Right Sidebar */}
        <div
          className="bg-white border-l border-[var(--line)] flex flex-col overflow-hidden relative transition-[width] duration-300 ease-in-out shadow-[-12px_0_28px_-22px_rgba(15,23,42,0.35)]"
          style={{ width: isRightCollapsed ? 28 : sidebarWidth }}
        >
          {/* Resize Handle */}
          {!isRightCollapsed && (
            <div
              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize transition-colors z-10 group"
              onMouseDown={handleMouseDown}
            >
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-[var(--line-strong)] group-hover:bg-[var(--accent-2)] rounded-full transition-colors" />
            </div>
          )}

          {/* Right Collapse Button */}
          <button
            onClick={() => setIsRightCollapsed(!isRightCollapsed)}
            aria-label={isRightCollapsed ? 'Expand intelligence panel' : 'Collapse intelligence panel'}
            className="absolute left-0 top-3 z-20 w-7 h-7 flex items-center justify-center bg-white hover:bg-[rgba(37,99,235,0.08)] text-[var(--text-mid)] hover:text-[var(--accent-3)] transition-colors rounded-r-md border border-l-0 border-[var(--line-strong)] shadow-[0_4px_12px_-6px_rgba(15,23,42,0.25)]"
          >
            {isRightCollapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          <div className={`flex-1 flex flex-col overflow-hidden transition-opacity duration-200 ${isRightCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

            {/* Tab Bar */}
            <div className="flex border-b border-[var(--line)] shrink-0 bg-[#f7f9fc]">
              {([
                { id: 'intelligence' as const, label: 'AI', icon: <Brain className="w-3.5 h-3.5" /> },
                { id: 'agents' as const, label: 'Agents', icon: <Activity className="w-3.5 h-3.5" /> },
                { id: 'risk' as const, label: 'Risk', icon: <Eye className="w-3.5 h-3.5" /> },
                { id: 'compliance' as const, label: 'Comply', icon: <Shield className="w-3.5 h-3.5" /> },
              ]).map((tab) => {
                const active = sidebarTab === tab.id;
                const accent = SIDEBAR_TAB_THEME[tab.id].accent;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSidebarTab(tab.id)}
                    aria-pressed={active}
                    className="flex-1 flex items-center justify-center gap-1.5 px-1 py-2.5 text-[11.5px] font-semibold tracking-[-0.005em] transition-all relative"
                    style={{
                      color: active ? '#0b1220' : '#64748b',
                      background: active ? '#ffffff' : 'transparent',
                      boxShadow: active
                        ? `inset 0 1px 0 rgba(15,23,42,0.04), 0 -1px 0 ${accent} inset`
                        : 'none',
                    }}
                  >
                    <span style={{ color: active ? accent : 'currentColor' }}>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {active && (
                      <div
                        className="absolute bottom-[-1px] inset-x-2 h-[2px] rounded-full"
                        style={{ background: accent }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {sidebarTab === 'intelligence' && (
                <>
                  <AzureBadges />
                  <AgentCoTPanel
                    steps={cotSteps}
                    debates={debates}
                    decision={finalDecision}
                    activeStepIndex={activeStepIndex}
                    activeDebateIndex={activeDebateIndex}
                    debatePhase={debatePhase}
                    isActive={isCotActive}
                    executionSteps={executionSteps}
                    activeExecutionIndex={activeExecutionIndex}
                    executionPhase={executionPhase}
                    executionSummary={executionSummary}
                    awaitingConfirmation={awaitingConfirmation}
                    onConfirmDecision={handleConfirmDecision}
                    selectedRoute={selectedRoute}
                  />
                </>
              )}
              {sidebarTab === 'agents' && (
                <AgentWorkflow
                  currentTime={currentTime}
                  isLive={demoStarted}
                  marketSentinelData={marketSentinelData}
                  marketSentinelLoading={marketSentinelLoading}
                  marketSentinelError={marketSentinelError}
                  onRunMarketSentinel={runMarketSentinel}
                  selectedRoute={selectedRoute}
                  hedgeRiskData={hedgeRiskData}
                  hedgeRecommendation={hedgeRecommendation}
                  hedgeLoading={hedgeLoading}
                  hedgeError={hedgeError}
                  onRunHedge={runHedgeAnalysis}
                  isCotActive={isCotActive}
                  debateCount={debates.length}
                  executionPhase={executionPhase}
                />
              )}
              {sidebarTab === 'risk' && (
                <div className="p-3">
                  <VisualRiskPanel
                    isAnalyzing={visualRiskAnalyzing}
                    analysisSource={visualRiskSource}
                    analysisLocation={visualRiskLocation}
                    analysis={visualRiskAnalysis}
                    selectedRoute={selectedRoute}
                    onRunAnalysis={runVisualRiskAnalysis}
                  />
                </div>
              )}
              {sidebarTab === 'compliance' && (
                <div className="p-3">
                  <div className="mb-3 flex items-center justify-between rounded-lg border border-[rgba(217,119,6,0.30)] bg-[rgba(254,243,199,0.55)] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-[var(--warn)]" />
                      <span className="text-xs font-semibold tracking-[-0.005em] text-[#92400e]">Compliance Check</span>
                    </div>
                    <div className="rounded-full border border-[rgba(217,119,6,0.40)] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#b45309]">
                      Policy Guard
                    </div>
                  </div>
                  <CompliancePanel
                    originPort={origin}
                    destinationPort={destination}
                    activeMapRoute={selectedRoute}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Collapsed Text */}
          {isRightCollapsed && (
            <div className="absolute top-12 w-full flex flex-col items-center gap-4 py-4">
              <div className="[writing-mode:vertical-rl] rotate-180 text-[10.5px] font-mono uppercase tracking-[0.18em] text-[var(--text-mid)] whitespace-nowrap">
                Intelligence
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] backdrop-blur-sm"
          onClick={() => setShowKeyboardHelp(false)}
        >
          <div
            className="bg-white border border-[var(--line)] rounded-2xl p-6 max-w-md w-full mx-4 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[rgba(37,99,235,0.10)] border border-[rgba(37,99,235,0.20)] flex items-center justify-center">
                  <Keyboard className="w-4 h-4 text-[var(--accent-3)]" />
                </div>
                <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-[var(--text-hi)]">Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="w-8 h-8 rounded-lg bg-[var(--bg-1)] hover:bg-[rgba(37,99,235,0.10)] flex items-center justify-center text-[var(--text-mid)] hover:text-[var(--accent-3)] transition-colors"
                aria-label="Close keyboard shortcuts"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              {KEYBOARD_SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between py-2.5 border-b border-[var(--line)] last:border-0"
                >
                  <span className="text-[13.5px] text-[var(--text-mid)]">{shortcut.action}</span>
                  <kbd className="px-2 py-1 bg-[var(--bg-1)] rounded text-[11px] font-mono text-[var(--accent-3)] border border-[var(--line-strong)]">
                    {shortcut.label}
                  </kbd>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-[var(--text-low)] text-center">
              Press <kbd className="px-1 py-0.5 bg-[var(--bg-1)] rounded text-[10px] font-mono border border-[var(--line)]">?</kbd> anytime to show this help
            </p>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Hint - shows briefly on page load */}
      {demoStarted && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setShowKeyboardHelp(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white/90 hover:bg-white border border-[var(--line-strong)] rounded-full text-[12px] font-medium text-[var(--text-mid)] hover:text-[var(--accent-3)] transition-colors backdrop-blur-md shadow-[0_6px_18px_-8px_rgba(15,23,42,0.25)]"
            aria-label="Show keyboard shortcuts"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Press</span>
            <kbd className="px-1.5 py-0.5 bg-[var(--bg-1)] rounded text-[10px] font-mono border border-[var(--line)]">?</kbd>
            <span className="hidden sm:inline">for shortcuts</span>
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Visual Risk API Service
 * Provides functions to interact with the Visual Risk Analysis backend API (Gemini Vision)
 */

import { apiRequest, getApiBaseUrl, shouldUsePublicDemoFallback } from "./apiClient";

const VISUAL_RISK_BASE_URL = `${getApiBaseUrl()}/visual-risk`;

// ========== Response Models ==========

export interface VisualRiskAnalysis {
  risk_type: string;
  severity: number;
  confidence: number;
  description: string;
  affected_routes?: string[];
  affected_ports?: string[];
  raw_insights?: string[];
  gemini_model?: string;
  analysis_type?: string;
  source_type?: string;
}

export interface DemoAnalysisResponse {
  success: boolean;
  scenario: string;
  analysis: VisualRiskAnalysis;
  demo_mode: boolean;
}

export interface ImageAnalysisResponse {
  success: boolean;
  filename: string;
  analysis: VisualRiskAnalysis;
  fallback?: boolean;
  error?: string;
}

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  severity: string;
  image_type: string;
}

export interface ScenariosResponse {
  scenarios: DemoScenario[];
}

export interface ServiceStatusResponse {
  status: string;
  service: string;
  model: string;
  api_configured: boolean;
  static_maps_reachable: boolean;
  capabilities: string[];
}

// ========== API Functions ==========

/**
 * Get demo visual risk analysis result for a given scenario
 */
export async function getDemoAnalysis(
  scenario: string = "suez_blockage",
): Promise<DemoAnalysisResponse> {
  try {
    return await apiRequest<DemoAnalysisResponse>(`${VISUAL_RISK_BASE_URL}/demo`, {
      method: "GET",
      searchParams: { scenario },
      requireAuth: false, // public demo endpoint
    });
  } catch (error) {
    if (!shouldUsePublicDemoFallback(error)) throw error;
    return createDemoVisualRiskAnalysis(scenario);
  }
}

/**
 * List available demo scenarios
 */
export async function listScenarios(): Promise<ScenariosResponse> {
  try {
    return await apiRequest<ScenariosResponse>(`${VISUAL_RISK_BASE_URL}/scenarios`, {
      method: "GET",
      requireAuth: false, // public demo endpoint
    });
  } catch (error) {
    if (!shouldUsePublicDemoFallback(error)) throw error;
    return {
      scenarios: [
        {
          id: "suez_blockage",
          name: "Suez Canal Blockage",
          description: "Large container vessel blocking canal traffic",
          severity: "critical",
          image_type: "satellite",
        },
        {
          id: "port_congestion",
          name: "Rotterdam Port Congestion",
          description: "Terminal congestion with vessel queues",
          severity: "high",
          image_type: "camera",
        },
      ],
    };
  }
}

/**
 * Get Visual Risk service status
 */
export async function getServiceStatus(): Promise<ServiceStatusResponse> {
  try {
    return await apiRequest<ServiceStatusResponse>(`${VISUAL_RISK_BASE_URL}/status`, {
      method: "GET",
      requireAuth: false, // public demo endpoint
    });
  } catch (error) {
    if (!shouldUsePublicDemoFallback(error)) throw error;
    return {
      status: "operational",
      service: "visual_risk_analyzer",
      model: "local-demo-fallback",
      api_configured: false,
      static_maps_reachable: false,
      capabilities: [
        "satellite_imagery_analysis",
        "canal_blockage_detection",
        "port_congestion_detection",
      ],
    };
  }
}

function createDemoVisualRiskAnalysis(scenario: string): DemoAnalysisResponse {
  const isPortCongestion = scenario === "port_congestion";

  return {
    success: true,
    scenario: isPortCongestion ? "port_congestion" : "suez_blockage",
    demo_mode: true,
    analysis: isPortCongestion
      ? {
          risk_type: "port_congestion",
          severity: 0.72,
          confidence: 0.89,
          description:
            "HIGH: Rotterdam port congestion detected. Container yard utilization is elevated and vessel queues are forming near the anchorage.",
          affected_routes: ["Transatlantic Westbound", "Asia-Europe Northbound"],
          affected_ports: ["Rotterdam", "Antwerp", "Hamburg"],
          raw_insights: [
            "Container yard appears near capacity",
            "Multiple vessels waiting outside berth windows",
          ],
          gemini_model: "local-demo-fallback",
          analysis_type: "demo",
          source_type: "camera",
        }
      : {
          risk_type: "canal_blockage",
          severity: 0.95,
          confidence: 0.98,
          description:
            "CRITICAL: Large container vessel detected blocking the Suez Canal. Queue buildup is visible at both canal entrances.",
          affected_routes: [
            "Asia-Europe via Suez",
            "Asia-Mediterranean via Suez",
            "India-Europe via Suez",
          ],
          affected_ports: ["Port Said", "Suez", "Rotterdam", "Singapore", "Shanghai"],
          raw_insights: [
            "Vessel orientation blocks canal width",
            "Northbound and southbound queues are forming",
          ],
          gemini_model: "local-demo-fallback",
          analysis_type: "demo",
          source_type: "satellite",
        },
  };
}

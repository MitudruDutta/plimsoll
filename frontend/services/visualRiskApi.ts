/**
 * Visual Risk API Service
 * Provides functions to interact with the Visual Risk Analysis backend API (Gemini Vision)
 */

import { apiRequest, getApiBaseUrl } from "./apiClient";

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
  return apiRequest<DemoAnalysisResponse>(`${VISUAL_RISK_BASE_URL}/demo`, {
    method: "GET",
    searchParams: { scenario },
  });
}

/**
 * List available demo scenarios
 */
export async function listScenarios(): Promise<ScenariosResponse> {
  return apiRequest<ScenariosResponse>(`${VISUAL_RISK_BASE_URL}/scenarios`, {
    method: "GET",
  });
}

/**
 * Get Visual Risk service status
 */
export async function getServiceStatus(): Promise<ServiceStatusResponse> {
  return apiRequest<ServiceStatusResponse>(`${VISUAL_RISK_BASE_URL}/status`, {
    method: "GET",
  });
}

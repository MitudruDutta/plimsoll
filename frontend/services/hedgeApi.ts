/**
 * Hedge API Service
 * Provides functions to interact with the Financial Hedging backend API
 */

import { apiRequest, getApiBaseUrl, shouldUsePublicDemoFallback } from "./apiClient";

const HEDGE_BASE_URL = `${getApiBaseUrl()}/hedge`;

// ========== Request Models ==========

export interface HedgeOperationParams {
  fuel_consumption_monthly: number;   // tons
  revenue_foreign_monthly: number;    // EUR
  fx_pair: string;
  monthly_voyages: number;
  current_route: string;
}

export interface CrisisActivationRequest {
  crisis_scenario: 'red_sea' | 'fuel_spike' | 'currency_crisis';
  operation_params: HedgeOperationParams;
}

// ========== Response Models ==========

export interface RiskBreakdown {
  fuel_risk?: Record<string, unknown>;
  currency_risk?: Record<string, unknown>;
  freight_risk?: Record<string, unknown>;
}

export interface RiskAssessment {
  market_regime: string;
  urgency: string;
  total_exposure_usd: number;
  total_var_95_usd: number;
  risk_breakdown: RiskBreakdown;
}

export interface HedgePosition {
  instrument: string;
  action: string;
  quantity?: string;
  strike?: string;
  expiry?: string;
  cost?: string;
}

export interface FuelHedging {
  hedge_ratio: string;
  positions: HedgePosition[];
}

export interface CurrencyHedging {
  hedge_ratio?: string;
  positions?: HedgePosition[];
  [key: string]: unknown;
}

export interface FreightStrategy {
  [key: string]: unknown;
}

export interface HedgeRecommendation {
  regime: string;
  fuel_hedging: FuelHedging;
  currency_hedging: CurrencyHedging;
  freight_strategy: FreightStrategy;
}

export interface CrisisActivationResponse {
  alert_level: string;
  immediate_actions: string[];
  hedging_strategy: Record<string, unknown>;
  monitoring_protocol: Record<string, unknown>;
}

export interface MarketDataResponse {
  market_regime: string;
  crisis_indicators: string[];
  fuel: Record<string, unknown>;
  fx: Record<string, unknown>;
  freight: Record<string, unknown>;
}

export interface HedgeHealthResponse {
  status: string;
  hedge_agent: string;
  market_data_service: string;
  current_regime: string;
  timestamp: string;
}

// ========== Default Operation Params ==========

export const DEFAULT_OPERATION_PARAMS: HedgeOperationParams = {
  fuel_consumption_monthly: 1000,
  revenue_foreign_monthly: 1_800_000,
  fx_pair: 'EUR',
  monthly_voyages: 4,
  current_route: 'Shanghai → Rotterdam',
};

// ========== API Functions ==========

/**
 * Assess financial risk exposure
 */
export async function assessRisk(
  params: HedgeOperationParams = DEFAULT_OPERATION_PARAMS,
): Promise<RiskAssessment> {
  try {
    return await apiRequest<RiskAssessment>(`${HEDGE_BASE_URL}/assess-risk`, {
      method: "POST",
      json: params,
      requireAuth: false, // public demo endpoint
    });
  } catch (error) {
    if (!shouldUsePublicDemoFallback(error)) throw error;
    return createDemoRiskAssessment(params);
  }
}

/**
 * Get optimal hedging strategy recommendations
 */
export async function recommendStrategy(
  params: HedgeOperationParams = DEFAULT_OPERATION_PARAMS,
  crisisOverride: boolean = false,
): Promise<HedgeRecommendation> {
  try {
    return await apiRequest<HedgeRecommendation>(`${HEDGE_BASE_URL}/recommend`, {
      method: "POST",
      json: params,
      searchParams: crisisOverride ? { crisis_override: "true" } : undefined,
      requireAuth: false, // public demo endpoint
    });
  } catch (error) {
    if (!shouldUsePublicDemoFallback(error)) throw error;
    return createDemoHedgeRecommendation(crisisOverride);
  }
}

/**
 * Activate emergency crisis hedging protocol
 */
export async function activateCrisisHedging(
  request: CrisisActivationRequest,
): Promise<CrisisActivationResponse> {
  try {
    return await apiRequest<CrisisActivationResponse>(`${HEDGE_BASE_URL}/crisis-activate`, {
      method: "POST",
      json: request,
      requireAuth: false, // public demo endpoint
    });
  } catch (error) {
    if (!shouldUsePublicDemoFallback(error)) throw error;
    return {
      alert_level: "CRITICAL",
      immediate_actions: [
        "Contact fuel and FX brokers for emergency quotes",
        "Lock war-risk insurance assumptions",
        "Model Cape of Good Hope diversion cash impact",
      ],
      hedging_strategy: createDemoHedgeRecommendation(true),
      monitoring_protocol: {
        cadence: "daily",
        triggers: ["fuel +8%", "EUR/USD -3%", "route delay +5 days"],
      },
    };
  }
}

/**
 * Get current market data for all asset classes
 */
export async function getMarketData(
  crisisScenario?: string,
): Promise<MarketDataResponse> {
  try {
    return await apiRequest<MarketDataResponse>(`${HEDGE_BASE_URL}/market-data`, {
      method: "GET",
      searchParams: crisisScenario ? { crisis_scenario: crisisScenario } : undefined,
      requireAuth: false, // public demo endpoint
    });
  } catch (error) {
    if (!shouldUsePublicDemoFallback(error)) throw error;
    return {
      market_regime: crisisScenario ? "crisis" : "elevated",
      crisis_indicators: crisisScenario ? ["red_sea_disruption", "fuel_volatility"] : [],
      fuel: { fuel_oil_380: { spot_price: 625, change_pct: 8.4 } },
      fx: { pair: "EUR/USD", spot_rate: 1.08, change_pct: -1.2 },
      freight: { capesize_usd_day: 26500, change_pct: 6.8 },
    };
  }
}

/**
 * Check health status of hedging module
 */
export async function checkHedgeHealth(): Promise<HedgeHealthResponse> {
  try {
    return await apiRequest<HedgeHealthResponse>(`${HEDGE_BASE_URL}/health`, {
      method: "GET",
      requireAuth: false,
    });
  } catch (error) {
    if (!shouldUsePublicDemoFallback(error)) throw error;
    return {
      status: "healthy",
      hedge_agent: "local-demo-fallback",
      market_data_service: "local-demo-fallback",
      current_regime: "elevated",
      timestamp: new Date().toISOString(),
    };
  }
}

function createDemoRiskAssessment(params: HedgeOperationParams): RiskAssessment {
  const isDisruptedRoute = /rotterdam|suez|red sea|cape/i.test(params.current_route);
  const totalExposure = 15_250_000;
  const totalVar = isDisruptedRoute ? 1_875_000 : 845_000;

  return {
    market_regime: isDisruptedRoute ? "crisis" : "elevated",
    urgency: isDisruptedRoute ? "CRITICAL" : "MODERATE",
    total_exposure_usd: totalExposure,
    total_var_95_usd: totalVar,
    risk_breakdown: {
      fuel_risk: {
        exposure_usd: 3_750_000,
        var_95_usd: isDisruptedRoute ? 520_000 : 240_000,
        driver: "Bunker fuel volatility",
      },
      currency_risk: {
        exposure_usd: 11_500_000,
        var_95_usd: isDisruptedRoute ? 610_000 : 390_000,
        pair: params.fx_pair,
      },
      freight_risk: {
        exposure_usd: 4_100_000,
        var_95_usd: isDisruptedRoute ? 745_000 : 215_000,
        driver: "Route delay and capacity tightening",
      },
    },
  };
}

function createDemoHedgeRecommendation(crisisOverride: boolean): HedgeRecommendation {
  return {
    regime: crisisOverride ? "crisis" : "elevated",
    fuel_hedging: {
      hedge_ratio: crisisOverride ? "80%" : "65%",
      positions: [
        {
          instrument: "Fuel oil call spread",
          action: "BUY",
          quantity: "6 month exposure",
          strike: "$650/$760",
          expiry: "6M",
          cost: "$92K",
        },
      ],
    },
    currency_hedging: {
      hedge_ratio: crisisOverride ? "70%" : "55%",
      positions: [
        {
          instrument: "EUR/USD forward",
          action: "SELL EUR",
          quantity: "70% projected receipts",
          expiry: "3M rolling",
          cost: "No upfront premium",
        },
      ],
    },
    freight_strategy: {
      action: "Reserve alternate-route capacity",
      coverage: crisisOverride ? "priority lanes" : "critical shipments",
      trigger: "Activate if ETA slips beyond 5 days",
    },
  };
}

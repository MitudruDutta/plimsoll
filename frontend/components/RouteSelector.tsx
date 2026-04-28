// @ts-nocheck
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Route } from '../utils/routeCalculator';
import {
  Check,
  Clock,
  TrendingUp,
  Navigation,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Anchor,
} from 'lucide-react';

// Helper function for risk level icons (colorblind accessibility)
const getRiskIcon = (riskLevel: string) => {
  switch (riskLevel) {
    case 'high':
      return <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />;
    case 'medium':
      return <AlertCircle className="w-3 h-3" strokeWidth={2.5} />;
    case 'low':
      return <ShieldCheck className="w-3 h-3" strokeWidth={2.5} />;
    default:
      return null;
  }
};

const getRiskColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'high': return '#c94444';
    case 'medium': return '#e8a547';
    case 'low': return '#5a9a7a';
    default: return '#4a90e2';
  }
};

interface RouteSelectorProps {
  routes: Route[];
  selectedRoute: Route | null;
  onRouteSelect: (route: Route) => void;
  isLoading?: boolean;
}

export function RouteSelector({ routes, selectedRoute, onRouteSelect, isLoading = false }: RouteSelectorProps) {
  const [showPanel, setShowPanel] = React.useState(true);

  const displayRoutes = routes.slice(0, 4);

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: 20,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
    }}>
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="map-toggle-btn"
      >
        <span style={{ fontSize: '10px' }}>{showPanel ? '▼' : '▶'}</span>
        Route Analysis
      </button>

      {showPanel && (
        <div className="map-panel" style={{ minWidth: '300px', maxWidth: '340px', marginTop: '8px' }}>
          <div className="map-panel-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Anchor style={{ width: 14, height: 14, color: '#38bdf8' }} />
              Route Analysis
            </span>
            <span style={{
              fontSize: '10px',
              color: '#64748b',
              fontWeight: '500',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {displayRoutes.length} corridors
            </span>
          </div>

          <div className="map-panel-content" style={{ padding: '12px' }}>
            {/* Empty state */}
            {routes.length === 0 && !isLoading && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <Navigation style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.15)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontWeight: 500 }}>No Routes Available</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', lineHeight: '1.4' }}>
                  Select origin and destination ports to calculate shipping corridors.
                </p>
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} className="map-skeleton" style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(71, 85, 105, 0.3)',
                    height: '56px',
                  }} />
                ))}
              </div>
            )}

            {/* Route Cards */}
            {!isLoading && displayRoutes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {displayRoutes.map((route) => {
                  const isSelected = selectedRoute?.id === route.id;
                  const riskColor = getRiskColor(route.riskLevel);

                  return (
                    <button
                      key={route.id}
                      onClick={() => onRouteSelect(route)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isSelected
                          ? '1px solid rgba(37, 99, 235, 0.45)'
                          : '1px solid rgba(15, 23, 42, 0.10)',
                        background: isSelected
                          ? 'rgba(37, 99, 235, 0.08)'
                          : 'rgba(255, 255, 255, 0.85)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'rgba(239, 246, 255, 0.95)';
                          e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.30)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
                          e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.10)';
                        }
                      }}
                    >
                      {/* Top row: color dot + name + check */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: route.color,
                          boxShadow: isSelected ? `0 0 8px ${route.color}60` : 'none',
                          flexShrink: 0,
                        }} />
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: isSelected ? '#1d4ed8' : '#0b1220',
                          flex: 1,
                        }}>
                          {route.name}
                        </span>
                        {isSelected && (
                          <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <Check style={{ width: 10, height: 10, color: '#fff' }} strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      {/* Stats row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <TrendingUp style={{ width: 12, height: 12, color: '#475569' }} strokeWidth={2} />
                          <span style={{ fontSize: '10px', color: '#334155', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                            {route.distance.toLocaleString()} nm
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock style={{ width: 12, height: 12, color: '#475569' }} strokeWidth={2} />
                          <span style={{ fontSize: '10px', color: '#334155', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                            ~{route.estimatedTime}d
                          </span>
                        </div>

                        {/* Risk badge */}
                        <div style={{
                          marginLeft: 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '9px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          backgroundColor: `${riskColor}20`,
                          color: riskColor,
                        }}
                          role="status"
                          aria-label={`Risk level: ${route.riskLevel}`}
                        >
                          {getRiskIcon(route.riskLevel)}
                          <span>{route.riskLevel}</span>
                        </div>
                      </div>

                      {/* Waypoints (only shown when selected) */}
                      {isSelected && route.waypointNames.length > 0 && (
                        <div style={{
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px dashed rgba(37, 99, 235, 0.20)',
                          marginLeft: '16px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            {route.waypointNames.map((wp, idx) => (
                              <React.Fragment key={idx}>
                                <span style={{
                                  fontSize: '10px',
                                  color: idx === 0
                                    ? '#1d4ed8'
                                    : idx === route.waypointNames.length - 1
                                    ? '#b91c1c'
                                    : '#334155',
                                  fontWeight: (idx === 0 || idx === route.waypointNames.length - 1) ? 600 : 500,
                                }}>
                                  {wp}
                                </span>
                                {idx < route.waypointNames.length - 1 && (
                                  <ChevronRight style={{ width: 10, height: 10, color: 'rgba(15,23,42,0.35)', flexShrink: 0 }} />
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Footer hint */}
            {!isLoading && displayRoutes.length > 0 && (
              <p className="map-hint" style={{ marginTop: '10px' }}>
                AI-optimized corridors · Risk assessed via real-time data
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

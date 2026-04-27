"use client";
// @ts-nocheck
/**
 * CompliancePanel - Sidebar-optimized compliance analysis panel
 *
 * Provides full compliance workflow inside the DemoPage sidebar:
 *  - Supabase user provisioning
 *  - Port selector with search (reuses MAJOR_PORTS)
 *  - Saved route selection
 *  - Document count summary
 *  - Gap analysis via documentAPI.detectMissingDocuments()
 *  - GapAnalysisReport display
 *
 * Pre-populates with the DemoPage's current origin/destination ports.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useCurrentUser } from "../context/SupabaseAuthContext";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  Search,
  Navigation,
  Anchor,
  FileText,
  ChevronRight,
  Plus,
  X,
  AlertCircle,
  RefreshCw,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { documentAPI } from "../services/documentApi";
import type { VesselRoute, MissingDocsResponse, DocumentInfo } from "../services/documentApi";
import { GapAnalysisReport } from "./documents";
import { MAJOR_PORTS } from "../data/ports";
import type { GlobalPort } from "../utils/routeCalculator";

// ---------- helpers ----------

const COUNTRY_CODE_MAP: Record<string, string> = {
  China: "CN", Singapore: "SG", Netherlands: "NL", Germany: "DE",
  USA: "US", UK: "GB", Belgium: "BE", Spain: "ES", France: "FR",
  Italy: "IT", Japan: "JP", "South Korea": "KR", India: "IN",
  UAE: "AE", "Saudi Arabia": "SA", Malaysia: "MY", Thailand: "TH",
  Vietnam: "VN", Indonesia: "ID", Philippines: "PH", Taiwan: "TW",
  Australia: "AU", "New Zealand": "NZ", Brazil: "BR", Mexico: "MX",
  Canada: "CA", Argentina: "AR", Chile: "CL", Colombia: "CO",
  Peru: "PE", Panama: "PA", Egypt: "EG", Turkey: "TR",
  "South Africa": "ZA", Kenya: "KE", Morocco: "MA", Nigeria: "NG",
  Ghana: "GH", "Ivory Coast": "CI", Senegal: "SN", Tanzania: "TZ",
  Djibouti: "DJ", Oman: "OM", Kuwait: "KW", Israel: "IL",
  Greece: "GR", Poland: "PL", Sweden: "SE", Denmark: "DK",
  Finland: "FI", Norway: "NO", Estonia: "EE", Latvia: "LV",
  Russia: "RU", Ukraine: "UA", Romania: "RO", Ireland: "IE",
  Portugal: "PT", Bangladesh: "BD", Pakistan: "PK", "Sri Lanka": "LK",
  Malta: "MT", Jamaica: "JM", Bahamas: "BS", "Puerto Rico": "PR",
  Uruguay: "UY", Ecuador: "EC", Iran: "IR", Mauritius: "MU",
};

interface PortEntry {
  id: number;
  name: string;
  country: string;
  region: string;
  un_locode: string;
  latitude: number;
  longitude: number;
}

function buildPortEntries(): PortEntry[] {
  return MAJOR_PORTS.map((port, idx) => {
    const cc = COUNTRY_CODE_MAP[port.country] || port.country.substring(0, 2).toUpperCase();
    const pc = port.name.replace(/\s+/g, "").substring(0, 3).toUpperCase();
    return {
      id: idx + 1,
      name: port.name,
      country: port.country,
      region: port.region,
      un_locode: `${cc}${pc}`,
      latitude: port.coordinates[1],
      longitude: port.coordinates[0],
    };
  });
}

// ---------- component ----------

export interface CompliancePanelProps {
  originPort?: GlobalPort | null;
  destinationPort?: GlobalPort | null;
  activeMapRoute?: { name: string; distance: number; estimatedTime: number; riskLevel: string; waypointNames: string[]; description: string } | null;
}

export function CompliancePanel({ originPort, destinationPort, activeMapRoute }: CompliancePanelProps) {
  const { user, email, fullName } = useCurrentUser();

  // identity
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [vesselId, setVesselId] = useState<number | null>(null);

  // routes & docs
  const [vesselRoutes, setVesselRoutes] = useState<VesselRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<VesselRoute | null>(null);
  const [vesselDocuments, setVesselDocuments] = useState<DocumentInfo[]>([]);

  // port selector
  const [selectedRoutePorts, setSelectedRoutePorts] = useState<PortEntry[]>([]);
  const [portSearchQuery, setPortSearchQuery] = useState("");
  const [showPortDropdown, setShowPortDropdown] = useState(false);

  // route creation
  const [newRouteName, setNewRouteName] = useState("");
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);

  // analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [missingDocsResult, setMissingDocsResult] = useState<MissingDocsResponse | null>(null);

  // loading state
  const [isLoading, setIsLoading] = useState(false);

  // upload state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allPorts = useMemo(buildPortEntries, []);

  // ---- provision user ----
  useEffect(() => {
    if (!user) return;
    const provision = async () => {
      try {
        const res = await documentAPI.provisionUser({
          auth_user_id: user.id,
          email: email || "",
          name: fullName || undefined,
        });
        setCustomerId(res.customer_id);
        if (res.vessel_id) setVesselId(res.vessel_id);
      } catch {
        setAnalysisError("Failed to provision your maritime profile.");
      }
    };
    provision();
  }, [user, email, fullName]);

  // ---- pre-populate ports from DemoPage origin/destination ----
  useEffect(() => {
    if (selectedRoutePorts.length > 0) return; // user already picked ports
    const initial: PortEntry[] = [];
    if (originPort) {
      const found = allPorts.find((p) => p.name === originPort.name);
      if (found) initial.push(found);
    }
    if (destinationPort) {
      const found = allPorts.find((p) => p.name === destinationPort.name);
      if (found && !initial.find((p) => p.un_locode === found.un_locode)) initial.push(found);
    }
    if (initial.length > 0) setSelectedRoutePorts(initial);
  }, [originPort, destinationPort]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- load compliance data once provisioned ----
  useEffect(() => {
    if (!customerId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        if (vesselId) {
          const routes = await documentAPI.getVesselRoutes(vesselId);
          setVesselRoutes(routes);
          const active = routes.find((r) => r.is_active);
          if (active) setSelectedRoute(active);
          else if (routes.length > 0) setSelectedRoute(routes[0]);
        }
        const docs = await documentAPI.getCustomerDocuments(customerId);
        setVesselDocuments(docs);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [customerId, vesselId]);

  // ---- handlers ----

  const handleCreateRoute = useCallback(async () => {
    if (!newRouteName.trim() || selectedRoutePorts.length === 0 || !vesselId) return;
    setIsCreatingRoute(true);
    setAnalysisError(null);
    try {
      const portCodes = selectedRoutePorts.map((p) => p.un_locode);
      const created = await documentAPI.createRoute(vesselId, {
        route_name: newRouteName,
        port_codes: portCodes,
        set_active: true,
      });
      setVesselRoutes((prev) => [created, ...prev]);
      setSelectedRoute(created);
      setNewRouteName("");
    } catch {
      setAnalysisError("Failed to create route.");
    } finally {
      setIsCreatingRoute(false);
    }
  }, [newRouteName, selectedRoutePorts, vesselId]);

  const handleRunAnalysis = useCallback(async () => {
    const hasRoute = selectedRoute && selectedRoute.port_codes?.length > 0;
    const hasPorts = selectedRoutePorts.length > 0;
    if (!customerId || (!hasRoute && !hasPorts)) {
      setAnalysisError("Select a route or add ports first.");
      return;
    }
    setIsAnalyzing(true);
    setAnalysisError(null);
    setMissingDocsResult(null);
    try {
      const portCodes = hasRoute ? selectedRoute!.port_codes : selectedRoutePorts.map((p) => p.un_locode);
      const result = await documentAPI.detectMissingDocuments({ port_codes: portCodes });
      setMissingDocsResult(result);
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      let message: string;
      if (detail) {
        message = typeof detail === "string" ? detail : JSON.stringify(detail);
      } else if (status === 401 || status === 403) {
        message = "You need to sign in again to run a compliance analysis.";
      } else if (status === 503) {
        message = "Compliance agent is offline (CrewAI service unavailable).";
      } else if (status === 500) {
        message = "Compliance agent crashed mid-run. Try again or pick a shorter route — the maritime team has been alerted.";
      } else {
        message = err?.message || "Analysis failed.";
      }
      setAnalysisError(message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedRoute, selectedRoutePorts, customerId]);

  const refreshData = useCallback(async () => {
    if (!customerId) return;
    setIsLoading(true);
    try {
      const promises: Promise<any>[] = [documentAPI.getCustomerDocuments(customerId)];
      if (vesselId) promises.unshift(documentAPI.getVesselRoutes(vesselId));
      const results = await Promise.all(promises);
      if (vesselId) {
        setVesselRoutes(results[0]);
        setVesselDocuments(results[1]);
      } else {
        setVesselDocuments(results[0]);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [customerId, vesselId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
      setUploadDescription("");
      // setIsUploadModalOpen(true); // Modal should already be open if triggered from button
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadDescription("");
    }
  };

  const handleUploadConfirm = async () => {
    if (!uploadFile || !customerId || !vesselId) return;
    setIsUploading(true);
    setUploadProgress(0);
    setAnalysisError(null);

    // Progress simulation
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    try {
      await documentAPI.uploadDocument({
        vessel_id: vesselId,
        document_type: "other",
        title: uploadDescription.trim() || uploadFile.name,
        file: uploadFile,
      });
      
      setUploadProgress(100);
      clearInterval(interval);
      
      // Short delay before closing
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadDescription("");
      refreshData();
    } catch (err) {
      console.error("Upload failed", err);
      clearInterval(interval);
      setAnalysisError("Failed to upload document.");
      setIsUploading(false); // Stop uploading state on error so user can retry
      setUploadProgress(0);
    } finally {
      // setIsUploading(false); // Only set false on error or close
    }
  };

  // ---- derived ----

  const validCount = vesselDocuments.filter((d) => {
    if (!d.expiry_date) return true;
    return new Date(d.expiry_date) > new Date();
  }).length;

  const expiringCount = vesselDocuments.filter((d) => {
    if (!d.expiry_date) return false;
    const days = Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / 86_400_000);
    return days > 0 && days <= 30;
  }).length;

  const expiredCount = vesselDocuments.filter((d) => {
    if (!d.expiry_date) return false;
    return new Date(d.expiry_date) <= new Date();
  }).length;

  // filtered ports for dropdown
  const filteredPorts = useMemo(() => {
    const q = portSearchQuery.toLowerCase();
    return allPorts
      .filter((p) => {
        if (!q) return true;
        return p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q) || p.un_locode.toLowerCase().includes(q);
      })
      .filter((p) => !selectedRoutePorts.find((sp) => sp.un_locode === p.un_locode))
      .slice(0, 12);
  }, [allPorts, portSearchQuery, selectedRoutePorts]);

  // ---- render ----

  return (
    <div className="space-y-3 text-xs">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-semibold text-[var(--text-mid)] uppercase tracking-[0.12em]">Compliance</span>
        <div className="flex items-center gap-1">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => {
              setUploadFile(null);
              setUploadDescription("");
              setIsUploadModalOpen(true);
            }}
            className="text-[var(--text-mid)] hover:text-[var(--accent-3)] transition-colors p-1"
            title="Upload Document"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button onClick={refreshData} disabled={isLoading} className="text-[var(--text-mid)] hover:text-[var(--accent-3)] transition-colors p-1">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ---- Active Route Context ---- */}
      {activeMapRoute && (
        <div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--bg-1)]">
          <div className="flex items-center gap-2 mb-1.5">
            <Navigation className="w-3 h-3 text-[var(--accent-3)]" />
            <span className="text-[10.5px] text-[var(--text-mid)] uppercase tracking-[0.10em] font-semibold">Active Route</span>
          </div>
          <p className="text-[12.5px] text-[var(--text-hi)] font-semibold mb-1">{activeMapRoute.name}</p>
          <div className="flex items-center gap-3 text-[11px] text-[var(--text-mid)]">
            <span>{activeMapRoute.distance.toLocaleString()} nm</span>
            <span>~{activeMapRoute.estimatedTime}d</span>
            <span className={`uppercase font-bold ${activeMapRoute.riskLevel === 'high' ? 'text-[#b91c1c]' : activeMapRoute.riskLevel === 'medium' ? 'text-[#b45309]' : 'text-[#15803d]'}`}>
              {activeMapRoute.riskLevel}
            </span>
          </div>
          {activeMapRoute.waypointNames.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              {activeMapRoute.waypointNames.slice(0, 5).map((wp, idx) => (
                <React.Fragment key={wp + idx}>
                  <span className="text-[10.5px] text-[var(--text-mid)] font-mono">{wp}</span>
                  {idx < Math.min(activeMapRoute.waypointNames.length, 5) - 1 && <ChevronRight className="w-2.5 h-2.5 text-[var(--text-low)]" />}
                </React.Fragment>
              ))}
              {activeMapRoute.waypointNames.length > 5 && (
                <span className="text-[10.5px] text-[var(--text-low)]">+{activeMapRoute.waypointNames.length - 5} more</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- Route Selection ---- */}
      {vesselRoutes.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[10.5px] uppercase font-semibold text-[var(--text-mid)] tracking-[0.12em]">Saved Routes</label>
          <select
            value={selectedRoute?.id || ""}
            onChange={(e) => {
              const route = vesselRoutes.find((r) => r.id === parseInt(e.target.value));
              setSelectedRoute(route || null);
            }}
            className="w-full bg-white text-[var(--text-hi)] border border-[var(--line-strong)] rounded-lg px-3 py-2 text-xs focus:border-[var(--accent-2)] outline-none transition-all appearance-none"
          >
            <option value="">Select route...</option>
            {vesselRoutes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.route_name} {r.is_active ? "(Active)" : ""}
              </option>
            ))}
          </select>

          {selectedRoute && (
            <div className="flex flex-wrap items-center gap-1 mt-1">
              {selectedRoute.port_codes.map((pc, idx) => (
                <React.Fragment key={pc}>
                  <span className="bg-[rgba(37,99,235,0.10)] text-[var(--accent-3)] border border-[rgba(37,99,235,0.25)] px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold">{pc}</span>
                  {idx < selectedRoute.port_codes.length - 1 && <ChevronRight className="w-3 h-3 text-[var(--text-low)]" />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- Port Selector ---- */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10.5px] uppercase font-semibold text-[var(--text-mid)] tracking-[0.12em] flex items-center gap-1">
            <Plus className="w-3 h-3 text-[var(--accent-3)]" />
            Ports
            <span className="text-[var(--accent-3)]/70">({allPorts.length})</span>
          </label>
          {selectedRoutePorts.length > 0 && (
            <button onClick={() => { setSelectedRoutePorts([]); setPortSearchQuery(""); }} className="text-[var(--text-low)] hover:text-[var(--text-hi)] text-[11px] font-semibold">
              Clear
            </button>
          )}
        </div>

        <div className="relative">
          <input
            type="text"
            value={portSearchQuery}
            onChange={(e) => { setPortSearchQuery(e.target.value); setShowPortDropdown(true); }}
            onFocus={() => setShowPortDropdown(true)}
            onBlur={() => setTimeout(() => setShowPortDropdown(false), 200)}
            placeholder="Search ports..."
            className="w-full bg-white text-[var(--text-hi)] border border-[var(--line-strong)] rounded-lg px-3 py-2 text-xs focus:border-[var(--accent-2)] outline-none transition-all placeholder:text-[var(--text-low)]"
          />
          {showPortDropdown && filteredPorts.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-[var(--line-strong)] rounded-lg shadow-[0_12px_32px_-12px_rgba(15,23,42,0.20)] max-h-48 overflow-y-auto">
              {filteredPorts.map((port) => (
                <button
                  key={port.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setSelectedRoutePorts((prev) => [...prev, port]); setPortSearchQuery(""); setShowPortDropdown(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-[rgba(37,99,235,0.06)] border-b border-[var(--line)] last:border-0 transition-colors flex items-center justify-between"
                >
                  <span className="font-medium text-xs text-[var(--text-hi)]">{port.name} <span className="text-[var(--text-low)]">({port.un_locode})</span></span>
                  <span className="text-[var(--text-low)] text-[10.5px]">{port.country}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected port chips */}
        {selectedRoutePorts.length > 0 && (
          <div className="space-y-1">
            {selectedRoutePorts.map((port, idx) => (
              <div key={port.un_locode} className="flex items-center justify-between bg-[var(--bg-1)] border border-[var(--line)] rounded-lg px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-low)] text-[10.5px] font-semibold w-3 text-right">{idx + 1}</span>
                  <span className="font-semibold text-xs text-[var(--text-hi)]">{port.name}</span>
                  <span className="text-[var(--text-low)] text-[10.5px] font-mono">{port.un_locode}</span>
                </div>
                <button onClick={() => setSelectedRoutePorts((prev) => prev.filter((p) => p.un_locode !== port.un_locode))} className="text-[#dc2626]/70 hover:text-[#dc2626] transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Save as Route ---- */}
      {vesselId && selectedRoutePorts.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-[var(--line)]">
          <input
            type="text"
            value={newRouteName}
            onChange={(e) => setNewRouteName(e.target.value)}
            placeholder="Route name (optional, to save)"
            className="w-full bg-white text-[var(--text-hi)] border border-[var(--line-strong)] rounded-lg px-3 py-2 text-xs focus:border-[var(--accent-2)] outline-none transition-all placeholder:text-[var(--text-low)]"
          />
          {newRouteName.trim() && (
            <button
              onClick={handleCreateRoute}
              disabled={isCreatingRoute}
              className="w-full py-2 bg-[var(--accent-2)] hover:bg-[var(--accent-3)] disabled:bg-[var(--bg-2)] disabled:text-[var(--text-low)] text-white rounded-lg font-semibold text-xs transition-all shadow-[0_4px_12px_-4px_rgba(37,99,235,0.45)]"
            >
              {isCreatingRoute ? "Saving..." : "Save Route"}
            </button>
          )}
        </div>
      )}

      {/* ---- Document Summary ---- */}
      {vesselDocuments.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-[var(--line)]">
          <DocStatBadge label="Valid" count={validCount} color="emerald" />
          <DocStatBadge label="Expiring" count={expiringCount} color="amber" />
          <DocStatBadge label="Expired" count={expiredCount} color="red" />
        </div>
      )}

      {/* ---- Run Analysis Button ---- */}
      <div className="pt-1">
        {analysisError && (
          <div className="mb-2 p-2 bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.30)] rounded-lg text-[#b91c1c] text-[10.5px] flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {analysisError}
          </div>
        )}
        <button
          onClick={handleRunAnalysis}
          disabled={(!selectedRoute && selectedRoutePorts.length === 0) || isAnalyzing}
          className="w-full py-2.5 bg-[var(--success)] hover:bg-[#15803d] disabled:bg-[var(--bg-2)] disabled:text-[var(--text-low)] text-white rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_-4px_rgba(22,163,74,0.45)]"
        >
          {isAnalyzing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Search className="w-3.5 h-3.5" />
              Run Compliance Analysis
            </>
          )}
        </button>
      </div>

      {/* ---- Analysis Results ---- */}
      {missingDocsResult && (
        <div className="pt-2 border-t border-[var(--line)]">
          <GapAnalysisReport
            overallStatus={missingDocsResult.overall_status}
            complianceScore={missingDocsResult.compliance_score}
            validDocuments={missingDocsResult.valid_documents}
            expiringDocuments={missingDocsResult.expiring_soon_documents}
            expiredDocuments={missingDocsResult.expired_documents}
            missingDocuments={missingDocsResult.missing_documents}
            vesselMissingDocuments={missingDocsResult.vessel_missing_documents}
            cargoMissingDocuments={missingDocsResult.cargo_missing_documents}
            vesselValidDocuments={missingDocsResult.vessel_valid_documents}
            cargoValidDocuments={missingDocsResult.cargo_valid_documents}
            recommendations={missingDocsResult.recommendations}
          />
        </div>
      )}

      {/* ---- Upload Modal ---- */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[rgba(15,23,42,0.45)] backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border border-[var(--line-strong)] rounded-[2rem] w-full max-w-lg p-8 relative shadow-[0_40px_80px_-20px_rgba(15,23,42,0.30)] overflow-hidden"
            >
              {/* Decorative Elements */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[var(--accent-2)] via-[var(--accent-3)] to-[var(--success)]" />

              <button
                onClick={() => setIsUploadModalOpen(false)}
                disabled={isUploading}
                className="absolute top-6 right-6 text-[var(--text-low)] hover:text-[var(--text-hi)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[rgba(37,99,235,0.10)] border border-[rgba(37,99,235,0.20)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-[var(--accent-2)]" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-[var(--text-hi)] tracking-[-0.01em]">Upload Document</h2>
                <p className="text-[var(--text-mid)] text-xs">Upload vessel certificates or shipping docs for compliance analysis</p>
              </div>

              {!isUploading ? (
                <div className="space-y-6">
                  {!uploadFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className="border-2 border-dashed border-[var(--line-strong)] rounded-2xl p-8 text-center hover:border-[var(--accent-2)] hover:bg-[rgba(37,99,235,0.04)] transition-all cursor-pointer group"
                    >
                      <Plus className="w-8 h-8 text-[var(--text-low)] group-hover:text-[var(--accent-2)] mx-auto mb-3 transition-all group-hover:scale-110" />
                      <p className="font-semibold text-sm mb-1 text-[var(--text-hi)]">Drag and Drop Files Here</p>
                      <p className="text-xs text-[var(--text-low)]">Supports PDF, PNG, JPG (Max 50MB)</p>
                      <div className="mt-6 flex justify-center gap-2">
                        <FileIcon /> <FileIcon /> <FileIcon />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 bg-[var(--bg-1)] px-4 py-3 rounded-xl border border-[var(--line)]">
                        <FileText className="w-5 h-5 text-[var(--accent-3)]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-hi)] truncate">{uploadFile.name}</p>
                          <p className="text-[10.5px] text-[var(--text-low)]">{(uploadFile.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button
                          onClick={() => { setUploadFile(null); setUploadDescription(""); }}
                          className="text-[var(--text-low)] hover:text-[var(--text-hi)] transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-[var(--text-mid)] uppercase tracking-wide">
                          Description (Optional)
                        </label>
                        <textarea
                          value={uploadDescription}
                          onChange={(e) => setUploadDescription(e.target.value)}
                          className="w-full bg-white border border-[var(--line-strong)] rounded-xl px-4 py-3 text-xs text-[var(--text-hi)] focus:border-[var(--accent-2)] outline-none h-24 resize-none placeholder:text-[var(--text-low)] transition-all"
                          placeholder="e.g. Bill of Lading for voyage 123..."
                          autoFocus
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={handleUploadConfirm}
                          className="w-full py-3 rounded-xl text-sm font-semibold bg-[var(--accent-2)] hover:bg-[var(--accent-3)] text-white transition-all shadow-[0_8px_20px_-6px_rgba(37,99,235,0.45)] active:scale-95"
                        >
                          Upload Document
                        </button>
                      </div>
                    </div>
                  )}

                  {analysisError && (
                    <div className="p-3 bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.30)] rounded-xl text-[#b91c1c] text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {analysisError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 px-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[var(--accent-3)] font-semibold uppercase tracking-[0.16em] text-[10.5px] animate-pulse">Processing Document...</span>
                    <span className="text-[var(--text-mid)] font-mono text-xs">{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-2)] rounded-full overflow-hidden border border-[var(--line)] mb-8">
                    <motion.div
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-[var(--accent-2)] shadow-[0_0_10px_rgba(37,99,235,0.45)]"
                    />
                  </div>
                  <div className="space-y-3">
                    <ParsingStep label="Uploading to secure storage" active={uploadProgress > 0 && uploadProgress < 40} completed={uploadProgress >= 40} />
                    <ParsingStep label="OCR Text Extraction" active={uploadProgress >= 40 && uploadProgress < 70} completed={uploadProgress >= 70} />
                    <ParsingStep label="Compliance Check" active={uploadProgress >= 70 && uploadProgress < 100} completed={uploadProgress === 100} />
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- tiny sub-components ----

function FileIcon() {
  return <div className="w-6 h-6 bg-[var(--bg-1)] border border-[var(--line)] rounded flex items-center justify-center text-[var(--text-low)]"><FileText className="w-3 h-3" /></div>;
}

function ParsingStep({ label, active, completed }: { label: string; active: boolean; completed: boolean }) {
  return (
    <div className="flex items-center gap-3 py-0.5">
       {completed ? (
         <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
       ) : active ? (
         <div className="w-4 h-4 border-2 border-[var(--accent-2)] border-t-transparent rounded-full animate-spin" />
       ) : (
         <div className="w-4 h-4 border-2 border-[var(--line-strong)] rounded-full" />
       )}
       <span className={`text-xs font-medium ${completed ? 'text-[var(--text-hi)]' : active ? 'text-[var(--text-hi)]' : 'text-[var(--text-low)]'}`}>{label}</span>
    </div>
  );
}

// ---- tiny sub-components ----

function DocStatBadge({ label, count, color }: { label: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    emerald: "bg-[rgba(22,163,74,0.10)] text-[#15803d] border-[rgba(22,163,74,0.30)]",
    amber: "bg-[rgba(217,119,6,0.10)] text-[#b45309] border-[rgba(217,119,6,0.30)]",
    red: "bg-[rgba(220,38,38,0.10)] text-[#b91c1c] border-[rgba(220,38,38,0.30)]",
  };
  return (
    <div className={`p-2 rounded-lg border text-center ${colors[color] || colors.emerald}`}>
      <div className="text-sm font-black">{count}</div>
      <div className="text-[9.5px] uppercase font-bold tracking-wider opacity-80">{label}</div>
    </div>
  );
}

export default CompliancePanel;

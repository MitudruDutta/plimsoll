"use client";
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser, useSupabaseAuth } from '@/context/SupabaseAuthContext';
import {
  Zap,
  Clock,
  Shield,
  ArrowLeft,
  History,
  TrendingUp,
  Activity,
  Ship,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronRight,
  ClipboardCheck,
  Package,
  MapPin,
  Layers,
  Info,
  X,
  Anchor,
  Navigation,
  Search,
  RefreshCw
} from 'lucide-react';
import { documentAPI } from '@/services/documentApi';
import { GapAnalysisReport } from '@/components/documents';
import { MAJOR_PORTS } from '@/data/ports';
import { motion, AnimatePresence } from 'motion/react';
import { ModeBanner } from '@/components/ModeBanner';

export function UsersHome() {
  const { user, email, fullName, avatarUrl, isLoaded, isSignedIn } = useCurrentUser();
  const { signOut } = useSupabaseAuth();
  const router = useRouter();
  const provisionedUserRef = useRef(null);
  
  // --- States ---
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'vessel', or 'compliance'
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Customer/vessel identity from backend
  const [customerId, setCustomerId] = useState(null);
  const [vesselId, setVesselId] = useState(null);

  // Compliance Analysis State
  const [vesselRoutes, setVesselRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [vesselDocuments, setVesselDocuments] = useState([]);
  const [missingDocsResult, setMissingDocsResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [newRouteName, setNewRouteName] = useState('');
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  
  // Port selection state
  // availablePorts is now computed via useMemo (allPorts)
  const [selectedRoutePorts, setSelectedRoutePorts] = useState([]); // Array of port objects for new route
  const [portSearchQuery, setPortSearchQuery] = useState('');
  const [showPortDropdown, setShowPortDropdown] = useState(false);

  // Provision customer + vessel on mount once the Supabase session is loaded.
  // The auth bridge in SupabaseAuthProvider already pushed the access token
  // into the documentApi axios client, so REST calls below are authenticated.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    if (provisionedUserRef.current === user.id) return;

    let cancelled = false;
    const provision = async () => {
      try {
        const res = await documentAPI.provisionUser({
          auth_user_id: user.id,
          email: email || '',
          name: fullName || undefined,
        });
        if (cancelled) return;
        provisionedUserRef.current = user.id;
        setCustomerId(res.customer_id);
        if (res.vessel_id) setVesselId(res.vessel_id);
      } catch (err) {
        if (cancelled) return;
        console.error('Provisioning failed:', err);
        setAnalysisError('Failed to provision your maritime profile. Please sign in again or retry.');
      }
    };
    provision();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, email, fullName]);

  // Pre-compute available ports from MAJOR_PORTS (no useEffect needed)
  const countryCodeMap = {
    'China': 'CN', 'Singapore': 'SG', 'Netherlands': 'NL', 'Germany': 'DE',
    'USA': 'US', 'UK': 'GB', 'Belgium': 'BE', 'Spain': 'ES', 'France': 'FR',
    'Italy': 'IT', 'Japan': 'JP', 'South Korea': 'KR', 'India': 'IN',
    'UAE': 'AE', 'Saudi Arabia': 'SA', 'Malaysia': 'MY', 'Thailand': 'TH',
    'Vietnam': 'VN', 'Indonesia': 'ID', 'Philippines': 'PH', 'Taiwan': 'TW',
    'Australia': 'AU', 'New Zealand': 'NZ', 'Brazil': 'BR', 'Mexico': 'MX',
    'Canada': 'CA', 'Argentina': 'AR', 'Chile': 'CL', 'Colombia': 'CO',
    'Peru': 'PE', 'Panama': 'PA', 'Egypt': 'EG', 'Turkey': 'TR',
    'South Africa': 'ZA', 'Kenya': 'KE', 'Morocco': 'MA', 'Nigeria': 'NG',
    'Ghana': 'GH', 'Ivory Coast': 'CI', 'Senegal': 'SN', 'Tanzania': 'TZ',
    'Djibouti': 'DJ', 'Oman': 'OM', 'Kuwait': 'KW', 'Israel': 'IL',
    'Greece': 'GR', 'Poland': 'PL', 'Sweden': 'SE', 'Denmark': 'DK',
    'Finland': 'FI', 'Norway': 'NO', 'Estonia': 'EE', 'Latvia': 'LV',
    'Russia': 'RU', 'Ukraine': 'UA', 'Romania': 'RO', 'Ireland': 'IE',
    'Portugal': 'PT', 'Bangladesh': 'BD', 'Pakistan': 'PK', 'Sri Lanka': 'LK',
    'Malta': 'MT', 'Jamaica': 'JM', 'Bahamas': 'BS', 'Puerto Rico': 'PR',
    'Uruguay': 'UY', 'Ecuador': 'EC', 'Iran': 'IR', 'Mauritius': 'MU',
  };

  // Generate ports with UN/LOCODE codes from MAJOR_PORTS immediately
  const allPorts = React.useMemo(() => {
    return MAJOR_PORTS.map((port, idx) => {
      const countryCode = countryCodeMap[port.country] || port.country.substring(0, 2).toUpperCase();
      const portCode = port.name.replace(/\s+/g, '').substring(0, 3).toUpperCase();
      return {
        id: idx + 1,
        name: port.name,
        country: port.country,
        region: port.region,
        un_locode: `${countryCode}${portCode}`,
        latitude: port.coordinates[1],
        longitude: port.coordinates[0],
      };
    });
  }, []);

  // Load routes and documents when switching to compliance tab (requires vesselId)
  useEffect(() => {
    if (activeTab !== 'compliance' || !customerId) return;
    
    const loadComplianceData = async () => {
      try {
        // Fetch vessel routes (if vesselId is available)
        if (vesselId) {
          const routes = await documentAPI.getVesselRoutes(vesselId);
          setVesselRoutes(routes);
          
          // Auto-select the active route if exists
          const activeRoute = routes.find(r => r.is_active);
          if (activeRoute) {
            setSelectedRoute(activeRoute);
          } else if (routes.length > 0) {
            setSelectedRoute(routes[0]);
          }
        }

        // Fetch customer documents (by user, not vessel)
        const docs = await documentAPI.getCustomerDocuments(customerId);
        setVesselDocuments(docs);
      } catch {
        setVesselDocuments([]);
      }
    };
    
    loadComplianceData();
  }, [activeTab, customerId, vesselId]);

  // Usage metrics — PRD §F2.6: until /api/usage/me is wired against the
  // llm_calls ledger (§B7.6), we keep the widget but mark the values
  // null so the UI renders "—" instead of fabricated counters. Do NOT
  // restore hardcoded totals; that was a v0 honesty bug.
  const [metrics] = useState({
    totalTokens: null,
    usedTokens: null,
    remainingTokens: null,
    activeTime: null,
    lastSession: null,
    requests: null,
  });

  // Ship Profile Data (Based on TXT reference)
  const [shipData, setShipData] = useState({
    // Vessel Particulars
    vesselName: '',
    callSign: '',
    imoNumber: '',
    mmsiCode: '',
    flag: '',
    vesselType: '',
    // Voyage Information
    originalVoyage: '',
    newVoyage: '',
    portOfLoading: '',
    portOfDischarge: '',
    etaOriginal: '',
    etaNew: '',
    // Cargo Details
    cargoName: '',
    hsCode: '',
    dgClass: '',
    weight: '',
    volume: ''
  });

  if (!isLoaded) return <div className="min-h-screen bg-[var(--bg-0)] flex items-center justify-center text-[var(--accent-2)] font-mono text-sm tracking-[0.14em] uppercase">Initialising cockpit…</div>;

  const usedPercentage =
    metrics.usedTokens != null && metrics.totalTokens
      ? (metrics.usedTokens / metrics.totalTokens) * 100
      : 0;

  // --- Handlers ---
  const handleShipDataChange = (field, value) => {
    setShipData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      handleFileUpload(file);
    }
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file) => {
    setIsParsing(true);
    setUploadProgress(0);
    setUploadError(null);

    // Progress simulation for UX (real upload happens in parallel)
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    try {
      if (!customerId) {
        throw new Error('User account not ready. Please wait a moment and try again.');
      }

      // PRD §F2.7 — never silently fall back to vesselId=1; that was a
      // cross-tenant write hazard. We require the user to have a
      // provisioned vessel before any upload. The BE re-asserts
      // ownership inside the transaction.
      if (!vesselId) {
        throw new Error(
          'No vessel attached to your account yet. Wait for provisioning to complete or refresh the page before uploading.',
        );
      }

      // Step 1: Upload document to backend with OCR processing
      const uploadResult = await documentAPI.uploadDocument({
        vessel_id: vesselId,
        document_type: 'other',
        title: file.name,
        file: file,
      });

      setUploadProgress(95);

      // Step 2: Fetch full document details including extracted_fields from OCR
      const docDetails = await documentAPI.getDocument(uploadResult.id);
      const fields = docDetails.extracted_fields || {};

      clearInterval(interval);
      setUploadProgress(100);

      // Step 3: Map OCR-extracted fields to vessel form
      setShipData(prev => ({
        ...prev,
        vesselName: fields.vessel_name || prev.vesselName,
        imoNumber: fields.imo_number || prev.imoNumber,
        flag: fields.flag_state || prev.flag,
        vesselType: fields.vessel_type || prev.vesselType,
      }));

      // Short delay to show 100% before closing
      await new Promise(resolve => setTimeout(resolve, 500));

      setIsParsing(false);
      setShowUploadModal(false);
      setSelectedFile(null);
      setActiveTab('vessel');
    } catch (err) {
      clearInterval(interval);
      console.error('Upload failed:', err);
      setUploadError(err.response?.data?.detail || err.message || 'Upload failed. Please try again.');
      setIsParsing(false);
      setUploadProgress(0);
    }
  };

  // --- Compliance Analysis Handlers ---
  const handleCreateRoute = async () => {
    // Only save route if vesselId exists (guaranteed by UI)
    if (!newRouteName.trim() || selectedRoutePorts.length === 0 || !vesselId) return;
    
    setIsCreatingRoute(true);
    setAnalysisError(null);
    try {
      const portCodes = selectedRoutePorts.map(p => p.un_locode);
      
      const newRoute = await documentAPI.createRoute(vesselId, {
        route_name: newRouteName,
        port_codes: portCodes,
        set_active: true
      });
      
      setVesselRoutes(prev => [newRoute, ...prev]);
      setSelectedRoute(newRoute);
      setNewRouteName('');
      // Keep ports selected so user can run analysis immediately
    } catch (err) {
      console.error('Failed to create route:', err);
      setAnalysisError('Failed to create route. Please try again.');
    } finally {
      setIsCreatingRoute(false);
    }
  };

  const handleRunAnalysis = async () => {
    // Need either a selected route OR selected ports for route creation
    const hasRoute = selectedRoute && selectedRoute.port_codes?.length > 0;
    const hasPorts = selectedRoutePorts.length > 0;
    
    if (!customerId || (!hasRoute && !hasPorts)) {
      setAnalysisError('Please select a route or add ports for analysis.');
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    setMissingDocsResult(null);
    
    try {
      // Backend derives tenant identity from the authenticated user.
      const portCodes = hasRoute 
        ? selectedRoute.port_codes 
        : selectedRoutePorts.map(p => p.un_locode);
      
      const result = await documentAPI.detectMissingDocuments({
        port_codes: portCodes
      });
      
      setMissingDocsResult(result);
    } catch (err) {
      console.error('Analysis failed:', err);
      setAnalysisError(err.response?.data?.detail || err.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const refreshComplianceData = async () => {
    if (!customerId) return;
    try {
      const promises = [documentAPI.getCustomerDocuments(customerId)];
      if (vesselId) {
        promises.unshift(documentAPI.getVesselRoutes(vesselId));
      }
      const results = await Promise.all(promises);
      
      if (vesselId) {
        setVesselRoutes(results[0]);
        setVesselDocuments(results[1]);
      } else {
        setVesselDocuments(results[0]);
      }
    } catch {
      setVesselDocuments([]);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-0)] text-[var(--text-hi)] font-sans selection:bg-[color:var(--accent-1)]/25 overflow-x-hidden">
      {/* Background Ambience — single accent, soft conic glow */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-15%] right-[-10%] w-[560px] h-[560px] glow-conic opacity-60" />
        <div className="absolute bottom-[10%] left-[-8%] w-[420px] h-[420px] rounded-full bg-[color:var(--accent-3)]/10 blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        {/* ModeBanner — usage metrics still mocked per PRD §F2.6/§F2.9 */}
        <div className="mb-8">
          <ModeBanner message="Demo data — usage telemetry, capacity, and analytics will switch to live feeds in v1.x." />
        </div>

        {/* Navigation Header */}
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push('/demo')}
              className="flex items-center gap-2 text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors px-4 py-2 bg-[rgba(15,23,42,0.03)] border border-[var(--line)] rounded-full backdrop-blur-md group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm">Back to Navigator</span>
            </button>
            <div className="h-6 w-px bg-[var(--line)] hidden md:block" />
            <nav className="hidden md:flex items-center gap-2">
               <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Intelligence Center" />
               <TabButton active={activeTab === 'vessel'} onClick={() => setActiveTab('vessel')} label="Vessel Profile" icon={<Ship className="w-4 h-4" />} />
               <TabButton active={activeTab === 'compliance'} onClick={() => setActiveTab('compliance')} label="Compliance" icon={<Shield className="w-4 h-4" />} />
            </nav>
          </div>

          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-[var(--text-hi)] tracking-[-0.01em]">{fullName || email || "Commander"}</p>
                <div className="flex items-center gap-1.5 justify-end">
                   <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                   <p className="text-[10px] uppercase font-mono text-[var(--text-low)] tracking-[0.18em]">Global Ops Active</p>
                </div>
             </div>
             {avatarUrl ? (
               <img
                 src={avatarUrl}
                 alt="avatar"
                 className="w-11 h-11 rounded-2xl border border-[var(--accent-2)]/25 shadow-[0_0_24px_-8px_rgba(37,99,235,0.4)] ring-2 ring-white/40"
               />
             ) : (
               <div className="w-11 h-11 rounded-2xl border border-[var(--accent-2)]/25 bg-white shadow-[0_0_24px_-8px_rgba(37,99,235,0.4)] ring-2 ring-white/40 flex items-center justify-center text-[13px] font-semibold text-[var(--accent-3)]">
                 {(fullName || email || '?').split(/\s+|@/).filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join('') || '?'}
               </div>
             )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              {/* Hero Overview */}
              <header className="mb-12">
                <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-semibold tracking-[-0.04em] mb-3 leading-[1.05]">
                  Mission <span className="accent-serif text-grad-accent">control</span>
                </h1>
                <p className="text-[var(--text-mid)] text-base sm:text-lg max-w-2xl leading-relaxed">
                  A quiet, replayable cockpit for your maritime logistics network. Compliance, routing, and risk — in one surface.
                </p>
              </header>

              {/* Metrics Grid — usage values are intentionally null
                  until /api/usage/me is wired against the llm_calls
                  ledger (PRD §F2.6 + §B7.6). Render an em-dash so the
                  card is honest without going blank. */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <MetricCard
                  title="Session Active Time"
                  value={metrics.activeTime ?? '—'}
                  icon={<Clock className="text-[var(--accent-1)]" />}
                  subText={metrics.activeTime ? 'Continuous monitoring active' : 'Live usage feed: pending'}
                />
                <MetricCard
                  title="Agent Requests"
                  value={metrics.requests != null ? metrics.requests.toLocaleString() : '—'}
                  icon={<TrendingUp className="text-[var(--success)]" />}
                  subText={metrics.requests != null ? 'Last 24 hours' : 'Live usage feed: pending'}
                />
                <MetricCard
                  title="Remaining Capacity"
                  value={metrics.remainingTokens != null ? (metrics.remainingTokens / 1000).toFixed(0) + 'K' : '—'}
                  icon={<Zap className="text-[var(--warn)]" />}
                  subText={metrics.remainingTokens != null ? `${(100 - usedPercentage).toFixed(1)}% credit left` : 'Live usage feed: pending'}
                />
                <MetricCard
                  title="Plan Allocation"
                  value={metrics.totalTokens != null ? (metrics.totalTokens / 1_000_000).toFixed(1) + 'M' : '—'}
                  icon={<Layers className="text-[var(--accent-1)]" />}
                  subText={metrics.totalTokens != null ? 'Token budget' : 'Live usage feed: pending'}
                />
              </div>

              {/* Main Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 space-y-8">
                   <div className="surface-glass rounded-2xl p-8 relative overflow-hidden">
                      <div className="flex justify-between items-start mb-10">
                         <div>
                            <h2 className="text-lg font-semibold mb-1 flex items-center gap-2 tracking-[-0.01em]">
                               <Activity className="w-5 h-5 text-[var(--accent-1)]" />
                               Token consumption
                            </h2>
                            <p className="text-[var(--text-mid)] text-sm">Monthly distribution across the agent cluster.</p>
                         </div>
                         <button className="p-2 bg-[rgba(15,23,42,0.03)] hover:bg-[rgba(15,23,42,0.06)] border border-[var(--line)] rounded-lg transition-colors">
                            <Info className="w-4 h-4 text-[var(--text-low)]" />
                         </button>
                      </div>

                      <div className="relative h-2.5 bg-[rgba(15,23,42,0.04)] rounded-full mb-4 border border-[var(--line)] overflow-hidden">
                         <motion.div
                           initial={{ width: 0 }}
                           animate={{ width: `${usedPercentage}%` }}
                           className="absolute top-0 left-0 h-full bg-grad-accent shadow-[0_0_24px_-8px_rgba(124,58,237,0.6)]"
                         />
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--text-low)]" data-mono>
                         <span>Start: 0</span>
                         <span className="text-[var(--text-mid)]">
                           {metrics.usedTokens != null
                             ? `${metrics.usedTokens.toLocaleString()} used`
                             : 'Awaiting live usage feed'}
                         </span>
                         <span>
                           {metrics.totalTokens != null
                             ? `Max: ${metrics.totalTokens.toLocaleString()}`
                             : 'Max: —'}
                         </span>
                      </div>

                      {/* Honest cluster details — hard-coded marketing
                          numbers (142ms / 100% / AES-256) removed per
                          PRD §F2.6. SLO surfaces will replace these
                          once the obs pipeline lands. */}
                      <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-[var(--line)]">
                         <DetailBox label="Avg latency" value="—" />
                         <DetailBox label="Agent uptime" value="—" />
                         <DetailBox label="Encryption" value="In transit" />
                      </div>
                   </div>

                   {/* Vessel Quick-Access Link */}
                   <button
                     onClick={() => setActiveTab('vessel')}
                     className="w-full group surface-glass rounded-2xl p-6 flex justify-between items-center transition-colors hover:border-[var(--accent-1)]/30"
                   >
                     <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 bg-[color:var(--accent-1)]/10 border border-[color:var(--accent-1)]/25 rounded-xl flex items-center justify-center">
                           <Ship className="w-6 h-6 text-[var(--accent-1)]" />
                        </div>
                        <div>
                           <h3 className="font-medium text-base text-[var(--text-hi)] tracking-[-0.01em]">Configure vessel profile</h3>
                           <p className="text-[var(--text-mid)] text-sm">Set up ship particulars and cargo manifest for routing.</p>
                        </div>
                     </div>
                     <ChevronRight className="w-5 h-5 text-[var(--text-low)] group-hover:translate-x-1 group-hover:text-[var(--accent-1)] transition-all" />
                   </button>
                 </div>

                 <div className="space-y-6">
                    <section className="surface-glass rounded-2xl p-8 text-center">
                       <div className="w-14 h-14 bg-[color:var(--accent-1)]/10 border border-[color:var(--accent-1)]/25 rounded-2xl flex items-center justify-center mx-auto mb-6">
                          <Shield className="w-7 h-7 text-[var(--accent-1)]" />
                       </div>
                       <h2 className="text-lg font-semibold mb-2 tracking-[-0.01em]">Account security</h2>
                       <p className="text-[var(--text-mid)] text-sm mb-7 leading-relaxed">
                         Multi-factor authentication and role-based access control are enabled on this workspace.
                       </p>
                       <div className="space-y-2.5">
                          <StatusButton label="Security logs" />
                          <StatusButton label="Manage API keys" />
                          <button
                            onClick={async () => {
                              await signOut();
                              router.push('/');
                            }}
                            className="w-full py-3 text-[var(--danger)]/80 hover:text-[var(--danger)] transition-colors font-medium text-sm"
                          >
                            Sign out
                          </button>
                       </div>
                    </section>

                    {/* Subscription card — Stripe wiring is pending
                        (PRD §B7), so we show the plan tier honestly
                        and replace the fake renewal date with a
                        placeholder rather than hard-coding it. */}
                    <div className="surface-glass rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                           <Package className="w-4 h-4 text-[var(--accent-1)]" />
                           <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-mid)]">Subscription</span>
                        </div>
                        <p className="text-2xl font-semibold mb-1 tracking-[-0.02em]">Pro plan</p>
                        <p className="text-[var(--text-low)] text-xs">Renewal cycle wires to Stripe in v1.x.</p>
                    </div>
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'vessel' && (
            <motion.div 
              key="vessel"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
               {/* Vessel Profile Section */}
               <div className="flex justify-between items-end mb-10">
                  <div>
                    <h1 className="text-4xl font-bold flex items-center gap-4">
                      <div className="w-12 h-12 bg-[color:var(--accent-1)]/10 rounded-2xl flex items-center justify-center">
                        <Ship className="w-7 h-7 text-[var(--accent-1)]" />
                      </div>
                      Ship Intelligence Profile
                    </h1>
                    <p className="text-[var(--text-mid)] mt-2 ml-16">Define your vessel and cargo parameters for accurate simulation</p>
                  </div>
                  <button 
                    onClick={() => setShowUploadModal(true)}
                    className="bg-grad-accent hover:opacity-95 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[0_18px_40px_-18px_rgba(124,58,237,0.45)] transition-all active:scale-95"
                  >
                    <Upload className="w-4 h-4" />
                    Auto-Fill from File
                  </button>
               </div>

               {/* Form Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Category: Vessel Particulars */}
                  <FormSection title="Vessel Particulars ()" icon={<ClipboardCheck className="w-5 h-5" />}>
                     <div className="grid grid-cols-2 gap-4">
                        <InputField label="Vessel Name ()" value={shipData.vesselName} onChange={(v) => handleShipDataChange('vesselName', v)} placeholder="COSCO SHIPPING..." />
                        <InputField label="Call Sign ()" value={shipData.callSign} onChange={(v) => handleShipDataChange('callSign', v)} placeholder="VRAB2" />
                        <InputField label="IMO Number" value={shipData.imoNumber} onChange={(v) => handleShipDataChange('imoNumber', v)} placeholder="9876543" />
                        <InputField label="MMSI Code" value={shipData.mmsiCode} onChange={(v) => handleShipDataChange('mmsiCode', v)} placeholder="477..." />
                        <InputField label="Flag ()" value={shipData.flag} onChange={(v) => handleShipDataChange('flag', v)} placeholder="Hong Kong" />
                        <InputField label="Vessel Type" value={shipData.vesselType} onChange={(v) => handleShipDataChange('vesselType', v)} placeholder="ULCV" />
                     </div>
                  </FormSection>

                  {/* Category: Voyage Information */}
                  <FormSection title="Voyage Information ()" icon={<MapPin className="w-5 h-5" />}>
                     <div className="grid grid-cols-2 gap-4">
                        <InputField label="Original Voyage" value={shipData.originalVoyage} onChange={(v) => handleShipDataChange('originalVoyage', v)} placeholder="045W" />
                        <InputField label="New Voyage" value={shipData.newVoyage} onChange={(v) => handleShipDataChange('newVoyage', v)} placeholder="045W-C" />
                        <InputField label="Port of Loading" value={shipData.portOfLoading} onChange={(v) => handleShipDataChange('portOfLoading', v)} placeholder="Shanghai" />
                        <InputField label="Port Of Discharge" value={shipData.portOfDischarge} onChange={(v) => handleShipDataChange('portOfDischarge', v)} placeholder="Rotterdam" />
                        <InputField label="Original ETA" type="date" value={shipData.etaOriginal} onChange={(v) => handleShipDataChange('etaOriginal', v)} />
                        <InputField label="Expected New ETA" type="date" value={shipData.etaNew} onChange={(v) => handleShipDataChange('etaNew', v)} />
                     </div>
                  </FormSection>

                  {/* Category: Cargo Details */}
                  <FormSection title="Cargo Details ()" icon={<Package className="w-5 h-5" />}>
                     <div className="grid grid-cols-2 gap-4">
                        <InputField label="Cargo Name" value={shipData.cargoName} onChange={(v) => handleShipDataChange('cargoName', v)} placeholder="Smartwatch Comp." />
                        <InputField label="HS Code" value={shipData.hsCode} onChange={(v) => handleShipDataChange('hsCode', v)} placeholder="8517.7900" />
                        <InputField label="Dangerous Attributes" value={shipData.dgClass} onChange={(v) => handleShipDataChange('dgClass', v)} placeholder="Class 9, UN 3481" />
                        <InputField label="Weight" value={shipData.weight} onChange={(v) => handleShipDataChange('weight', v)} placeholder="12,500 KGS" />
                        <InputField label="Volume" value={shipData.volume} onChange={(v) => handleShipDataChange('volume', v)} placeholder="45 CBM" />
                        <div className="flex items-end pb-1">
                           <button className="w-full h-11 bg-[var(--bg-1)] hover:bg-[var(--bg-2)] border border-[var(--line)] rounded-lg text-xs font-bold transition-all">SAVE DRAFT</button>
                        </div>
                     </div>
                  </FormSection>

                  {/* Extra Analysis Info */}
                  <section className="bg-gradient-to-br from-[color:var(--accent-1)]/10 to-[color:var(--accent-3)]/5 border border-[var(--line)] rounded-3xl p-8">
                     <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <History className="w-5 h-5 text-[var(--success)]" />
                        Compliance Analysis Notes
                     </h3>
                     <div className="space-y-4">
                        <AnalysisPoint label="HS Code Stability" status="Stable" />
                        <AnalysisPoint label="Voyage Plan Status" status="Requires Update" alert />
                        <AnalysisPoint label="Legal Documentation" status="Verified" />
                        <div className="mt-8 pt-8 border-t border-[var(--line)]">
                           <button 
                             onClick={() => router.push('/port')}
                             className="w-full py-4 bg-grad-accent hover:opacity-95 text-white rounded-2xl font-semibold tracking-widest uppercase text-sm shadow-xl shadow-[0_18px_40px_-18px_rgba(124,58,237,0.55)] transition-all active:scale-95"
                           >
                              Apply to Simulation
                           </button>
                        </div>
                     </div>
                  </section>
               </div>
            </motion.div>
          )}

          {activeTab === 'compliance' && (
            <motion.div 
              key="compliance"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
               {/* Compliance Analysis Section */}
               <div className="flex justify-between items-end mb-10">
                  <div>
                    <h1 className="text-4xl font-bold flex items-center gap-4">
                      <div className="w-12 h-12 bg-[color:var(--success)]/10 rounded-2xl flex items-center justify-center">
                        <Shield className="w-7 h-7 text-[var(--success)]" />
                      </div>
                      Compliance Analysis
                    </h1>
                    <p className="text-[var(--text-mid)] mt-2 ml-16">Detect missing documents and compliance gaps for your voyage routes</p>
                  </div>
                  <button 
                    onClick={refreshComplianceData}
                    className="flex items-center gap-2 text-[var(--text-mid)] hover:text-[var(--text-hi)] px-4 py-2.5 bg-[var(--bg-1)] hover:bg-[var(--bg-2)] border border-[var(--line)] rounded-xl transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Data
                  </button>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column - Route Selection & Documents */}
                  <div className="lg:col-span-2 space-y-6">
                     {/* Route Selection Panel */}
                     <section className="bg-white border border-[var(--line)] rounded-[2.5rem] p-8">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                           <Navigation className="w-5 h-5 text-[var(--accent-1)]" />
                           Route Selection
                        </h3>

                        {/* Route Dropdown */}
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <label className="text-[10px] uppercase font-bold text-[var(--text-low)] ml-1 tracking-widest">Select Route</label>
                              <div className="relative">
                                 <select 
                                    value={selectedRoute?.id || ''}
                                    onChange={(e) => {
                                       const route = vesselRoutes.find(r => r.id === parseInt(e.target.value));
                                       setSelectedRoute(route || null);
                                    }}
                                    className="w-full bg-[var(--bg-1)] border border-[var(--line)] rounded-xl px-4 py-3 text-sm font-medium focus:border-[color:var(--accent-1)]/50 focus:ring-1 focus:ring-[color:var(--accent-1)]/30 outline-none transition-all appearance-none cursor-pointer"
                                 >
                                    <option value="">Select a route...</option>
                                    {vesselRoutes.map(route => (
                                       <option key={route.id} value={route.id}>
                                          {route.route_name} {route.is_active ? '(Active)' : ''}
                                       </option>
                                    ))}
                                 </select>
                                 <ChevronRight className="w-4 h-4 text-[var(--text-low)] absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                              </div>
                           </div>

                           {/* Selected Route Info */}
                           {selectedRoute && (
                              <div className="bg-[color:var(--accent-1)]/8 border border-[color:var(--accent-1)]/25 rounded-2xl p-4">
                                 <div className="flex items-center gap-2 text-[var(--accent-1)] text-xs font-bold uppercase tracking-widest mb-3">
                                    <Anchor className="w-4 h-4" />
                                    Route Ports
                                 </div>
                                 <div className="flex flex-wrap items-center gap-2">
                                    {selectedRoute.port_codes.map((port, idx) => (
                                       <React.Fragment key={port}>
                                          <span className="bg-[var(--bg-2)] text-white px-3 py-1.5 rounded-lg text-sm font-mono font-bold">
                                             {port}
                                          </span>
                                          {idx < selectedRoute.port_codes.length - 1 && (
                                             <ChevronRight className="w-4 h-4 text-[var(--text-low)]" />
                                          )}
                                       </React.Fragment>
                                    ))}
                                 </div>
                              </div>
                           )}

                           {/* Port Selector - Always Visible */}
                           <div className="pt-4 border-t border-[var(--line)] space-y-4">
                                    <div className="flex items-center justify-between">
                                 <span className="text-sm font-bold flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-[var(--accent-1)]" />
                                    Add Ports for Analysis
                                 </span>
                                 {selectedRoutePorts.length > 0 && (
                                    <button 
                                       onClick={() => {
                                          setSelectedRoutePorts([]);
                                          setPortSearchQuery('');
                                       }} 
                                       className="text-[var(--text-mid)] hover:text-[var(--text-hi)] text-xs"
                                    >
                                       Clear All
                                       </button>
                                 )}
                                    </div>
                                    
                                    {/* Port Selector */}
                                    <div className="space-y-2">
                                       <label className="text-[10px] uppercase font-bold text-[var(--text-low)] ml-1 tracking-widest">
                                          Select Ports 
                                          {allPorts.length > 0 && (
                                             <span className="text-[var(--accent-1)] ml-2">({allPorts.length} available)</span>
                                          )}
                                       </label>
                                       
                                       {/* Search Input */}
                                       <div className="relative">
                                          <input 
                                             type="text"
                                             value={portSearchQuery}
                                             onChange={(e) => {
                                                setPortSearchQuery(e.target.value);
                                                setShowPortDropdown(true);
                                             }}
                                             onFocus={() => setShowPortDropdown(true)}
                                             onBlur={() => setTimeout(() => setShowPortDropdown(false), 300)}
                                             placeholder="Click to browse or type to search..."
                                             className="w-full bg-[var(--bg-1)] border border-[var(--line)] rounded-xl px-4 py-3 text-sm font-medium focus:border-[color:var(--accent-1)]/50 focus:ring-1 focus:ring-[color:var(--accent-1)]/30 outline-none transition-all placeholder:text-[var(--text-low)]"
                                          />
                                          
                                          {/* Dropdown */}
                                          {showPortDropdown && allPorts.length > 0 && (
                                             <div className="absolute z-50 w-full mt-2 bg-[#0f172a] border border-[var(--line)] rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                                                {(() => {
                                                   const query = portSearchQuery.toLowerCase();
                                                   const filtered = allPorts
                                                      .filter(port => {
                                                         if (!query) return true; // Show all if no query
                                                         return (
                                                            port.name.toLowerCase().includes(query) ||
                                                            port.country.toLowerCase().includes(query) ||
                                                            port.un_locode.toLowerCase().includes(query)
                                                         );
                                                      })
                                                      .filter(port => !selectedRoutePorts.find(sp => sp.un_locode === port.un_locode))
                                                      .slice(0, 15);
                                                   
                                                   if (filtered.length === 0) {
                                                      return (
                                                         <div className="px-4 py-3 text-center text-[var(--text-low)] text-sm">
                                                            No ports found
                                                         </div>
                                                      );
                                                   }
                                                   
                                                   return filtered.map(port => (
                                                      <button
                                                         key={port.id}
                                                         onClick={() => {
                                                            setSelectedRoutePorts(prev => [...prev, port]);
                                                            setPortSearchQuery('');
                                                            setShowPortDropdown(false);
                                                         }}
                                                         className="w-full px-4 py-3 text-left hover:bg-[color:var(--accent-1)]/10 border-b border-[var(--line)] last:border-0 transition-colors"
                                                      >
                                                         <div className="flex items-center justify-between">
                                                            <div>
                                                               <span className="font-bold text-sm">{port.name}</span>
                                                               <span className="text-[var(--text-mid)] text-xs ml-2">({port.un_locode})</span>
                                                            </div>
                                                            <span className="text-[var(--text-low)] text-xs">{port.country}</span>
                                                         </div>
                                                      </button>
                                                   ));
                                                })()}
                                             </div>
                                          )}
                                       </div>
                                       
                                       {/* Selected Ports */}
                                       {selectedRoutePorts.length > 0 && (
                                          <div className="space-y-2">
                                             <div className="flex items-center gap-2 text-[var(--accent-1)] text-xs font-bold uppercase tracking-widest">
                                                <Anchor className="w-3 h-3" />
                                                Selected Route ({selectedRoutePorts.length} ports)
                                             </div>
                                             <div className="bg-[color:var(--accent-1)]/8 border border-[color:var(--accent-1)]/25 rounded-xl p-3 space-y-2">
                                                {selectedRoutePorts.map((port, idx) => (
                                                   <div key={port.un_locode} className="flex items-center justify-between bg-[var(--bg-1)] rounded-lg px-3 py-2">
                                                      <div className="flex items-center gap-3">
                                                         <span className="text-[var(--text-mid)] text-xs font-bold">{idx + 1}</span>
                                                         <div>
                                                            <span className="font-bold text-sm">{port.name}</span>
                                                            <span className="text-[var(--text-mid)] text-xs ml-2">({port.un_locode})</span>
                                                         </div>
                                                      </div>
                                                      <button
                                                         onClick={() => setSelectedRoutePorts(prev => prev.filter(p => p.un_locode !== port.un_locode))}
                                                         className="text-[var(--danger)] hover:text-red-300 transition-colors"
                                                      >
                                                         <X className="w-4 h-4" />
                                                      </button>
                                                   </div>
                                                ))}
                                                
                                                {/* Route Preview */}
                                          <div className="pt-2 border-t border-[var(--line)] flex items-center gap-2 text-xs flex-wrap">
                                                   <span className="text-[var(--text-low)]">Route:</span>
                                                   {selectedRoutePorts.map((port, idx) => (
                                                      <React.Fragment key={port.un_locode}>
                                                         <span className="font-mono text-[var(--text-mid)]">{port.un_locode}</span>
                                                         {idx < selectedRoutePorts.length - 1 && (
                                                            <ChevronRight className="w-3 h-3 text-[var(--text-low)]" />
                                                         )}
                                                      </React.Fragment>
                                                   ))}
                                                </div>
                                             </div>
                                          </div>
                                       )}
                                    </div>
                                    
                              {/* Save as Route - Only show when vessel is available */}
                              {vesselId && selectedRoutePorts.length > 0 && (
                                 <div className="pt-4 border-t border-[var(--line)] space-y-3">
                                    <span className="text-[10px] uppercase font-bold text-[var(--text-low)] tracking-widest">
                                       Save as Route (Optional)
                                    </span>
                                    <input 
                                       type="text"
                                       value={newRouteName}
                                       onChange={(e) => setNewRouteName(e.target.value)}
                                       placeholder="Route name (e.g., Asia-Europe Express)"
                                       className="w-full bg-[var(--bg-1)] border border-[var(--line)] rounded-xl px-4 py-3 text-sm font-medium focus:border-[color:var(--accent-1)]/50 focus:ring-1 focus:ring-[color:var(--accent-1)]/30 outline-none transition-all placeholder:text-[var(--text-low)]"
                                    />
                                    <button 
                                       onClick={handleCreateRoute}
                                       disabled={isCreatingRoute || !newRouteName.trim()}
                                       className="w-full py-3 bg-grad-accent hover:opacity-95 disabled:bg-[var(--bg-2)] disabled:text-[var(--text-low)] text-white rounded-xl font-bold text-sm transition-all"
                                    >
                                       {isCreatingRoute ? 'Saving...' : 'Save Route'}
                                    </button>
                                 </div>
                              )}
                           </div>
                        </div>
                     </section>

                     {/* Documents on File */}
                     <section className="bg-white border border-[var(--line)] rounded-[2.5rem] p-8">
                        <div className="flex items-center justify-between mb-6">
                           <h3 className="text-lg font-bold flex items-center gap-2">
                              <FileText className="w-5 h-5 text-[var(--accent-1)]" />
                              Documents on File
                           </h3>
                           <span className="text-[var(--text-mid)] text-sm">{vesselDocuments.length} documents</span>
                        </div>

                        {vesselDocuments.length === 0 ? (
                           <div className="text-center py-12">
                              <FileText className="w-12 h-12 text-[var(--text-low)] mx-auto mb-4" />
                              <p className="text-[var(--text-mid)] text-sm">No documents uploaded yet</p>
                           </div>
                        ) : (
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <DocumentCountCard label="Total Documents" count={vesselDocuments.length} color="indigo" />
                              <DocumentCountCard 
                                 label="Valid" 
                                 count={vesselDocuments.filter(d => {
                                    if (!d.expiry_date) return true;
                                    return new Date(d.expiry_date) > new Date();
                                 }).length} 
                                 color="emerald" 
                              />
                              <DocumentCountCard 
                                 label="Expiring Soon" 
                                 count={vesselDocuments.filter(d => {
                                    if (!d.expiry_date) return false;
                                    const daysUntil = Math.ceil((new Date(d.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                                    return daysUntil > 0 && daysUntil <= 30;
                                 }).length} 
                                 color="amber" 
                              />
                              <DocumentCountCard 
                                 label="Expired" 
                                 count={vesselDocuments.filter(d => {
                                    if (!d.expiry_date) return false;
                                    return new Date(d.expiry_date) <= new Date();
                                 }).length} 
                                 color="red" 
                              />
                           </div>
                        )}
                     </section>

                     {/* Analysis Results */}
                     {missingDocsResult && (
                        <section className="bg-white border border-[var(--line)] rounded-[2.5rem] p-8">
                           <div className="flex items-center justify-between mb-6">
                              <h3 className="text-lg font-bold flex items-center gap-2">
                                 <ClipboardCheck className="w-5 h-5 text-[var(--success)]" />
                                 Analysis Results
                              </h3>
                              <span className="text-[var(--text-mid)] text-sm">
                                 Route: {missingDocsResult.route_name}
                              </span>
                           </div>
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
                        </section>
                     )}
                  </div>

                  {/* Right Column - Action Panel */}
                  <div className="space-y-6">
                     {/* Run Analysis Card */}
                     <section className="bg-gradient-to-br from-[color:var(--accent-1)]/15 to-[color:var(--accent-3)]/10 border border-[color:var(--accent-1)]/25 rounded-[2rem] p-8">
                        <div className="w-16 h-16 bg-[color:var(--success)]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                           <Search className="w-8 h-8 text-[var(--success)]" />
                        </div>
                        <h2 className="text-xl font-bold mb-2 text-center">Run Compliance Analysis</h2>
                        <p className="text-[var(--text-mid)] text-sm mb-8 text-center leading-relaxed">
                           AI agents will analyze your documents against route requirements to identify gaps.
                        </p>

                        {analysisError && (
                           <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-[var(--danger)] text-sm flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              {analysisError}
                           </div>
                        )}

                        <button 
                           onClick={handleRunAnalysis}
                           disabled={(!selectedRoute && selectedRoutePorts.length === 0) || isAnalyzing}
                           className="w-full py-4 bg-grad-accent hover:opacity-95 disabled:bg-[var(--bg-2)] disabled:text-[var(--text-low)] text-white rounded-2xl font-semibold tracking-widest uppercase text-sm shadow-xl shadow-[0_18px_40px_-18px_rgba(124,58,237,0.55)] transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                           {isAnalyzing ? (
                              <>
                                 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                 Analyzing...
                              </>
                           ) : (
                              <>
                                 <Search className="w-4 h-4" />
                                 Run Analysis
                              </>
                           )}
                        </button>

                        {!selectedRoute && selectedRoutePorts.length === 0 && (
                           <p className="text-[var(--warn)]/60 text-xs text-center mt-4">
                              Please select a route or add ports for analysis
                           </p>
                        )}
                        {vesselDocuments.length === 0 && (selectedRoute || selectedRoutePorts.length > 0) && (
                           <p className="text-[var(--accent-1)]/60 text-xs text-center mt-4">
                              No documents uploaded yet - analysis will show all required documents
                           </p>
                        )}
                     </section>

                     {/* Analysis Info */}
                     <section className="bg-white border border-[var(--line)] rounded-[2rem] p-6">
                        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                           <Info className="w-4 h-4 text-[var(--accent-1)]" />
                           How It Works
                        </h3>
                        <div className="space-y-3 text-sm text-[var(--text-mid)]">
                           <div className="flex gap-3">
                              <span className="text-[var(--accent-1)] font-bold">1.</span>
                              <span>Route Requirements Analyst identifies all required documents</span>
                           </div>
                           <div className="flex gap-3">
                              <span className="text-[var(--accent-1)] font-bold">2.</span>
                              <span>Gap Detector compares your documents against requirements</span>
                           </div>
                           <div className="flex gap-3">
                              <span className="text-[var(--accent-1)] font-bold">3.</span>
                              <span>AI generates prioritized recommendations for compliance</span>
                           </div>
                        </div>
                     </section>

                     {/* Quick Stats */}
                     {missingDocsResult && (
                        <section className="bg-white border border-[var(--line)] rounded-[2rem] p-6">
                           <h3 className="text-sm font-bold mb-4">Quick Summary</h3>
                           <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                 <span className="text-[var(--text-mid)] text-sm">Compliance Score</span>
                                 <span className={`font-bold ${
                                    missingDocsResult.compliance_score >= 80 ? 'text-[var(--success)]' :
                                    missingDocsResult.compliance_score >= 50 ? 'text-[var(--warn)]' : 'text-[var(--danger)]'
                                 }`}>
                                    {missingDocsResult.compliance_score}%
                                 </span>
                              </div>
                              <div className="flex justify-between items-center">
                                 <span className="text-[var(--text-mid)] text-sm">Missing Documents</span>
                                 <span className="font-bold text-[var(--danger)]">{missingDocsResult.missing_documents.length}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                 <span className="text-[var(--text-mid)] text-sm">Recommendations</span>
                                 <span className="font-bold text-[var(--accent-1)]">{missingDocsResult.recommendations.length}</span>
                              </div>
                           </div>
                        </section>
                     )}
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload Modal (Overlay) */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[var(--bg-1)]/95 backdrop-blur-xl flex items-center justify-center p-6"
          >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               exit={{ scale: 0.9, y: 20 }}
               className="bg-[#0f172a] border border-[var(--line)] rounded-[2.5rem] w-full max-w-xl p-10 relative shadow-2xl overflow-hidden"
             >
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-2 bg-grad-accent" />
                
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="absolute top-8 right-8 text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="text-center mb-10">
                   <div className="w-20 h-20 bg-[color:var(--accent-1)]/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                      <FileText className="w-10 h-10 text-[var(--accent-1)]" />
                   </div>
                   <h2 className="text-3xl font-bold mb-2">Multi-Document Upload</h2>
                   <p className="text-[var(--text-mid)]">Upload your vessel certificates and shipping docs for analysis</p>
                </div>

                {!isParsing ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div
                      onClick={handleDropZoneClick}
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className="border-2 border-dashed border-[var(--line)] rounded-3xl p-12 text-center hover:border-[color:var(--accent-1)]/40 hover:bg-[color:var(--accent-1)]/8 transition-all cursor-pointer group"
                    >
                       <Plus className="w-10 h-10 text-[var(--text-low)] group-hover:text-[var(--accent-1)] mx-auto mb-4 transition-all group-hover:scale-110" />
                       <p className="font-bold text-lg mb-1">Drag and Drop Files Here</p>
                       <p className="text-sm text-[var(--text-low)]">Supports PDF, PNG, JPG (Max 50MB per file)</p>
                       <div className="mt-8 flex justify-center gap-2">
                          <FileIcon /> <FileIcon /> <FileIcon />
                       </div>
                    </div>
                    {uploadError && (
                      <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-[var(--danger)] text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {uploadError}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 px-6">
                    <div className="flex justify-between items-center mb-4">
                       <span className="text-[var(--accent-1)] font-bold uppercase tracking-widest text-xs animate-pulse">Analyzing Documents...</span>
                       <span className="text-[var(--text-mid)] font-mono">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-[var(--bg-1)] rounded-full overflow-hidden border border-[var(--line)]">
                       <motion.div 
                         animate={{ width: `${uploadProgress}%` }}
                         className="h-full bg-grad-accent shadow-[0_0_18px_rgba(124,58,237,0.55)]"
                       />
                    </div>
                    <div className="mt-8 space-y-4">
                       <ParsingStep label="Extracting Vessel Metadata" active={uploadProgress > 20} completed={uploadProgress > 50} />
                       <ParsingStep label="Cross-checking Voyage Plan" active={uploadProgress > 50} completed={uploadProgress > 80} />
                       <ParsingStep label="Validating Compliance HS-Codes" active={uploadProgress > 80} completed={uploadProgress === 100} />
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

// --- Sub-components ---

function TabButton({ active, onClick, label, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        active
          ? 'bg-[var(--accent-2)]/15 text-[var(--text-hi)] border border-[var(--accent-1)]/30 shadow-[0_0_24px_-12px_rgba(124,58,237,0.6)]'
          : 'text-[var(--text-mid)] hover:text-[var(--text-hi)] bg-white hover:bg-[var(--bg-1)] border border-transparent hover:border-[var(--line)]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MetricCard({ title, value, icon, subText }) {
  return (
    <div className="surface-glass rounded-2xl p-6 group transition-colors hover:border-[var(--accent-1)]/25">
      <div className="w-9 h-9 rounded-lg bg-[rgba(15,23,42,0.04)] border border-[var(--line)] flex items-center justify-center mb-5 transition-transform group-hover:scale-105">
        {icon}
      </div>
      <p className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--text-low)] mb-1.5">{title}</p>
      <h3 className="text-3xl font-semibold text-[var(--text-hi)] tabular-nums tracking-[-0.02em]" data-mono>{value}</h3>
      <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--text-low)] group-hover:text-[var(--accent-1)]/70 transition-colors">{subText}</p>
    </div>
  );
}

function DetailBox({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--text-low)] mb-1.5">{label}</p>
      <p className="text-lg font-semibold text-[var(--text-hi)] tabular-nums" data-mono>{value}</p>
    </div>
  );
}

function StatusButton({ label }) {
  return (
    <button className="w-full py-3 bg-[rgba(15,23,42,0.03)] hover:bg-[rgba(15,23,42,0.06)] border border-[var(--line)] hover:border-[var(--line-strong)] rounded-xl text-sm font-medium text-[var(--text-mid)] transition-colors hover:text-[var(--text-hi)]">
      {label}
    </button>
  );
}

function FormSection({ title, icon, children }) {
  return (
    <section className="surface-glass rounded-2xl p-8">
       <h3 className="text-base font-semibold mb-7 flex items-center gap-2 text-[var(--text-hi)] tracking-[-0.01em]">
          <span className="text-[var(--accent-1)]">{icon}</span>
          {title}
       </h3>
       {children}
    </section>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="space-y-2">
       <label className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--text-low)] ml-1">{label}</label>
       <input
         type={type}
         value={value}
         onChange={(e) => onChange(e.target.value)}
         placeholder={placeholder}
         className="w-full bg-[var(--bg-1)] border border-[var(--line)] rounded-lg px-4 py-2.5 text-sm font-normal text-[var(--text-hi)] focus:border-[var(--accent-1)]/50 focus:ring-1 focus:ring-[var(--accent-1)]/30 outline-none transition-colors placeholder:text-[var(--text-low)]"
       />
    </div>
  );
}

function AnalysisPoint({ label, status, alert }) {
  return (
    <div className="flex justify-between items-center py-2">
       <span className="text-sm font-normal text-[var(--text-mid)]">{label}</span>
       <span
         className={`text-[10px] uppercase font-mono tracking-[0.16em] px-2.5 py-1 rounded-full border ${
           alert
             ? 'border-[color:var(--warn)]/30 bg-[color:var(--warn)]/10 text-[var(--warn)]'
             : 'border-[color:var(--success)]/30 bg-[color:var(--success)]/10 text-[var(--success)]'
         }`}
       >
          {status}
       </span>
    </div>
  );
}

function FileIcon() {
  return (
    <div className="w-8 h-8 bg-[rgba(15,23,42,0.04)] border border-[var(--line)] rounded-lg flex items-center justify-center text-[var(--text-low)]">
      <FileText className="w-4 h-4" />
    </div>
  );
}

function ParsingStep({ label, active, completed }) {
  return (
    <div className="flex items-center gap-4 py-1">
       {completed ? (
         <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
       ) : active ? (
         <div className="w-5 h-5 border-2 border-[var(--accent-1)] border-t-transparent rounded-full animate-spin" />
       ) : (
         <div className="w-5 h-5 border-2 border-[var(--line)] rounded-full" />
       )}
       <span
         className={`text-sm font-normal ${
           completed ? 'text-[var(--text-hi)]' : active ? 'text-[var(--text-hi)]' : 'text-[var(--text-low)]'
         }`}
       >
         {label}
       </span>
    </div>
  );
}

function DocumentCountCard({ label, count, color }) {
  // Status semantics only — all chips inherit the Plimsoll palette so
  // the page stays on a single accent gradient with status accents.
  const palette: Record<string, string> = {
    emerald: 'bg-[color:var(--success)]/10 text-[var(--success)] border-[color:var(--success)]/25',
    amber:   'bg-[color:var(--warn)]/10 text-[var(--warn)] border-[color:var(--warn)]/25',
    red:     'bg-[color:var(--danger)]/10 text-[var(--danger)] border-[color:var(--danger)]/25',
    indigo:  'bg-[color:var(--accent-3)]/12 text-[var(--accent-1)] border-[color:var(--accent-1)]/25',
    blue:    'bg-[color:var(--info)]/10 text-[var(--info)] border-[color:var(--info)]/25',
  };

  return (
    <div className={`p-4 rounded-xl border text-center ${palette[color] || palette.indigo}`}>
      <div className="text-2xl font-semibold tabular-nums" data-mono>{count}</div>
      <div className="text-[10px] uppercase font-mono tracking-[0.16em] opacity-70 mt-1.5">{label}</div>
    </div>
  );
}


export default UsersHome;

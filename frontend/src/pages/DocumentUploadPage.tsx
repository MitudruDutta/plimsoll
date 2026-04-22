import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import {
  DocumentUploadZone,
  AnalysisProgress,
  GapAnalysisReport,
  DEFAULT_ANALYSIS_STEPS,
  MISSING_DOCS_ANALYSIS_STEPS
} from '../components/documents';
import type { AnalysisStep } from '../components/documents';
import documentAPI, {
  type Vessel,
  type DocumentInfo,
  type DocumentAnalysisResponse,
  type VesselRoute,
  type MissingDocsResponse
} from '../services/documentApi';

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  documentInfo?: DocumentInfo;
}

const DOCUMENT_TYPES = [
  { value: 'safety_certificate', label: 'Safety Certificate' },
  { value: 'load_line_certificate', label: 'Load Line Certificate' },
  { value: 'marpol_certificate', label: 'MARPOL Certificate' },
  { value: 'crew_certificate', label: 'Crew Certificate' },
  { value: 'ism_certificate', label: 'ISM Certificate' },
  { value: 'isps_certificate', label: 'ISPS Certificate' },
  { value: 'class_certificate', label: 'Class Certificate' },
  { value: 'insurance_certificate', label: 'Insurance Certificate' },
  { value: 'tonnage_certificate', label: 'Tonnage Certificate' },
  { value: 'registry_certificate', label: 'Registry Certificate' },
  { value: 'other', label: 'Other' }
];

export function DocumentUploadPage() {
  // State
  const [customerId] = useState<number>(1); // TODO: Get from auth context
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [portCodes, setPortCodes] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>(DEFAULT_ANALYSIS_STEPS);
  const [currentStep, setCurrentStep] = useState(-1);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResponse | null>(null);
  const [missingDocsResult, setMissingDocsResult] = useState<MissingDocsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Document upload form state
  const [selectedDocType, setSelectedDocType] = useState<string>('other');
  const [documentTitle, setDocumentTitle] = useState<string>('');

  // Route state
  const [vesselRoutes, setVesselRoutes] = useState<VesselRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<VesselRoute | null>(null);
  const [routeMode, setRouteMode] = useState<'route' | 'manual'>('route');
  const [showCreateRoute, setShowCreateRoute] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [newRoutePorts, setNewRoutePorts] = useState('');

  // Load vessels on mount
  useEffect(() => {
    const loadVessels = async () => {
      try {
        const data = await documentAPI.getVessels(customerId);
        setVessels(data);
        if (data.length > 0) {
          setSelectedVessel(data[0]);
        }
      } catch (err) {
        console.error('Failed to load vessels:', err);
        setError('Failed to load vessels. Please try again.');
      }
    };
    loadVessels();
  }, [customerId]);

  // Load routes when vessel changes
  useEffect(() => {
    if (!selectedVessel) {
      setVesselRoutes([]);
      setSelectedRoute(null);
      return;
    }

    const loadRoutes = async () => {
      try {
        const routes = await documentAPI.getVesselRoutes(selectedVessel.id);
        setVesselRoutes(routes);
        const activeRoute = routes.find(r => r.is_active);
        if (activeRoute) {
          setSelectedRoute(activeRoute);
          setPortCodes(activeRoute.port_codes.join(', '));
          setRouteMode('route');
        } else if (routes.length > 0) {
          setSelectedRoute(routes[0]);
          setPortCodes(routes[0].port_codes.join(', '));
          setRouteMode('route');
        } else {
          setSelectedRoute(null);
          setRouteMode('manual');
        }
      } catch (err) {
        console.error('Failed to load routes:', err);
        setRouteMode('manual');
      }
    };
    loadRoutes();
  }, [selectedVessel]);

  // Create new route
  const handleCreateRoute = useCallback(async () => {
    if (!selectedVessel || !newRouteName.trim() || !newRoutePorts.trim()) return;

    const ports = newRoutePorts.split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
    if (ports.length === 0) return;

    try {
      const newRoute = await documentAPI.createRoute(selectedVessel.id, {
        route_name: newRouteName.trim(),
        port_codes: ports,
        set_active: true,
      });
      setVesselRoutes(prev => [newRoute, ...prev.map(r => ({ ...r, is_active: false }))]);
      setSelectedRoute(newRoute);
      setPortCodes(newRoute.port_codes.join(', '));
      setRouteMode('route');
      setShowCreateRoute(false);
      setNewRouteName('');
      setNewRoutePorts('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create route');
    }
  }, [selectedVessel, newRouteName, newRoutePorts]);

  // Detect missing documents (new workflow)
  const handleDetectMissing = useCallback(async () => {
    if (!selectedVessel) {
      setError('Please select a vessel');
      return;
    }

    if (routeMode === 'route' && !selectedRoute) {
      setError('Please select a route or create one');
      return;
    }

    if (routeMode === 'manual') {
      const ports = portCodes.split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
      if (ports.length === 0) {
        setError('Please enter at least one port code');
        return;
      }
    }

    setIsAnalyzing(true);
    setError(null);
    setMissingDocsResult(null);
    setAnalysisResult(null);

    // Use 2-step progress for missing docs workflow
    setAnalysisSteps(MISSING_DOCS_ANALYSIS_STEPS.map(s => ({ ...s, status: 'pending' as const })));
    setCurrentStep(0);

    const stepDurations = [3000, 3000];
    for (let i = 0; i < stepDurations.length; i++) {
      setCurrentStep(i);
      setAnalysisSteps(prev =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: 'running' } :
          idx < i ? { ...s, status: 'complete' } : s
        )
      );
      await new Promise(resolve => setTimeout(resolve, stepDurations[i]));
    }

    try {
      const result = await documentAPI.detectMissingDocuments({
        vessel_id: selectedVessel.id,
        route_id: selectedRoute?.id,
      });

      setAnalysisSteps(prev => prev.map(s => ({ ...s, status: 'complete' as const })));
      setMissingDocsResult(result);
    } catch (err: any) {
      setAnalysisSteps(prev =>
        prev.map((s, idx) =>
          idx === currentStep ? { ...s, status: 'error' as const } : s
        )
      );
      setError(err.response?.data?.detail || err.message || 'Missing documents detection failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedVessel, selectedRoute, routeMode, portCodes, currentStep]);

  // Handle file selection
  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (!selectedVessel) {
      setError('Please select a vessel first');
      return;
    }

    // Create file entries
    const newFiles: UploadedFile[] = files.map(file => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending' as const,
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setIsUploading(true);
    setError(null);

    // Upload each file
    for (const uploadedFile of newFiles) {
      try {
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === uploadedFile.id ? { ...f, status: 'uploading', progress: 50 } : f
          )
        );

        const result = await documentAPI.uploadDocument({
          customer_id: customerId,
          vessel_id: selectedVessel.id,
          document_type: selectedDocType,
          title: documentTitle || uploadedFile.file.name,
          file: uploadedFile.file
        });

        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === uploadedFile.id
              ? { ...f, status: 'success', progress: 100, documentInfo: result }
              : f
          )
        );
      } catch (err: any) {
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === uploadedFile.id
              ? { ...f, status: 'error', error: err.message || 'Upload failed' }
              : f
          )
        );
      }
    }

    setIsUploading(false);
  }, [customerId, selectedVessel, selectedDocType, documentTitle]);

  // Run analysis
  const handleAnalyze = useCallback(async () => {
    if (!selectedVessel) {
      setError('Please select a vessel');
      return;
    }

    const successfulUploads = uploadedFiles.filter(f => f.status === 'success');
    if (successfulUploads.length === 0) {
      setError('Please upload at least one document');
      return;
    }

    const ports = portCodes.split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
    if (ports.length === 0) {
      setError('Please enter at least one port code');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    // Reset analysis steps
    setAnalysisSteps(DEFAULT_ANALYSIS_STEPS.map(s => ({ ...s, status: 'pending' as const })));
    setCurrentStep(0);

    // Simulate step progress (in a real app, this would be based on SSE/WebSocket updates)
    const stepDurations = [2000, 3000, 2500];

    for (let i = 0; i < stepDurations.length; i++) {
      setCurrentStep(i);
      setAnalysisSteps(prev =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: 'running' } :
          idx < i ? { ...s, status: 'complete' } : s
        )
      );

      await new Promise(resolve => setTimeout(resolve, stepDurations[i]));
    }

    try {
      const result = await documentAPI.analyzeDocuments({
        vessel_id: selectedVessel.id,
        port_codes: ports,
        document_ids: successfulUploads
          .filter(f => f.documentInfo)
          .map(f => f.documentInfo!.id)
      });

      // Mark all steps as complete
      setAnalysisSteps(prev => prev.map(s => ({ ...s, status: 'complete' as const })));
      setAnalysisResult(result);

    } catch (err: any) {
      // Mark current step as error
      setAnalysisSteps(prev =>
        prev.map((s, idx) =>
          idx === currentStep ? { ...s, status: 'error' as const } : s
        )
      );
      setError(err.response?.data?.detail || err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedVessel, uploadedFiles, portCodes, currentStep]);

  // Clear uploads
  const handleClearUploads = useCallback(() => {
    setUploadedFiles([]);
    setAnalysisResult(null);
    setMissingDocsResult(null);
    setAnalysisSteps(DEFAULT_ANALYSIS_STEPS);
    setCurrentStep(-1);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Document Analysis</h1>
          <p className="text-gray-600 mt-1">
            Upload your vessel documents and let AI agents analyze compliance requirements
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Context & Upload */}
          <div className="lg:col-span-2 space-y-6">
            {/* Context Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Voyage Context</CardTitle>
                <CardDescription>
                  Select your vessel and enter destination ports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vessel">Vessel</Label>
                    <Select
                      value={selectedVessel?.id.toString() || ''}
                      onValueChange={(value) => {
                        const vessel = vessels.find(v => v.id.toString() === value);
                        setSelectedVessel(vessel || null);
                      }}
                    >
                      <SelectTrigger id="vessel">
                        <SelectValue placeholder="Select a vessel" />
                      </SelectTrigger>
                      <SelectContent>
                        {vessels.map(vessel => (
                          <SelectItem key={vessel.id} value={vessel.id.toString()}>
                            {vessel.name} ({vessel.imo_number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Route</Label>
                    <Select
                      value={
                        routeMode === 'manual' ? 'manual' :
                        selectedRoute ? selectedRoute.id.toString() : ''
                      }
                      onValueChange={(value) => {
                        if (value === 'manual') {
                          setRouteMode('manual');
                          setSelectedRoute(null);
                          setPortCodes('');
                        } else if (value === 'new') {
                          setShowCreateRoute(true);
                        } else {
                          const route = vesselRoutes.find(r => r.id.toString() === value);
                          if (route) {
                            setSelectedRoute(route);
                            setPortCodes(route.port_codes.join(', '));
                            setRouteMode('route');
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a route" />
                      </SelectTrigger>
                      <SelectContent>
                        {vesselRoutes.map(route => (
                          <SelectItem key={route.id} value={route.id.toString()}>
                            {route.route_name} {route.is_active ? '(Active)' : ''}
                          </SelectItem>
                        ))}
                        <SelectItem value="manual">Enter ports manually</SelectItem>
                        <SelectItem value="new">+ Create new route</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Show route port badges when a route is selected */}
                    {routeMode === 'route' && selectedRoute && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {selectedRoute.port_codes.map((code, idx) => (
                          <Badge key={idx} variant="secondary">{code}</Badge>
                        ))}
                      </div>
                    )}

                    {/* Show manual port input when in manual mode */}
                    {routeMode === 'manual' && (
                      <>
                        <Input
                          placeholder="e.g., SGSIN, NLRTM, DEHAM"
                          value={portCodes}
                          onChange={(e) => setPortCodes(e.target.value)}
                        />
                        <p className="text-xs text-gray-500">
                          Enter UN/LOCODE port codes, separated by commas
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Create Route Form */}
                {showCreateRoute && (
                  <div className="border rounded-lg p-4 bg-blue-50 space-y-3">
                    <p className="text-sm font-medium">Create New Route</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="routeName" className="text-sm">Route Name</Label>
                        <Input
                          id="routeName"
                          placeholder="e.g., Shanghai to Rotterdam via Suez"
                          value={newRouteName}
                          onChange={(e) => setNewRouteName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="routePorts" className="text-sm">Port Codes</Label>
                        <Input
                          id="routePorts"
                          placeholder="e.g., CNSHA, SGSIN, NLRTM"
                          value={newRoutePorts}
                          onChange={(e) => setNewRoutePorts(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleCreateRoute}
                        disabled={!newRouteName.trim() || !newRoutePorts.trim()}
                      >
                        Create & Set Active
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowCreateRoute(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {selectedVessel && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="outline">{selectedVessel.vessel_type}</Badge>
                    <Badge variant="outline">Flag: {selectedVessel.flag_state}</Badge>
                    <Badge variant="outline">GT: {selectedVessel.gross_tonnage.toLocaleString()}</Badge>
                    <Badge variant="outline">{selectedVessel.document_count} docs</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Document Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
                <CardDescription>
                  Upload certificates and documents for analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="docType">Document Type</Label>
                    <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                      <SelectTrigger id="docType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Document Title (optional)</Label>
                    <Input
                      id="title"
                      placeholder="e.g., SOLAS Safety Certificate 2024"
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                    />
                  </div>
                </div>

                <DocumentUploadZone
                  onFilesSelected={handleFilesSelected}
                  isUploading={isUploading}
                  uploadedFiles={uploadedFiles}
                />

                <div className="flex justify-between items-center pt-4">
                  <Button
                    variant="outline"
                    onClick={handleClearUploads}
                    disabled={uploadedFiles.length === 0 || isUploading || isAnalyzing}
                  >
                    Clear All
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleAnalyze}
                      disabled={
                        !selectedVessel ||
                        uploadedFiles.filter(f => f.status === 'success').length === 0 ||
                        !portCodes.trim() ||
                        isAnalyzing
                      }
                    >
                      Analyze Uploaded Docs
                    </Button>

                    <Button
                      onClick={handleDetectMissing}
                      disabled={
                        !selectedVessel ||
                        (routeMode === 'route' && !selectedRoute) ||
                        (routeMode === 'manual' && !portCodes.trim()) ||
                        isAnalyzing
                      }
                    >
                      {isAnalyzing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Detecting...
                        </>
                      ) : (
                        'Detect Missing Documents'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Progress & Results */}
          <div className="space-y-6">
            {/* Analysis Progress */}
            <AnalysisProgress
              steps={analysisSteps}
              currentStep={currentStep}
              isRunning={isAnalyzing}
            />

            {/* Quick Stats */}
            {uploadedFiles.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Upload Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="text-lg font-bold">{uploadedFiles.length}</div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                    <div className="p-2 bg-green-50 rounded">
                      <div className="text-lg font-bold text-green-600">
                        {uploadedFiles.filter(f => f.status === 'success').length}
                      </div>
                      <div className="text-xs text-gray-500">Uploaded</div>
                    </div>
                    <div className="p-2 bg-red-50 rounded">
                      <div className="text-lg font-bold text-red-600">
                        {uploadedFiles.filter(f => f.status === 'error').length}
                      </div>
                      <div className="text-xs text-gray-500">Failed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Analysis Results (from Analyze Uploaded Docs) */}
        {analysisResult && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Document Analysis Results</h2>
            <GapAnalysisReport
              overallStatus={analysisResult.overall_status}
              complianceScore={analysisResult.compliance_score}
              validDocuments={analysisResult.valid_documents}
              expiringDocuments={analysisResult.expiring_soon_documents}
              expiredDocuments={analysisResult.expired_documents}
              missingDocuments={analysisResult.missing_documents}
              recommendations={analysisResult.recommendations}
            />

            {analysisResult.agent_reasoning && (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Agent Analysis Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">
                    {analysisResult.agent_reasoning}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Missing Documents Results (from Detect Missing Documents) */}
        {missingDocsResult && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Missing Documents Report
              <span className="text-sm font-normal text-gray-500 ml-2">
                Route: {missingDocsResult.route_name} | {missingDocsResult.total_documents_on_file} documents on file
              </span>
            </h2>
            <GapAnalysisReport
              overallStatus={missingDocsResult.overall_status}
              complianceScore={missingDocsResult.compliance_score}
              validDocuments={missingDocsResult.valid_documents}
              expiringDocuments={missingDocsResult.expiring_soon_documents}
              expiredDocuments={missingDocsResult.expired_documents}
              missingDocuments={missingDocsResult.missing_documents}
              recommendations={missingDocsResult.recommendations}
            />

            {missingDocsResult.agent_reasoning && (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Agent Analysis Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">
                    {missingDocsResult.agent_reasoning}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentUploadPage;

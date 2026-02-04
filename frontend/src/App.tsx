import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
// Legacy grid components kept for SPLIT view compatibility
// @ts-expect-error - Used by SplitViewContainer via workbookData
import { UniverGrid } from './components/UniverGrid';
// @ts-expect-error - Kept for future manifest-based loading
import { ChunkedUniverGrid } from './components/ChunkedUniverGrid';
import { TrojanUniverGrid } from './components/TrojanUniverGrid';
import { TrojanTreeView } from './components/TrojanTreeView';
import { TrojanAssetPanel } from './components/TrojanAssetPanel';
import { Dashboard } from './components/Dashboard';
import type { IWorkbookData } from '@univerjs/core';
import { AdminDashboard } from './components/AdminDashboard';
import { UploadProgress } from './components/UploadProgress';
// @ts-expect-error - Persistence service for legacy data
import { saveSnapshot, loadSnapshot } from './services/UniverPersistenceService';
import { getPresignedUrl, uploadToR2, notifyUploadComplete, waitForJobCompletion } from './utils/r2Client';
// New Design System Components
import { IconNav } from './components/IconNav';
import { GlobalHeader } from './components/GlobalHeader';
import { ViewToggle, type ViewMode } from './components/ViewToggle';
import { SplitViewContainer } from './components/SplitViewContainer';
import { EstimationKanban } from './components/EstimationKanban';
import { SelectionSidebar } from './components/SelectionSidebar';
import './App.css';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

// Basic Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("AutoGrid crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glassmorphism" style={{ color: '#ef4444' }}>
          <h3>Grid Rendering Error</h3>
          <p>Something went wrong displaying the spreadsheet.</p>
          <pre>{this.state.error?.message}</pre>
          <button onClick={() => this.setState({ hasError: false })}>Try Reset</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [data, setData] = useState<IWorkbookData | null>(null);
  const [manifestPath, setManifestPath] = useState<string | null>(null); // NEW: For chunked loading
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("draft");
  const [userProfile, setUserProfile] = useState<{ id: string, role: string, full_name: string } | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'projects' | 'shared'>('home');
  const [uploadProgress, setUploadProgress] = useState({ phase: '', percent: 0, visible: false });
  const [viewMode, setViewMode] = useState<ViewMode>('GRID');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedConceptCode, setSelectedConceptCode] = useState<string | null>(null);
  const [isAssetPanelOpen, setIsAssetPanelOpen] = useState(false);
  const [cellSelection, setCellSelection] = useState<{
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
    values: (string | number | null)[];
  } | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      let currentUser = session?.user;

      if (!currentUser) {
        const { data: signInData } = await supabase.auth.signInAnonymously();
        currentUser = signInData.user || undefined;
      }

      if (currentUser) {
        fetchProfile(currentUser.id);
      }
    };
    initAuth();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setUserProfile(data);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('spreadsheets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("Error fetching projects:", error);
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  };

  const handleUpload = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    // If no event, we'll manually trigger it
    if (!e) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx';
      input.onchange = (ev: any) => handleUpload(ev);
      input.click();
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[Upload] Starting STREAMING upload for file:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

    setLoading(true);
    setUploadProgress({ phase: '🚀 Iniciando carga directa a R2...', percent: 0, visible: true });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create spreadsheet record in Supabase
      const { data: spreadsheet, error: insertError } = await supabase
        .from('spreadsheets')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (insertError) throw insertError;
      setSpreadsheetId(spreadsheet.id);
      console.log('[Upload] Created spreadsheet:', spreadsheet.id);

      // STEP 1: Get presigned URL from our server
      setUploadProgress({ phase: '🔐 Obteniendo URL de carga segura...', percent: 5, visible: true });
      const { presignedUrl, fileKey } = await getPresignedUrl(file.name);
      console.log('[Upload] Presigned URL received for:', fileKey);

      // STEP 2: Upload directly to R2 (ZERO server RAM!)
      setUploadProgress({ phase: '📤 Subiendo archivo a R2...', percent: 10, visible: true });
      await uploadToR2(presignedUrl, file, (uploadPercent) => {
        // Map 0-100 upload progress to 10-50 range
        const mappedPercent = 10 + (uploadPercent * 0.4);
        setUploadProgress({
          phase: `📤 Subiendo: ${uploadPercent}%`,
          percent: Math.round(mappedPercent),
          visible: true
        });
      });
      console.log('[Upload] File uploaded to R2 successfully');

      // STEP 3: Notify server to start processing
      setUploadProgress({ phase: '⚙️ Iniciando procesamiento...', percent: 55, visible: true });
      const { jobId } = await notifyUploadComplete(fileKey, user.id, spreadsheet.id);
      console.log('[Upload] Processing job enqueued:', jobId);

      // STEP 4: Poll for job completion
      setUploadProgress({ phase: '🔄 Procesando Excel (streaming)...', percent: 60, visible: true });
      const result = await waitForJobCompletion(jobId, (status) => {
        const progress = typeof status.progress === 'number' ? status.progress : 0;
        // Map job progress 0-100 to 60-95 range
        const mappedPercent = 60 + (progress * 0.35);
        setUploadProgress({
          phase: `🔄 Procesando: ${progress}%`,
          percent: Math.round(mappedPercent),
          visible: true
        });
      });

      console.log('[Upload] Processing complete:', result);
      console.log('[Upload] Manifest:', result.result?.manifestKey);
      console.log('[Upload] Total rows:', result.result?.totalRows);
      console.log('[Upload] Total chunks:', result.result?.totalChunks);

      // STEP 5: Update spreadsheet record with manifest location
      await supabase
        .from('spreadsheets')
        .update({
          storage_path: result.result?.manifestKey,
          status: 'draft'
        })
        .eq('id', spreadsheet.id);

      setStatus("draft");
      setUploadProgress({ phase: '✅ Completado! Archivo procesado en chunks.', percent: 100, visible: true });

      // Brief delay to show completion
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Set manifest path to trigger ChunkedUniverGrid loading
      setManifestPath(result.result?.manifestKey || null);
      setData(null); // Clear legacy data
      fetchProjects();

      console.log(`[Upload] SUCCESS: ${result.result?.totalRows} rows in ${result.result?.totalChunks} chunks`);

    } catch (err: any) {
      console.error("[Upload] Streaming upload error:", err);
      alert(`Error durante la carga: ${err.message}`);
    } finally {
      setLoading(false);
      setUploadProgress({ phase: '', percent: 0, visible: false });
    }
  };

  const handleCreateProject = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: spreadsheet, error: insertError } = await supabase
        .from('spreadsheets')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (insertError) throw insertError;

      setSpreadsheetId(spreadsheet.id);
      setData(null); // Will trigger createEmptyWorkbook in UniverGrid
      setStatus("draft");
      fetchProjects();
    } catch (err: any) {
      alert("Error creating project: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openProject = async (id: string) => {
    setLoading(true);
    setSpreadsheetId(id);
    // Reset Trojan-related state when switching projects
    setSelectedConceptCode(null);
    setIsAssetPanelOpen(false);
    setUploadProgress({ phase: '📂 Cargando proyecto...', percent: 10, visible: true });

    try {
      // First get the status from the spreadsheet record
      const { data: spreadsheet } = await supabase
        .from('spreadsheets')
        .select('status')
        .eq('id', id)
        .single();

      if (spreadsheet) {
        setStatus(spreadsheet.status);
      }

      // NEW: Load from Storage with fallback to raw_data
      const result = await loadSnapshot(id, (phase, percent) => {
        setUploadProgress({ phase: `📂 ${phase}`, percent, visible: true });
      });

      if (result.success && result.workbook) {
        console.log(`[OpenProject] Loaded from ${result.source}:`, result.workbook.id);
        setData(result.workbook);
      } else if (result.source === 'empty') {
        console.log('[OpenProject] Empty project, will create new workbook');
        setData(null);
      } else {
        console.error('[OpenProject] Failed to load:', result.error);
        alert(`Error cargando proyecto: ${result.error}`);
      }
    } catch (err: any) {
      console.error('[OpenProject] Error:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
      setUploadProgress({ phase: '', percent: 0, visible: false });
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!spreadsheetId) return;
    const { error } = await supabase
      .from('spreadsheets')
      .update({ status: newStatus })
      .eq('id', spreadsheetId);

    if (error) {
      alert("Error updating status: " + error.message);
    } else {
      setStatus(newStatus);
    }
  };

  // Note: isAuditOpen removed, replaced by isSidebarOpen for SelectionSidebar

  // Handle view mode changes with logging
  const handleViewModeChange = (newMode: ViewMode) => {
    console.log(`[App] Switching to ${newMode} mode`);
    const startTime = performance.now();
    
    setViewMode(newMode);
    
    // Log completion after state update
    requestAnimationFrame(() => {
      const endTime = performance.now();
      console.log(`[App] ${newMode} mode rendered in ${(endTime - startTime).toFixed(2)}ms`);
    });
  };

  return (
    <div className="app-container">
      {/* Global Header - Always visible when in editor */}
      {spreadsheetId && (
        <GlobalHeader
          projectName={projects.find(p => p.id === spreadsheetId)?.name || 'Project'}
          fileName={projects.find(p => p.id === spreadsheetId)?.name || 'Estimation'}
          status={status}
          onLockSubmit={() => console.log('Lock & Submit clicked')}
          isLocked={status === 'approved'}
        />
      )}

      <div className="app-body">
        {/* Icon Navigation - Slim sidebar */}
        {spreadsheetId && (
          <IconNav
            currentView={viewMode}
            onViewChange={handleViewModeChange}
          />
        )}

        {/* Main Content Area */}
        <main className="app-main">
          {showAdmin ? (
            <AdminDashboard />
          ) : (
            <>
              {!spreadsheetId ? (
                <Dashboard
                  projects={projects}
                  onProjectClick={openProject}
                  onUploadClick={() => handleUpload()}
                  onCreateClick={handleCreateProject}
                  loading={loading}
                />
              ) : (
                <div className="editor-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                  {/* Orbital-Style Header */}
                  <div className="univer-header glassmorphism-light">
                    {/* Top Bar: Data/Auto/Interface Pills */}
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                      <div className="header-pills">
                        <button className="pill active">Data</button>
                        <button className="pill">Automation</button>
                        <button className="pill">Interface</button>
                      </div>
                      <div style={{ position: 'absolute', right: '20px', top: '12px', display: 'flex', gap: '10px' }}>
                        <button className="icon-btn-simple">❓</button>
                        <button className="icon-btn-simple">⏰</button>
                        <button className="share-btn">Share</button>
                      </div>
                    </div>

                    {/* Title and View Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-dark)' }}>
                          {userProfile?.role === 'resident' ? 'Q1 Report' : 'Master Review'}
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>▼</span>
                      </div>
                    </div>

                    {/* View Toggle - GRID | SPLIT | KANBAN */}
                    <div className="view-tabs-bar">
                      <ViewToggle currentView={viewMode} onViewChange={handleViewModeChange} />

                      <div className="view-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button className="text-btn">Group</button>
                        <button className="text-btn">Hide Fields</button>
                        <button className="text-btn">Filter</button>
                        <button className="text-btn">Sort</button>
                        <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 4px' }} />
                        <button
                          className={`text-btn ${isSidebarOpen ? 'active' : ''}`}
                          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: isSidebarOpen ? '#eff6ff' : 'transparent',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}
                        >
                          📊 Summary
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Main Content Area - Renders based on viewMode */}
                  <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <ErrorBoundary>
                        {/* GRID VIEW */}
                        {viewMode === 'GRID' && (
                          <TrojanUniverGrid
                            key={`trojan-grid-${spreadsheetId}`}
                            estimationId={spreadsheetId}
                            readOnly={status !== 'draft'}
                            onCellEdit={(row, col, value) => {
                              console.log('[App] Cell edited:', { row, col, value });
                              // TODO: Persistir cambio via API
                            }}
                          />
                        )}

                        {/* TREE VIEW */}
                        {viewMode === 'TREE' && (
                          <div style={{ display: 'flex', height: '100%' }}>
                            <div style={{ flex: 1 }}>
                              <TrojanTreeView
                                estimationId={spreadsheetId}
                                onConceptSelect={(code, node) => {
                                  console.log(`[App] Concept selected: ${code}`, node);
                                  setSelectedConceptCode(code);
                                  setIsAssetPanelOpen(true);
                                }}
                                selectedConceptCode={selectedConceptCode}
                              />
                            </div>
                            <TrojanAssetPanel
                              estimationId={spreadsheetId}
                              conceptCode={selectedConceptCode}
                              isOpen={isAssetPanelOpen}
                              onClose={() => setIsAssetPanelOpen(false)}
                              onAssetClick={(asset) => {
                                console.log('[App] Asset clicked:', asset);
                              }}
                            />
                          </div>
                        )}

                        {/* SPLIT VIEW */}
                        {viewMode === 'SPLIT' && (
                          <SplitViewContainer
                            workbookData={data}
                            readOnly={status !== 'draft'}
                          />
                        )}

                        {/* KANBAN VIEW */}
                        {viewMode === 'KANBAN' && (
                          <EstimationKanban
                            estimations={projects.map(p => ({
                              id: p.id,
                              projectName: p.name || `Project ${p.id.slice(0, 8)}`,
                              contractorName: p.contractor_name,
                              totalAmount: p.total_amount,
                              status: p.status,
                              updatedAt: p.updated_at
                            }))}
                            onCardClick={(est) => {
                              openProject(est.id);
                              setViewMode('GRID');
                            }}
                          />
                        )}
                      </ErrorBoundary>
                    </div>

                    {/* Selection Sidebar */}
                    <SelectionSidebar
                      selection={cellSelection}
                      isOpen={isSidebarOpen && viewMode === 'GRID'}
                      onClose={() => setIsSidebarOpen(false)}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Upload Progress Overlay */}
      <UploadProgress
        phase={uploadProgress.phase}
        percent={uploadProgress.percent}
        isVisible={uploadProgress.visible}
      />
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { UniverGrid } from './components/UniverGrid';
import { ChunkedUniverGrid } from './components/ChunkedUniverGrid';
import { Dashboard } from './components/Dashboard';
import { Sidebar } from './components/Sidebar';
import type { IWorkbookData } from '@univerjs/core';
import { AdminDashboard } from './components/AdminDashboard';
import { NotificationBell } from './components/NotificationBell';
import { AuditLog } from './components/AuditLog';
import { AuditButton } from './components/AuditButton';
import { UploadProgress } from './components/UploadProgress';
import { exportToPDF } from './utils/pdfExport';
import { saveSnapshot, loadSnapshot, ensureStorageBucket } from './services/UniverPersistenceService';
// NEW: Streaming upload utilities (replaces ingestExcelFile for large files)
import { getPresignedUrl, uploadToR2, notifyUploadComplete, waitForJobCompletion } from './utils/r2Client';
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

  const [isAuditOpen, setIsAuditOpen] = useState(false);

  return (
    <div className="workspace-layout">
      {/* Sidebar Navigation - Persistent */}
      <Sidebar
        className="persistent-sidebar"
        onHomeClick={() => { setSpreadsheetId(null); setData(null); }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content Area */}
      <main className={`main-content ${spreadsheetId ? 'editor-mode' : ''}`}>
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

                  {/* View Tabs */}
                  <div className="view-tabs-bar">
                    <button className="view-tab active "><span className="icon">▦</span> Grid View</button>
                    <button className="view-tab"><span className="icon">📊</span> Kanban View</button>
                    <button className="view-tab"><span className="icon">📝</span> Form View</button>
                    <button className="view-tab"><span className="icon">📅</span> Calendar View</button>
                    <button className="view-tab add-view">+ Add View</button>

                    <div className="view-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
                      <button className="text-btn">Group</button>
                      <button className="text-btn">Hide Fields</button>
                      <button className="text-btn">Filter</button>
                      <button className="text-btn">Sort</button>
                    </div>
                  </div>
                </div>

                {/* Main Grid Area + Sidebar */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <ErrorBoundary>
                      {manifestPath ? (
                        <ChunkedUniverGrid
                          key={`chunked-${spreadsheetId}-${manifestPath}`}
                          manifestPath={manifestPath}
                          readOnly={status !== 'draft'}
                        />
                      ) : (
                        <UniverGrid
                          key={`univer-${spreadsheetId}-${data?.id || 'empty'}`}
                          data={data}
                          readOnly={status !== 'draft'}
                          onChange={() => {
                            console.log('[AutoGrid] Data changed');
                          }}
                        />
                      )}
                    </ErrorBoundary>
                  </div>

                  {/* Collapsible Right Sidebar */}
                  {isAuditOpen && (
                    <div style={{
                      width: '320px',
                      borderLeft: '1px solid var(--border)',
                      background: 'var(--bg)',
                      overflowY: 'auto',
                      padding: '1rem',
                      animation: 'slideInRight 0.3s ease-out'
                    }}>
                      <AuditButton spreadsheetId={spreadsheetId} sheetContext={data} />
                      <AuditLog spreadsheetId={spreadsheetId || ''} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

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

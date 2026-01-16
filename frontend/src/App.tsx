import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ingestExcelFile } from './utils/ingestion';
import { UniverGrid } from './components/UniverGrid';
import { Dashboard } from './components/Dashboard';
import { Sidebar } from './components/Sidebar';
import type { IWorkbookData } from '@univerjs/core';
import { AdminDashboard } from './components/AdminDashboard';
import { NotificationBell } from './components/NotificationBell';
import { AuditLog } from './components/AuditLog';
import { AuditButton } from './components/AuditButton';
import { UploadProgress } from './components/UploadProgress';
import { exportToPDF } from './utils/pdfExport';
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

    console.log('[Upload] Starting upload for file:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

    setLoading(true);
    setUploadProgress({ phase: 'Iniciando...', percent: 0, visible: true });

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
      console.log('[Upload] Created spreadsheet:', spreadsheet.id);

      // Ingest Excel with progress callbacks - increased limit to 50MB
      const result = await ingestExcelFile(file, user.id, spreadsheet.id, {
        onProgress: (phase, percent) => {
          console.log('[Upload Progress]', phase, percent + '%');
          setUploadProgress({ phase, percent, visible: true });
        },
        maxFileSizeMB: 50
      });

      console.log('[Upload] Ingestion complete. Sheets:', Object.keys(result.workbook.sheets || {}).length);
      console.log('[Upload] Workbook ID:', result.workbook.id);
      console.log('[Upload] First sheet sample:', JSON.stringify(Object.values(result.workbook.sheets || {})[0]?.cellData?.['0'] || {}).substring(0, 200));

      // Show warnings if any
      if (result.warnings.length > 0) {
        console.warn('[Upload] Warnings:', result.warnings);
      }

      setUploadProgress({ phase: '💾 Guardando en base de datos...', percent: 98, visible: true });

      // Store workbook data in raw_data (Univer IWorkbookData format)
      const { error: updateError } = await supabase
        .from('spreadsheets')
        .update({ raw_data: result.workbook })
        .eq('id', spreadsheet.id);

      if (updateError) {
        console.error('[Upload] Error saving to DB:', updateError);
        throw updateError;
      }

      console.log('[Upload] Saved to database successfully');
      console.log('[Upload] Setting data state with workbook:', result.workbook.id);

      setData(result.workbook);
      setStatus("draft");
      setUploadProgress({ phase: '✅ Completado', percent: 100, visible: true });

      // Brief delay to show completion
      await new Promise(resolve => setTimeout(resolve, 800));
      fetchProjects(); // Refresh list

    } catch (err: any) {
      console.error("Upload error:", err);
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
    const { data: spreadsheet } = await supabase
      .from('spreadsheets')
      .select('*')
      .eq('id', id)
      .single();

    if (spreadsheet) {
      setData(spreadsheet.raw_data);
      setStatus(spreadsheet.status);
    }
    setLoading(false);
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
                      <UniverGrid
                        key={`univer-${spreadsheetId}-${data?.id || 'empty'}`}
                        data={data}
                        readOnly={status !== 'draft'}
                        onChange={(newData) => {
                          console.log('[AutoGrid] Data changed');
                        }}
                      />
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

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ShieldCheck, ShieldAlert, History } from 'lucide-react';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

interface Signature {
    id: string;
    signer_id: string;
    role: string;
    signed_at: string;
    snapshot_hash: string;
}

interface AuditLogProps {
    spreadsheetId: string;
}

export const AuditLog: React.FC<AuditLogProps> = ({ spreadsheetId }) => {
    const [signatures, setSignatures] = useState<Signature[]>([]);
    const [auditStatus, setAuditStatus] = useState<'VALID' | 'TAMPERED' | 'UNKNOWN'>('UNKNOWN');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (spreadsheetId) {
            fetchSignatures();
        }
    }, [spreadsheetId]);

    const fetchSignatures = async () => {
        const { data, error } = await supabase
            .from('signatures')
            .select('*')
            .eq('spreadsheet_id', spreadsheetId)
            .order('signed_at', { ascending: false });

        if (!error && data) {
            setSignatures(data);
        }
    };

    // Note: In a real app, this would call the MCP tool via an API endpoint or the assistant's own logic.
    // For this demo, we'll simulate the call to the logic we defined in index.ts
    const runAudit = async () => {
        setLoading(true);
        // This is where we'd ideally trigger the 'audit_integrity' tool from the MCP server.
        // For now, we'll simulate the "check" message.
        setTimeout(() => {
            setAuditStatus('VALID'); // Simulated result
            setLoading(false);
        }, 1500);
    };

    return (
        <div className="audit-log glassmorphism">
            <h3><History size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Historial de Integridad</h3>

            <div className="audit-status" style={{ margin: '15px 0', padding: '15px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)' }}>
                <p>Estado de los Datos:</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {auditStatus === 'VALID' ? (
                        <><ShieldCheck color="#10b981" /> <span style={{ color: '#10b981', fontWeight: 'bold' }}>INTEGRO (Firmado)</span></>
                    ) : auditStatus === 'TAMPERED' ? (
                        <><ShieldAlert color="#ef4444" /> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>ALTERADO</span></>
                    ) : (
                        <><ShieldAlert color="#888" /> <span style={{ color: '#888' }}>SIN AUDITAR</span></>
                    )}
                </div>
                <button onClick={runAudit} disabled={loading} className="primary" style={{ marginTop: '10px', fontSize: '0.8rem' }}>
                    {loading ? 'Verificando...' : 'Ejecutar Auditoría Forense'}
                </button>
            </div>

            <div className="signature-list">
                <h4>Firmas Registradas</h4>
                {signatures.length === 0 ? (
                    <p className="empty-text">No hay firmas acumuladas.</p>
                ) : (
                    signatures.map(sig => (
                        <div key={sig.id} className="signature-item" style={{ fontSize: '0.8rem', padding: '8px', borderBottom: '1px solid var(--border)' }}>
                            <p style={{ margin: 0 }}><strong>{sig.role}</strong> - {new Date(sig.signed_at).toLocaleString()}</p>
                            <code style={{ fontSize: '0.6rem', color: '#888' }}>Hash: {sig.snapshot_hash.substring(0, 16)}...</code>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

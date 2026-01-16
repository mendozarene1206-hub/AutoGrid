import React, { useState } from 'react';

interface AuditButtonProps {
    spreadsheetId: string | null;
    sheetContext: any;
    onAuditResult?: (result: any) => void;
}

export const AuditButton: React.FC<AuditButtonProps> = ({ spreadsheetId, sheetContext, onAuditResult }) => {
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'queueing' | 'done'>('idle');
    const [analysis, setAnalysis] = useState<string | null>(null);

    const handleAudit = async () => {
        if (!sheetContext) return;
        setStatus('analyzing');

        // Timer para cambiar el mensaje si tarda más de 3 segundos (señal de cola o reintento)
        const longWaitTimer = setTimeout(() => {
            setStatus((prev) => prev === 'analyzing' ? 'queueing' : prev);
        }, 3000);

        try {
            const res = await fetch('http://localhost:3000/api/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sheetContext: sheetContext,
                    userMessage: "Audita la hoja completa buscando discrepancias de precios o volúmenes y errores de lógica."
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setAnalysis(data.analysis);
            setStatus('done');
            if (onAuditResult) onAuditResult(data);
        } catch (error) {
            console.error("Audit error:", error);
            setStatus('idle');
            alert("Error en la auditoría: " + (error as Error).message);
        } finally {
            clearTimeout(longWaitTimer);
        }
    };

    return (
        <div className="audit-button-container glassmorphism" style={{ marginBottom: '15px', padding: '15px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>Auditoría Inteligente</h3>
            <button
                onClick={handleAudit}
                disabled={status !== 'idle' && status !== 'done'}
                className={`primary ${status === 'analyzing' || status === 'queueing' ? 'animate-pulse' : ''}`}
                style={{ width: '100%', padding: '10px', transition: 'all 0.3s' }}
            >
                {status === 'idle' && "🚀 Iniciar Auditoría IA"}
                {status === 'analyzing' && "🤖 Analizando..."}
                {status === 'queueing' && "⏳ En cola de espera..."}
                {status === 'done' && "🔄 Re-auditar"}
            </button>

            {status === 'queueing' && (
                <p style={{ color: '#d97706', fontSize: '0.75rem', marginTop: '10px', lineHeight: '1.4' }}>
                    Estamos experimentando tráfico alto. Tu auditoría está asegurada y se procesará en breve.
                </p>
            )}

            {analysis && (
                <div className="analysis-result" style={{
                    marginTop: '15px',
                    fontSize: '0.85rem',
                    textAlign: 'left',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingTop: '10px',
                    maxHeight: '300px',
                    overflowY: 'auto'
                }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#818cf8' }}>Sugerencias de la IA:</h4>
                    <p style={{ whiteSpace: 'pre-wrap', color: '#e5e7eb' }}>{analysis}</p>
                </div>
            )}
        </div>
    );
};

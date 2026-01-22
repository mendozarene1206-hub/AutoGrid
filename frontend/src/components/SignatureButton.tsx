/**
 * SignatureButton.tsx
 * 
 * Component for managing document workflow transitions.
 * Handles: DRAFT -> IN_REVIEW -> APPROVED
 * 
 * Features:
 * - SHA-256 hash calculation of current snapshot
 * - Visual state indicators
 * - Confirmation dialogs
 */

import React, { useState } from 'react';
import type { IWorkbookData } from '@univerjs/core';
import { calculateSnapshotHash } from '../services/UniverPersistenceService';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface SignatureButtonProps {
    spreadsheetId: string;
    status: string;
    workbook: IWorkbookData | null;
    onStatusChange: (newStatus: string) => void;
}

export const SignatureButton: React.FC<SignatureButtonProps> = ({
    spreadsheetId,
    status,
    workbook,
    onStatusChange
}) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [hash, setHash] = useState<string | null>(null);

    const handleSubmitForReview = async () => {
        if (!workbook) {
            alert('No hay datos para firmar');
            return;
        }

        const confirmed = window.confirm(
            '¿Estás seguro de enviar esta estimación a revisión?\n\n' +
            'Una vez enviada, no podrás editar los valores hasta que sea aprobada o rechazada.'
        );

        if (!confirmed) return;

        setIsProcessing(true);

        try {
            // 1. Calculate hash of current snapshot
            const snapshotHash = await calculateSnapshotHash(workbook);
            setHash(snapshotHash);
            console.log('[Signature] Hash calculated:', snapshotHash.substring(0, 16) + '...');

            // 2. Update status to IN_REVIEW
            const { error: statusError } = await supabase
                .from('spreadsheets')
                .update({ status: 'in_review' })
                .eq('id', spreadsheetId);

            if (statusError) throw statusError;

            // 3. Create signature record (preliminary, before final approval)
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error: sigError } = await supabase
                    .from('signatures')
                    .insert({
                        spreadsheet_id: spreadsheetId,
                        signer_id: user.id,
                        snapshot_hash: snapshotHash,
                        role: 'Resident' // Default role, can be changed
                    });

                if (sigError) {
                    console.error('[Signature] Failed to create signature record:', sigError);
                }
            }

            onStatusChange('in_review');
            alert('✅ Estimación enviada a revisión exitosamente');

        } catch (err: any) {
            console.error('[Signature] Error:', err);
            alert(`Error: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApprove = async () => {
        const confirmed = window.confirm(
            '¿Aprobar esta estimación?\n\n' +
            'Una vez aprobada, el documento quedará bloqueado permanentemente.'
        );

        if (!confirmed) return;

        setIsProcessing(true);

        try {
            const { error } = await supabase
                .from('spreadsheets')
                .update({ status: 'approved_internal' })
                .eq('id', spreadsheetId);

            if (error) throw error;

            onStatusChange('approved_internal');
            alert('✅ Estimación aprobada');

        } catch (err: any) {
            console.error('[Signature] Approve error:', err);
            alert(`Error: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        const reason = window.prompt('Razón del rechazo (opcional):');

        setIsProcessing(true);

        try {
            const { error } = await supabase
                .from('spreadsheets')
                .update({ status: 'changes_requested' })
                .eq('id', spreadsheetId);

            if (error) throw error;

            onStatusChange('changes_requested');
            alert(`📝 Estimación devuelta para correcciones${reason ? `: ${reason}` : ''}`);

        } catch (err: any) {
            console.error('[Signature] Reject error:', err);
            alert(`Error: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Status badge styles
    const getStatusBadge = () => {
        const badges: Record<string, { color: string; text: string; icon: string }> = {
            draft: { color: '#f59e0b', text: 'Borrador', icon: '✏️' },
            in_review: { color: '#3b82f6', text: 'En Revisión', icon: '👁️' },
            changes_requested: { color: '#ef4444', text: 'Cambios Solicitados', icon: '🔄' },
            approved_internal: { color: '#10b981', text: 'Aprobado', icon: '✅' },
            signed: { color: '#8b5cf6', text: 'Firmado', icon: '🔏' }
        };

        const badge = badges[status] || badges.draft;

        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                backgroundColor: `${badge.color}20`,
                color: badge.color,
                fontWeight: 600,
                fontSize: '0.85rem'
            }}>
                <span>{badge.icon}</span>
                <span>{badge.text}</span>
            </div>
        );
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px',
            background: 'var(--bg-secondary, #f9fafb)',
            borderRadius: '12px',
            border: '1px solid var(--border, #e5e7eb)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text, #374151)' }}>Estado del Documento</span>
                {getStatusBadge()}
            </div>

            {hash && (
                <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    fontFamily: 'monospace',
                    background: '#f3f4f6',
                    padding: '8px',
                    borderRadius: '6px',
                    wordBreak: 'break-all'
                }}>
                    🔐 Hash: {hash.substring(0, 32)}...
                </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {status === 'draft' && (
                    <button
                        onClick={handleSubmitForReview}
                        disabled={isProcessing}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            color: 'white',
                            fontWeight: 600,
                            cursor: isProcessing ? 'wait' : 'pointer',
                            opacity: isProcessing ? 0.7 : 1
                        }}
                    >
                        {isProcessing ? '⏳ Procesando...' : '📤 Enviar a Revisión'}
                    </button>
                )}

                {status === 'changes_requested' && (
                    <button
                        onClick={handleSubmitForReview}
                        disabled={isProcessing}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: 'white',
                            fontWeight: 600,
                            cursor: isProcessing ? 'wait' : 'pointer',
                            opacity: isProcessing ? 0.7 : 1
                        }}
                    >
                        {isProcessing ? '⏳ Procesando...' : '🔄 Reenviar a Revisión'}
                    </button>
                )}

                {status === 'in_review' && (
                    <>
                        <button
                            onClick={handleApprove}
                            disabled={isProcessing}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: 'white',
                                fontWeight: 600,
                                cursor: isProcessing ? 'wait' : 'pointer',
                                opacity: isProcessing ? 0.7 : 1
                            }}
                        >
                            {isProcessing ? '⏳...' : '✅ Aprobar'}
                        </button>
                        <button
                            onClick={handleReject}
                            disabled={isProcessing}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: '1px solid #ef4444',
                                background: 'white',
                                color: '#ef4444',
                                fontWeight: 600,
                                cursor: isProcessing ? 'wait' : 'pointer',
                                opacity: isProcessing ? 0.7 : 1
                            }}
                        >
                            {isProcessing ? '⏳...' : '❌ Rechazar'}
                        </button>
                    </>
                )}

                {(status === 'approved_internal' || status === 'signed') && (
                    <div style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        background: '#dcfce7',
                        color: '#166534',
                        fontWeight: 600
                    }}>
                        🔒 Documento Bloqueado
                    </div>
                )}
            </div>
        </div>
    );
};

export default SignatureButton;

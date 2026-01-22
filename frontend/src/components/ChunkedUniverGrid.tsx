/**
 * ChunkedUniverGrid.tsx
 * 
 * A wrapper around UniverGrid that loads data from R2 chunks.
 * Fetches manifest, loads initial chunks, and displays in the grid.
 */

import React, { useEffect, useState } from 'react';
import { UniverGrid } from './UniverGrid';
import type { IWorkbookData } from '@univerjs/core';
import { LocaleType } from '@univerjs/presets';

// Use server proxy to avoid CORS issues
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const CHUNKS_URL = `${API_BASE_URL}/api/chunks`;

interface Manifest {
    version: number;
    originalFileName: string;
    totalRows: number;
    totalColumns: number;
    chunkSize: number;
    chunks: ChunkMeta[];
    styles: Record<string, any>;
    sheets: SheetMeta[];
}

interface ChunkMeta {
    sheetId: string;
    startRow: number;
    endRow: number;
    key: string;
}

interface SheetMeta {
    id: string;
    name: string;
    rowCount: number;
    columnCount: number;
}

interface ChunkedUniverGridProps {
    manifestPath: string | null;
    readOnly?: boolean;
    onChange?: (data: IWorkbookData) => void;
}

export const ChunkedUniverGrid: React.FC<ChunkedUniverGridProps> = ({
    manifestPath,
    readOnly = false,
    onChange
}) => {
    const [workbookData, setWorkbookData] = useState<IWorkbookData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState({ loaded: 0, total: 0 });

    useEffect(() => {
        if (!manifestPath) {
            setWorkbookData(null);
            return;
        }

        loadFromManifest(manifestPath);
    }, [manifestPath]);

    const loadFromManifest = async (path: string) => {
        setLoading(true);
        setError(null);

        try {
            // 1. Load manifest
            console.log('[ChunkedGrid] Loading manifest:', path);
            const manifestUrl = `${CHUNKS_URL}?key=${encodeURIComponent(path)}`;
            const manifestRes = await fetch(manifestUrl);

            if (!manifestRes.ok) {
                throw new Error(`Failed to load manifest: ${manifestRes.status}`);
            }

            const manifest: Manifest = await manifestRes.json();
            console.log('[ChunkedGrid] Manifest loaded:', manifest.totalRows, 'rows,', manifest.chunks.length, 'chunks');

            // 2. Create empty workbook structure
            const sheets: Record<string, any> = {};
            const sheetOrder: string[] = [];

            for (const sheet of manifest.sheets) {
                sheetOrder.push(sheet.id);
                sheets[sheet.id] = {
                    id: sheet.id,
                    name: sheet.name,
                    rowCount: Math.max(sheet.rowCount + 10, 100),
                    columnCount: Math.max(sheet.columnCount + 5, 26),
                    cellData: {},
                    defaultRowHeight: 25,
                    defaultColumnWidth: 100,
                };
            }

            // 3. Load ALL chunks to show complete data
            const chunksToLoad = manifest.chunks; // Load ALL chunks
            setProgress({ loaded: 0, total: chunksToLoad.length });

            for (let i = 0; i < chunksToLoad.length; i++) {
                const chunk = chunksToLoad[i];
                const chunkUrl = `${CHUNKS_URL}?key=${encodeURIComponent(chunk.key)}`;

                try {
                    const chunkRes = await fetch(chunkUrl);
                    if (chunkRes.ok) {
                        const chunkData = await chunkRes.json();

                        // Merge chunk data into sheet
                        if (sheets[chunk.sheetId]) {
                            for (const row of chunkData.rows) {
                                if (!sheets[chunk.sheetId].cellData[row.r]) {
                                    sheets[chunk.sheetId].cellData[row.r] = {};
                                }
                                Object.assign(sheets[chunk.sheetId].cellData[row.r], row.data);
                            }
                        }

                        console.log(`[ChunkedGrid] Loaded chunk ${i + 1}/${chunksToLoad.length}:`, chunk.key);
                    }
                } catch (chunkErr) {
                    console.warn('[ChunkedGrid] Error loading chunk:', chunk.key, chunkErr);
                }

                setProgress({ loaded: i + 1, total: chunksToLoad.length });
            }

            // 4. Create workbook
            const workbook: IWorkbookData = {
                id: 'chunked-workbook-' + Date.now(),
                sheetOrder,
                name: manifest.originalFileName || 'Imported Workbook',
                appVersion: '1.0.0',
                locale: LocaleType.ES_ES,
                styles: manifest.styles || {},
                sheets,
            };

            console.log('[ChunkedGrid] Workbook ready:', {
                sheets: Object.keys(sheets).length,
                totalCells: Object.values(sheets).reduce((sum: number, s: any) =>
                    sum + Object.values(s.cellData || {}).reduce((rowSum: number, r: any) =>
                        rowSum + Object.keys(r || {}).length, 0), 0)
            });

            setWorkbookData(workbook);

        } catch (err: any) {
            console.error('[ChunkedGrid] Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '1rem',
                color: '#666'
            }}>
                <div style={{ fontSize: '2rem' }}>📊</div>
                <div>Loading spreadsheet chunks...</div>
                {progress.total > 0 && (
                    <div style={{ fontSize: '0.9rem', color: '#999' }}>
                        Chunk {progress.loaded} / {progress.total}
                    </div>
                )}
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '1rem',
                color: '#ef4444'
            }}>
                <div style={{ fontSize: '2rem' }}>❌</div>
                <div>Error loading spreadsheet</div>
                <div style={{ fontSize: '0.8rem', color: '#999' }}>{error}</div>
            </div>
        );
    }

    return (
        <UniverGrid
            data={workbookData}
            readOnly={readOnly}
            onChange={onChange}
        />
    );
};

export default ChunkedUniverGrid;

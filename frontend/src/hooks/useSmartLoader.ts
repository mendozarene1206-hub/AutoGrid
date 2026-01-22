import { useEffect, useRef, useState, useCallback } from 'react';

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

interface UseSmartLoaderOptions {
    r2BaseUrl: string;
    manifestKey: string | null;
    univerInstance: any;
    bufferRows?: number;
}

interface SmartLoaderState {
    manifest: Manifest | null;
    isLoading: boolean;
    loadedChunks: number;
    totalChunks: number;
    error: string | null;
}

export function useSmartLoader({
    r2BaseUrl,
    manifestKey,
    univerInstance,
    bufferRows = 500
}: UseSmartLoaderOptions): SmartLoaderState {
    const [manifest, setManifest] = useState<Manifest | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadedChunks = useRef<Set<string>>(new Set());
    const loadingChunks = useRef<Set<string>>(new Set());

    // Load manifest when manifestKey changes
    useEffect(() => {
        if (!manifestKey) return;

        const loadManifest = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const manifestUrl = `${r2BaseUrl}/${manifestKey}`;
                console.log('[SmartLoader] Loading manifest:', manifestUrl);

                const response = await fetch(manifestUrl);
                if (!response.ok) throw new Error('Failed to load manifest');

                const data = await response.json();
                setManifest(data);
                console.log('[SmartLoader] Manifest loaded:', data.totalRows, 'rows,', data.chunks.length, 'chunks');
            } catch (err: any) {
                console.error('[SmartLoader] Error loading manifest:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        loadManifest();
    }, [manifestKey, r2BaseUrl]);

    // Get chunks needed for a row range
    const getChunksForRange = useCallback((startRow: number, endRow: number): ChunkMeta[] => {
        if (!manifest) return [];

        return manifest.chunks.filter(chunk =>
            chunk.endRow >= startRow && chunk.startRow <= endRow
        );
    }, [manifest]);

    // Load a chunk and merge into Univer
    const loadChunk = useCallback(async (chunk: ChunkMeta) => {
        if (loadedChunks.current.has(chunk.key) || loadingChunks.current.has(chunk.key)) {
            return;
        }

        loadingChunks.current.add(chunk.key);

        try {
            const chunkUrl = `${r2BaseUrl}/${chunk.key}`;
            console.log('[SmartLoader] Loading chunk:', chunk.key);

            const response = await fetch(chunkUrl);
            if (!response.ok) throw new Error(`Failed to load chunk: ${chunk.key}`);

            const data = await response.json();

            // Merge into Univer without full refresh
            if (univerInstance) {
                const workbook = univerInstance.getActiveWorkbook?.();
                if (workbook) {
                    const sheet = workbook.getSheetBySheetId?.(chunk.sheetId) || workbook.getActiveSheet?.();

                    if (sheet) {
                        data.rows.forEach((row: any) => {
                            Object.entries(row.data).forEach(([colIdx, cellData]: [string, any]) => {
                                try {
                                    const range = sheet.getRange?.(row.r, Number(colIdx), row.r, Number(colIdx));
                                    if (range && cellData.v !== undefined) {
                                        range.setValue(cellData.v);
                                    }
                                } catch (e) {
                                    // Silently ignore individual cell errors
                                }
                            });
                        });
                    }
                }
            }

            loadedChunks.current.add(chunk.key);
            console.log('[SmartLoader] Chunk loaded:', chunk.key, `(${data.rows.length} rows)`);
        } catch (err) {
            console.error('[SmartLoader] Error loading chunk:', chunk.key, err);
        } finally {
            loadingChunks.current.delete(chunk.key);
        }
    }, [r2BaseUrl, univerInstance]);

    // Load initial visible chunks
    useEffect(() => {
        if (!manifest || !univerInstance) return;

        // Load first chunk immediately
        const initialChunks = getChunksForRange(0, bufferRows);
        initialChunks.forEach(loadChunk);
    }, [manifest, univerInstance, bufferRows, getChunksForRange, loadChunk]);

    // Expose method to load chunks for a specific range
    useEffect(() => {
        if (!manifest || !univerInstance) return;

        // Attach scroll handler to window for now
        // In production, hook into Univer's scroll events
        const handleVisibleRangeChange = (startRow: number, endRow: number) => {
            const bufferedStart = Math.max(0, startRow - bufferRows);
            const bufferedEnd = endRow + bufferRows;

            const neededChunks = getChunksForRange(bufferedStart, bufferedEnd);
            neededChunks.forEach(loadChunk);
        };

        // Expose on window for debugging and manual triggering
        (window as any).__loadChunksForRange = handleVisibleRangeChange;

        return () => {
            delete (window as any).__loadChunksForRange;
        };
    }, [manifest, univerInstance, bufferRows, getChunksForRange, loadChunk]);

    return {
        manifest,
        isLoading,
        loadedChunks: loadedChunks.current.size,
        totalChunks: manifest?.chunks.length || 0,
        error,
    };
}

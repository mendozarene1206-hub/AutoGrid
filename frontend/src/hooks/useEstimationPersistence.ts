/**
 * useEstimationPersistence.ts
 * 
 * React hook for saving/loading estimation snapshots.
 * Wraps UniverPersistenceService with React state management.
 */

import { useState, useCallback } from 'react';
import type { IWorkbookData } from '@univerjs/core';
import {
    saveSnapshot,
    loadSnapshot,
    calculateSnapshotHash,
    type SaveResult,
    type LoadResult
} from '../services/UniverPersistenceService';

export interface UseEstimationPersistenceResult {
    // State
    isSaving: boolean;
    isLoading: boolean;
    lastSaveResult: SaveResult | null;
    error: string | null;

    // Actions
    save: (spreadsheetId: string, workbook: IWorkbookData) => Promise<SaveResult | null>;
    load: (spreadsheetId: string) => Promise<LoadResult>;
    getHash: (workbook: IWorkbookData) => Promise<string>;

    // Progress
    progress: { phase: string; percent: number };
}

export function useEstimationPersistence(): UseEstimationPersistenceResult {
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [lastSaveResult, setLastSaveResult] = useState<SaveResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState({ phase: '', percent: 0 });

    const save = useCallback(async (
        spreadsheetId: string,
        workbook: IWorkbookData
    ): Promise<SaveResult | null> => {
        setIsSaving(true);
        setError(null);
        setProgress({ phase: 'Starting...', percent: 0 });

        try {
            const result = await saveSnapshot(spreadsheetId, workbook, (phase, percent) => {
                setProgress({ phase, percent });
            });
            setLastSaveResult(result);
            return result;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setIsSaving(false);
            setProgress({ phase: '', percent: 0 });
        }
    }, []);

    const load = useCallback(async (spreadsheetId: string): Promise<LoadResult> => {
        setIsLoading(true);
        setError(null);
        setProgress({ phase: 'Loading...', percent: 0 });

        try {
            const result = await loadSnapshot(spreadsheetId, (phase, percent) => {
                setProgress({ phase, percent });
            });
            if (!result.success && result.error) {
                setError(result.error);
            }
            return result;
        } catch (err: any) {
            setError(err.message);
            return {
                success: false,
                workbook: null,
                source: 'empty',
                error: err.message
            };
        } finally {
            setIsLoading(false);
            setProgress({ phase: '', percent: 0 });
        }
    }, []);

    const getHash = useCallback(async (workbook: IWorkbookData): Promise<string> => {
        return calculateSnapshotHash(workbook);
    }, []);

    return {
        isSaving,
        isLoading,
        lastSaveResult,
        error,
        save,
        load,
        getHash,
        progress
    };
}

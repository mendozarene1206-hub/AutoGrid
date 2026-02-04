/**
 * useUniverData.ts
 * 
 * Custom hook for fetching Univer Grid data from Trojan Architecture API.
 * Handles loading states, errors, race conditions, and cleanup.
 * 
 * Boris Cherny Tips Applied:
 * - Challenge Mode: AbortController for race conditions, cleanup on unmount
 * - Prove It Works: Structured logs, timing metrics
 * - Elegant Solution: Single responsibility, reusable hook
 * - Detailed Specs: Strict TypeScript, no `any`
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchJsonWithRetry } from '../lib/fetchWithRetry';

// =============================================================================
// TYPES
// =============================================================================

export type ColumnType = 'text' | 'number' | 'currency' | 'status';

export interface ColumnDef {
    field: string;
    headerName: string;
    type: ColumnType;
    width: number;
    editable: boolean;
}

export interface UniverMetadata {
    totalRows: number;
    totalColumns: number;
    lastModified: string;
    rowCount?: number;
}

export interface UniverRow {
    [key: string]: unknown;
    _conceptCode?: string;
}

export interface UniverData {
    estimationId: string;
    sheetName: string;
    metadata: UniverMetadata;
    columnDefs: ColumnDef[];
    rows: UniverRow[];
}

export interface ApiSuccessResponse {
    success: true;
    data: UniverData;
}

export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        timestamp: string;
        requestId: string;
    };
}

export type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

export interface UseUniverDataState {
    data: UniverData | null;
    loading: boolean;
    error: string | null;
    loadTimeMs: number | null;
}

export interface UseUniverDataReturn extends UseUniverDataState {
    refetch: () => Promise<void>;
    abort: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const LOG_PREFIX = '[useUniverData]';

// =============================================================================
// HOOK
// =============================================================================

export function useUniverData(estimationId: string | null): UseUniverDataReturn {
    // State
    const [state, setState] = useState<UseUniverDataState>({
        data: null,
        loading: false,
        error: null,
        loadTimeMs: null,
    });

    // Refs for race condition prevention
    const abortControllerRef = useRef<AbortController | null>(null);
    const isMountedRef = useRef<boolean>(true);
    const requestIdRef = useRef<number>(0);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort('Component unmounted');
                abortControllerRef.current = null;
            }
        };
    }, []);

    // Main fetch function
    const fetchData = useCallback(async (): Promise<void> => {
        // Validate estimationId
        if (!estimationId) {
            console.log(`${LOG_PREFIX} No estimationId provided, skipping fetch`);
            setState(prev => ({
                ...prev,
                data: null,
                loading: false,
                error: null,
                loadTimeMs: null,
            }));
            return;
        }

        // Increment request ID for tracking
        const currentRequestId = ++requestIdRef.current;
        const startTime = performance.now();

        console.log(`${LOG_PREFIX} [Request ${currentRequestId}] Loading data for estimationId: ${estimationId}`);

        // Abort any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort('New request initiated');
        }

        // Create new abort controller for this request
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Set loading state
        if (isMountedRef.current) {
            setState(prev => ({
                ...prev,
                loading: true,
                error: null,
                loadTimeMs: null,
            }));
        }

        try {
            const url = `${API_BASE_URL}/api/estimations/${encodeURIComponent(estimationId)}/univer-data`;
            console.log(`${LOG_PREFIX} [Request ${currentRequestId}] Fetching with retry: ${url}`);

            const { data: result, attempts, totalDelayMs: retryDelayMs } = await fetchJsonWithRetry<ApiResponse>(
                url,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    signal: abortController.signal,
                },
                {
                    maxRetries: 3,
                    baseDelayMs: 1000,
                    retryNetworkErrors: true,
                }
            );

            // Check if component is still mounted and this is the latest request
            if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
                console.log(`${LOG_PREFIX} [Request ${currentRequestId}] Request superseded or component unmounted, ignoring response`);
                return;
            }

            // Handle API error response (application-level error)
            if (!result.success) {
                const errorResponse = result as ApiErrorResponse;
                throw new Error(`${errorResponse.error.code}: ${errorResponse.error.message}`);
            }

            // Success
            const successResponse = result as ApiSuccessResponse;
            const loadTimeMs = Math.round(performance.now() - startTime);

            if (attempts > 1) {
                console.log(`${LOG_PREFIX} [Request ${currentRequestId}] Success after ${attempts} attempts (${retryDelayMs}ms retry delay)`);
            }

            console.log(`${LOG_PREFIX} [Request ${currentRequestId}] Data loaded successfully:`, {
                estimationId: successResponse.data.estimationId,
                sheetName: successResponse.data.sheetName,
                rows: successResponse.data.rows.length,
                columns: successResponse.data.columnDefs.length,
                loadTimeMs: `${loadTimeMs}ms`,
                attempts,
                retryDelayMs: attempts > 1 ? `${retryDelayMs}ms` : undefined,
            });

            setState({
                data: successResponse.data,
                loading: false,
                error: null,
                loadTimeMs,
            });

        } catch (err: unknown) {
            // Check if this is an abort error (expected when cancelling)
            if (err instanceof DOMException && err.name === 'AbortError') {
                console.log(`${LOG_PREFIX} [Request ${currentRequestId}] Request aborted:`, err.message);
                return;
            }

            // Check for race condition one more time
            if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
                console.log(`${LOG_PREFIX} [Request ${currentRequestId}] Error ignored due to race condition`);
                return;
            }

            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            const loadTimeMs = Math.round(performance.now() - startTime);

            console.error(`${LOG_PREFIX} [Request ${currentRequestId}] Error loading data:`, {
                estimationId,
                error: errorMessage,
                loadTimeMs: `${loadTimeMs}ms`,
            });

            setState({
                data: null,
                loading: false,
                error: errorMessage,
                loadTimeMs,
            });
        } finally {
            // Clean up abort controller if this was the current request
            if (abortControllerRef.current === abortController) {
                abortControllerRef.current = null;
            }
        }
    }, [estimationId]);

    // Manual abort function
    const abort = useCallback((): void => {
        if (abortControllerRef.current) {
            console.log(`${LOG_PREFIX} Manually aborting request`);
            abortControllerRef.current.abort('Manual abort');
            abortControllerRef.current = null;
        }
    }, []);

    // Auto-fetch when estimationId changes
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        ...state,
        refetch: fetchData,
        abort,
    };
}

export default useUniverData;

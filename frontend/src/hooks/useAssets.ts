/**
 * useAssets Hook
 * 
 * Custom hook for fetching and managing Trojan assets (photos, generators, specs).
 * Handles pagination, grouping by type, and automatic refresh of signed URLs.
 * 
 * Boris Cherny Tips Applied:
 * - Challenge Mode: AbortController for race conditions, signed URL refresh
 * - Prove It Works: Structured logs, metrics tracking
 * - Elegant Solution: Clean grouping logic, memoized transforms
 * - Detailed Specs: Full TypeScript types
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fetchJsonWithRetry } from '../lib/fetchWithRetry';
import type {
    TrojanAsset,
    AssetsState,
    UseAssetsOptions,
    TrojanAssetsResponse,
} from '../types/trojanAssets';

// ========================
// Constants
// ========================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const DEFAULT_LIMIT = 20;
const SIGNED_URL_REFRESH_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiry

// ========================
// Logger Utility
// ========================

const LOG_PREFIX = '[useAssets]';

interface LogContext {
    estimationId: string;
    conceptCode?: string;
    [key: string]: unknown;
}

function logInfo(message: string, context: LogContext): void {
    // eslint-disable-next-line no-console
    console.log(`${LOG_PREFIX} ${message}`, context);
}

function logWarn(message: string, context: LogContext & { warning: string }): void {
    // eslint-disable-next-line no-console
    console.warn(`${LOG_PREFIX} ${message}`, context);
}

function logError(message: string, context: LogContext & { error: unknown }): void {
    // eslint-disable-next-line no-console
    console.error(`${LOG_PREFIX} ${message}`, context);
}

// ========================
// Helper Functions
// ========================

/**
 * Groups assets by their type.
 */
function groupAssetsByType(assets: TrojanAsset[]): AssetsState['grouped'] {
    return {
        photos: assets.filter(a => a.type === 'photo'),
        generators: assets.filter(a => a.type === 'generator'),
        specs: assets.filter(a => a.type === 'spec'),
        details: assets.filter(a => a.type === 'detail'),
    };
}

/**
 * Checks if any signed URLs are about to expire.
 */
function hasExpiringUrls(assets: TrojanAsset[]): boolean {
    const now = Date.now();
    return assets.some(asset => {
        const expiryTime = new Date(asset.signedUrlExpiresAt).getTime();
        return expiryTime - now < SIGNED_URL_REFRESH_BUFFER;
    });
}

// ========================
// Hook Implementation
// ========================

interface UseAssetsReturn extends AssetsState {
    /** Load more assets (pagination) */
    loadMore: () => Promise<void>;
    /** Manual refresh function */
    refresh: () => Promise<void>;
    /** Whether a refresh is in progress */
    isRefreshing: boolean;
}

/**
 * Hook for fetching and managing assets for a specific concept.
 * 
 * @param estimationId - The estimation ID
 * @param conceptCode - The concept code to fetch assets for
 * @param options - Optional configuration
 * @returns Assets state and control functions
 */
export function useAssets(
    estimationId: string | null | undefined,
    conceptCode: string | null | undefined,
    options: UseAssetsOptions = {}
): UseAssetsReturn {
    const { limit = DEFAULT_LIMIT, offset: initialOffset = 0, signal: externalSignal } = options;
    
    // State
    const [assets, setAssets] = useState<TrojanAsset[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<AssetsState['pagination']>(null);
    const [offset, setOffset] = useState(initialOffset);
    
    // Refs for tracking
    const abortControllerRef = useRef<AbortController | null>(null);
    const currentKeyRef = useRef<string | null>(null);
    const signedUrlCheckRef = useRef<NodeJS.Timeout | null>(null);
    
    // Grouped assets (memoized)
    const grouped = useMemo(() => groupAssetsByType(assets), [assets]);
    
    // Generate cache key for current request
    const cacheKey = useMemo(() => {
        if (!estimationId || !conceptCode) return null;
        return `${estimationId}:${conceptCode}`;
    }, [estimationId, conceptCode]);
    
    // Main fetch function
    const fetchAssets = useCallback(async (
        targetEstimationId: string,
        targetConceptCode: string,
        targetOffset: number,
        append: boolean = false,
        isRefresh: boolean = false
    ): Promise<void> => {
        const startTime = performance.now();
        
        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        // Create new abort controller
        abortControllerRef.current = new AbortController();
        const signal = externalSignal
            ? AbortSignal.any([abortControllerRef.current.signal, externalSignal])
            : abortControllerRef.current.signal;
        
        // Update loading state
        if (isRefresh) {
            setIsRefreshing(true);
        } else if (append) {
            setIsLoadingMore(true);
        } else {
            setIsLoading(true);
        }
        
        if (!append) {
            setError(null);
        }
        
        logInfo('Fetching assets', {
            estimationId: targetEstimationId,
            conceptCode: targetConceptCode,
            offset: targetOffset,
            limit,
            append,
            isRefresh,
        });
        
        try {
            // Build URL
            const url = new URL(
                `${API_BASE_URL}/estimations/${targetEstimationId}/assets`
            );
            url.searchParams.set('conceptCode', targetConceptCode);
            url.searchParams.set('limit', String(limit));
            url.searchParams.set('offset', String(targetOffset));
            
            // Fetch with retry
            const fetchStartTime = performance.now();
            const { data, attempts, totalDelayMs: retryDelayMs } = await fetchJsonWithRetry<TrojanAssetsResponse>(
                url.toString(),
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    signal,
                },
                {
                    maxRetries: 3,
                    baseDelayMs: 1000,
                }
            );
            const fetchTime = performance.now() - fetchStartTime;
            
            if (attempts > 1) {
                logInfo(`Success after ${attempts} attempts`, { estimationId: targetEstimationId, conceptCode: targetConceptCode, retryDelayMs });
            }
            
            if (!data.success) {
                throw new Error('API returned unsuccessful response');
            }
            
            if (!data.success) {
                throw new Error('API returned unsuccessful response');
            }
            
            const { data: responseData } = data;
            
            // Update state
            if (append) {
                setAssets(prev => [...prev, ...responseData.assets]);
            } else {
                setAssets(responseData.assets);
            }
            
            setPagination({
                total: responseData.total,
                limit: responseData.limit,
                offset: responseData.offset,
                hasMore: responseData.offset + responseData.assets.length < responseData.total,
            });
            
            const totalTime = performance.now() - startTime;
            
            logInfo('Assets loaded successfully', {
                estimationId: targetEstimationId,
                conceptCode: targetConceptCode,
                count: responseData.assets.length,
                total: responseData.total,
                fetchTime: `${Math.round(fetchTime)}ms`,
                totalTime: `${Math.round(totalTime)}ms`,
            });
            
        } catch (err) {
            // Handle abort
            if (err instanceof Error && err.name === 'AbortError') {
                logInfo('Request aborted', {
                    estimationId: targetEstimationId,
                    conceptCode: targetConceptCode,
                    reason: 'New request or component unmount',
                });
                return;
            }
            
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            
            logError('Failed to load assets', {
                estimationId: targetEstimationId,
                conceptCode: targetConceptCode,
                error: err,
            });
            
            setError(errorMessage);
            
            if (!append) {
                setAssets([]);
                setPagination(null);
            }
            
        } finally {
            if (isRefresh) {
                setIsRefreshing(false);
            } else if (append) {
                setIsLoadingMore(false);
            } else {
                setIsLoading(false);
            }
            
            // Clear abort controller if it's ours
            if (abortControllerRef.current && !externalSignal) {
                abortControllerRef.current = null;
            }
        }
    }, [limit, externalSignal]);
    
    // Load more function (pagination)
    const loadMore = useCallback(async (): Promise<void> => {
        if (!estimationId || !conceptCode || !pagination?.hasMore || isLoadingMore) {
            logWarn('Cannot load more', {
                estimationId: estimationId || 'null',
                conceptCode: conceptCode || 'null',
                warning: 'Missing params or no more data',
            });
            return;
        }
        
        const newOffset = offset + limit;
        setOffset(newOffset);
        await fetchAssets(estimationId, conceptCode, newOffset, true, false);
    }, [estimationId, conceptCode, offset, limit, pagination?.hasMore, isLoadingMore, fetchAssets]);
    
    // Refresh function
    const refresh = useCallback(async (): Promise<void> => {
        if (!estimationId || !conceptCode) {
            logWarn('Cannot refresh', {
                estimationId: estimationId || 'null',
                conceptCode: conceptCode || 'null',
                warning: 'Missing estimationId or conceptCode',
            });
            return;
        }
        
        setOffset(0);
        await fetchAssets(estimationId, conceptCode, 0, false, true);
    }, [estimationId, conceptCode, fetchAssets]);
    
    // Effect: Fetch when estimationId or conceptCode changes
    useEffect(() => {
        // Reset state when params change
        if (!estimationId || !conceptCode) {
            setAssets([]);
            setError(null);
            setPagination(null);
            setOffset(0);
            currentKeyRef.current = null;
            
            // Clear signed URL check
            if (signedUrlCheckRef.current) {
                clearInterval(signedUrlCheckRef.current);
                signedUrlCheckRef.current = null;
            }
            return;
        }
        
        // Skip if same key
        const key = `${estimationId}:${conceptCode}`;
        if (key === currentKeyRef.current && assets.length > 0) {
            logInfo('Skipping fetch: same key', {
                estimationId,
                conceptCode,
                reason: 'Data already loaded',
            });
            return;
        }
        
        currentKeyRef.current = key;
        setOffset(0);
        fetchAssets(estimationId, conceptCode, 0, false, false);
        
        // Cleanup: abort on unmount or params change
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, [estimationId, conceptCode, fetchAssets]); // Don't include assets.length to avoid loop
    
    // Effect: Monitor signed URLs for expiration
    useEffect(() => {
        if (assets.length === 0) {
            if (signedUrlCheckRef.current) {
                clearInterval(signedUrlCheckRef.current);
                signedUrlCheckRef.current = null;
            }
            return;
        }
        
        // Check immediately
        if (hasExpiringUrls(assets)) {
            logInfo('Detected expiring URLs, refreshing', {
                estimationId: estimationId || 'unknown',
                conceptCode: conceptCode || 'unknown',
            });
            refresh();
        }
        
        // Set up interval to check periodically
        signedUrlCheckRef.current = setInterval(() => {
            if (hasExpiringUrls(assets)) {
                logInfo('URLs expiring soon, auto-refreshing', {
                    estimationId: estimationId || 'unknown',
                    conceptCode: conceptCode || 'unknown',
                });
                refresh();
            }
        }, 60000); // Check every minute
        
        return () => {
            if (signedUrlCheckRef.current) {
                clearInterval(signedUrlCheckRef.current);
            }
        };
    }, [assets, estimationId, conceptCode, refresh]);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (signedUrlCheckRef.current) {
                clearInterval(signedUrlCheckRef.current);
            }
        };
    }, []);
    
    return {
        assets,
        isLoading,
        isLoadingMore,
        error,
        pagination,
        grouped,
        loadMore,
        refresh,
        isRefreshing,
    };
}

export default useAssets;

/**
 * useTreeData Hook
 * 
 * Custom hook for fetching and transforming Trojan tree data.
 * Handles fetching from API, flattening the hierarchy, and state management.
 * 
 * Boris Cherny Tips Applied:
 * - Challenge Mode: AbortController for race conditions, cycle detection
 * - Prove It Works: Structured logs, detailed metrics
 * - Elegant Solution: Clean separation of concerns, memoized transforms
 * - Detailed Specs: Full TypeScript types, error handling
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fetchJsonWithRetry } from '../lib/fetchWithRetry';
import type {
    TrojanTreeNode,
    TrojanFlatNode,
    TreeDataState,
    UseTreeDataOptions,
    TreeTransformMetrics,
} from '../types/trojanTree';

// ========================
// Constants
// ========================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const DEFAULT_TIMEOUT = 30000;

// ========================
// Logger Utility
// ========================

const LOG_PREFIX = '[useTreeData]';

interface LogContext {
    estimationId: string;
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
 * Recursively flattens a tree structure into an array.
 * Includes cycle detection to prevent infinite loops.
 */
function flattenTree(
    nodes: TrojanTreeNode[],
    visited: Set<string> = new Set(),
    depth: number = 0
): TrojanFlatNode[] {
    const result: TrojanFlatNode[] = [];
    
    for (const node of nodes) {
        // Cycle detection
        if (visited.has(node.id)) {
            logWarn('Cycle detected in tree data', {
                estimationId: 'unknown',
                nodeId: node.id,
                depth,
                warning: `Node ${node.id} appears multiple times in hierarchy`,
            });
            continue;
        }
        
        visited.add(node.id);
        
        // Add current node (without children)
        const flatNode: TrojanFlatNode = {
            ...node,
            hierarchy: [...node.hierarchyPath],
        };
        delete (flatNode as Partial<Pick<TrojanTreeNode, 'children'>>).children;
        result.push(flatNode);
        
        // Recursively process children
        if (node.children && node.children.length > 0) {
            const children = flattenTree(node.children, new Set(visited), depth + 1);
            result.push(...children);
        }
    }
    
    return result;
}

/**
 * Alternative: Flatten from pre-computed flatList if available.
 * More efficient than recursive traversal.
 */
function flattenFromFlatList(flatList: TrojanTreeNode[]): TrojanFlatNode[] {
    return flatList.map(node => ({
        ...node,
        hierarchy: [...node.hierarchyPath],
    }));
}

/**
 * Validates that the tree data structure is correct.
 */
function validateTreeData(data: unknown, estimationId: string): { valid: boolean; error?: string } {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Invalid response: not an object' };
    }
    
    const response = data as { success?: boolean; data?: { flatList?: unknown[]; totalNodes?: number } };
    
    if (!response.success) {
        return { valid: false, error: 'API returned unsuccessful response' };
    }
    
    if (!response.data) {
        return { valid: false, error: 'Missing data field in response' };
    }
    
    if (!Array.isArray(response.data.flatList)) {
        return { valid: false, error: 'flatList is not an array' };
    }
    
    if (response.data.totalNodes !== response.data.flatList.length) {
        logWarn('Mismatch in node count', {
            estimationId,
            warning: `totalNodes (${response.data.totalNodes}) !== flatList.length (${response.data.flatList.length})`,
        });
        // Non-fatal, continue with actual count
    }
    
    return { valid: true };
}

// ========================
// Hook Implementation
// ========================

interface UseTreeDataReturn extends TreeDataState {
    /** Manual refetch function */
    refetch: () => Promise<void>;
    /** Whether a refetch is in progress */
    isRefetching: boolean;
}

/**
 * Hook for fetching and managing Trojan tree data.
 * 
 * @param estimationId - The estimation ID to fetch data for
 * @param options - Optional configuration
 * @returns Tree data state and control functions
 */
export function useTreeData(
    estimationId: string | null | undefined,
    options: UseTreeDataOptions = {}
): UseTreeDataReturn {
    const { signal: externalSignal, includeEmpty, maxDepth } = options;
    
    // State
    const [flatNodes, setFlatNodes] = useState<TrojanFlatNode[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefetching, setIsRefetching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<TreeDataState['metadata']>(null);
    const [metrics, setMetrics] = useState<TreeDataState['metrics']>(null);
    
    // Refs for tracking
    const abortControllerRef = useRef<AbortController | null>(null);
    const currentEstimationIdRef = useRef<string | null>(null);
    
    // Build query params
    const queryParams = useMemo(() => {
        const params = new URLSearchParams();
        if (includeEmpty !== undefined) params.set('includeEmpty', String(includeEmpty));
        if (maxDepth !== undefined) params.set('maxDepth', String(maxDepth));
        return params.toString();
    }, [includeEmpty, maxDepth]);
    
    // Main fetch function
    const fetchData = useCallback(async (
        targetEstimationId: string,
        isRefetch: boolean = false
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
        if (isRefetch) {
            setIsRefetching(true);
        } else {
            setIsLoading(true);
        }
        setError(null);
        
        logInfo('Fetching tree data', {
            estimationId: targetEstimationId,
            isRefetch,
            queryParams: queryParams || '(none)',
        });
        
        try {
            // Build URL
            let url = `${API_BASE_URL}/estimations/${targetEstimationId}/tree-data`;
            if (queryParams) {
                url += `?${queryParams}`;
            }
            
            // Fetch with retry
            const fetchStartTime = performance.now();
            const { data, attempts, totalDelayMs: retryDelayMs } = await fetchJsonWithRetry<unknown>(
                url,
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
                logInfo(`Success after ${attempts} attempts`, { estimationId: targetEstimationId, retryDelayMs });
            }
            
            // Validate structure
            const validation = validateTreeData(data, targetEstimationId);
            if (!validation.valid) {
                throw new Error(validation.error);
            }
            
            const { data: treeData } = data as { data: { 
                flatList: TrojanTreeNode[]; 
                totalNodes: number; 
                maxDepth: number;
                roots: TrojanTreeNode[];
            } };
            
            // Transform to flat structure
            const transformStartTime = performance.now();
            
            // Prefer flatList if available, otherwise flatten from roots
            const flattened = treeData.flatList?.length > 0
                ? flattenFromFlatList(treeData.flatList)
                : flattenTree(treeData.roots);
                
            const transformTime = performance.now() - transformStartTime;
            const totalTime = performance.now() - startTime;
            
            // Update state
            setFlatNodes(flattened);
            setMetadata({
                totalNodes: treeData.totalNodes,
                maxDepth: treeData.maxDepth,
            });
            setMetrics({
                fetchTime: Math.round(fetchTime),
                transformTime: Math.round(transformTime),
                totalTime: Math.round(totalTime),
            });
            
            logInfo('Tree data loaded successfully', {
                estimationId: targetEstimationId,
                totalNodes: treeData.totalNodes,
                maxDepth: treeData.maxDepth,
                flatNodeCount: flattened.length,
                fetchTime: `${Math.round(fetchTime)}ms`,
                transformTime: `${Math.round(transformTime)}ms`,
                totalTime: `${Math.round(totalTime)}ms`,
            });
            
        } catch (err) {
            // Handle abort
            if (err instanceof Error && err.name === 'AbortError') {
                logInfo('Request aborted', {
                    estimationId: targetEstimationId,
                    reason: 'New request or component unmount',
                });
                return;
            }
            
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            
            logError('Failed to load tree data', {
                estimationId: targetEstimationId,
                error: err,
            });
            
            setError(errorMessage);
            setFlatNodes([]);
            setMetadata(null);
            
        } finally {
            if (isRefetch) {
                setIsRefetching(false);
            } else {
                setIsLoading(false);
            }
            
            // Clear abort controller if it's ours
            if (abortControllerRef.current && !externalSignal) {
                abortControllerRef.current = null;
            }
        }
    }, [queryParams, externalSignal]);
    
    // Refetch function exposed to consumers
    const refetch = useCallback(async (): Promise<void> => {
        if (!estimationId) {
            logWarn('Cannot refetch: no estimationId', {
                estimationId: 'null',
                warning: 'refetch called without estimationId',
            });
            return;
        }
        await fetchData(estimationId, true);
    }, [estimationId, fetchData]);
    
    // Effect: Fetch when estimationId changes
    useEffect(() => {
        if (!estimationId) {
            // Reset state when no estimationId
            setFlatNodes([]);
            setError(null);
            setMetadata(null);
            setMetrics(null);
            setIsLoading(false);
            currentEstimationIdRef.current = null;
            return;
        }
        
        // Skip if same estimationId
        if (estimationId === currentEstimationIdRef.current && flatNodes.length > 0) {
            logInfo('Skipping fetch: same estimationId', {
                estimationId,
                reason: 'Data already loaded',
            });
            return;
        }
        
        currentEstimationIdRef.current = estimationId;
        fetchData(estimationId, false);
        
        // Cleanup: abort on unmount or estimationId change
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, [estimationId, fetchData]);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);
    
    return {
        flatNodes,
        isLoading,
        error,
        metadata,
        metrics,
        refetch,
        isRefetching,
    };
}

export default useTreeData;

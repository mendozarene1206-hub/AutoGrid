/**
 * Types for Trojan Tree View (WBS - Work Breakdown Structure)
 * 
 * Types shared between frontend and backend for tree data operations.
 */

// ========================
// Tree Node Types
// ========================

/** Type of node in the WBS hierarchy */
export type TrojanNodeType = 'category' | 'concept';

/** Single node in the Trojan tree hierarchy */
export interface TrojanTreeNode {
    /** Unique identifier (e.g., "node-5.2.1") */
    id: string;
    
    /** Full hierarchy path as array (e.g., ["5", "5.2", "5.2.1"]) */
    hierarchyPath: string[];
    
    /** Depth level in the tree (0 = root) */
    level: number;
    
    /** WBS code (e.g., "5.2.1") */
    code: string;
    
    /** Display name of the node */
    name: string;
    
    /** Type: category (folder) or concept (leaf) */
    type: TrojanNodeType;
    
    /** Number of rows in Excel for this concept */
    rowCount: number;
    
    /** Number of photos associated */
    photoCount: number;
    
    /** Number of generator sheets */
    generatorCount: number;
    
    /** Number of specification sheets */
    specCount: number;
    
    /** True if this is a leaf node (no children) */
    isLeaf: boolean;
    
    /** Child nodes (undefined for leaves or when not loaded) */
    children?: TrojanTreeNode[];
    
    /** Concept code for lookup (only for type='concept') */
    conceptCode?: string;
}

/** Flat node structure optimized for AG Grid tree data */
export interface TrojanFlatNode extends Omit<TrojanTreeNode, 'children'> {
    /** Same as hierarchyPath, required by AG Grid getDataPath */
    hierarchy: string[];
}

// ========================
// API Response Types
// ========================

/** Response from GET /api/estimations/:id/tree-data */
export interface TrojanTreeDataResponse {
    success: true;
    data: {
        /** Estimation ID */
        estimationId: string;
        
        /** Total number of nodes in the tree */
        totalNodes: number;
        
        /** Maximum depth of the tree */
        maxDepth: number;
        
        /** Root nodes (hierarchical structure) */
        roots: TrojanTreeNode[];
        
        /** Flat list for AG Grid (all nodes in one array) */
        flatList: TrojanTreeNode[];
    };
}

/** Error response structure */
export interface TrojanTreeErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        timestamp: string;
        requestId: string;
    };
}

// ========================
// Component Props Types
// ========================

/** Props for TrojanTreeView component */
export interface TrojanTreeViewProps {
    /** Estimation ID to load tree data */
    estimationId: string;
    
    /** Callback when a concept node is selected */
    onConceptSelect?: (conceptCode: string, node: TrojanTreeNode) => void;
    
    /** Currently selected concept code (for highlighting) */
    selectedConceptCode?: string | null;
}

// ========================
// Hook Types
// ========================

/** State for useTreeData hook */
export interface TreeDataState {
    /** Flat list of nodes ready for AG Grid */
    flatNodes: TrojanFlatNode[];
    
    /** Loading state */
    isLoading: boolean;
    
    /** Error message if any */
    error: string | null;
    
    /** Tree metadata */
    metadata: {
        totalNodes: number;
        maxDepth: number;
    } | null;
    
    /** Time metrics */
    metrics: {
        fetchTime: number;
        transformTime: number;
        totalTime: number;
    } | null;
}

/** Options for useTreeData hook */
export interface UseTreeDataOptions {
    /** Abort signal for cancellation */
    signal?: AbortSignal;
    
    /** Include empty nodes */
    includeEmpty?: boolean;
    
    /** Maximum depth to load */
    maxDepth?: number;
}

// ========================
// Utility Types
// ========================

/** Metrics for performance monitoring */
export interface TreeTransformMetrics {
    /** Time to fetch from API (ms) */
    fetchTime: number;
    
    /** Time to transform tree to flat (ms) */
    transformTime: number;
    
    /** Total time (ms) */
    totalTime: number;
    
    /** Number of nodes processed */
    nodeCount: number;
    
    /** Maximum depth found */
    maxDepth: number;
}

/** Row data type for AG Grid */
export interface TreeRowData {
    id: string;
    hierarchy: string[];
    hierarchyPath: string[];
    level: number;
    code: string;
    name: string;
    type: TrojanNodeType;
    rowCount: number;
    photoCount: number;
    generatorCount: number;
    specCount: number;
    isLeaf: boolean;
    conceptCode?: string;
}

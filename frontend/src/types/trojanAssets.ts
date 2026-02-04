/**
 * Types for Trojan Asset Panel
 * 
 * Types for managing assets (photos, generators, specs) associated with
 * estimation concepts. Shared between frontend and backend.
 */

// ========================
// Asset Types
// ========================

/** Type of asset stored for a concept */
export type TrojanAssetType = 'photo' | 'generator' | 'spec' | 'detail';

/** Single asset item (photo, generator, or spec) */
export interface TrojanAsset {
    /** Unique identifier */
    id: string;
    
    /** Associated concept code (e.g., "5.2.1") */
    conceptCode: string;
    
    /** Asset type classification */
    type: TrojanAssetType;
    
    /** Stored filename */
    filename: string;
    
    /** Original filename before upload */
    originalName: string;
    
    /** Image width in pixels (if applicable) */
    width: number;
    
    /** Image height in pixels (if applicable) */
    height: number;
    
    /** File size in bytes */
    sizeBytes: number;
    
    /** Storage path in R2/S3 */
    storagePath: string;
    
    /** Temporary signed URL for access */
    signedUrl: string;
    
    /** ISO timestamp when signedUrl expires */
    signedUrlExpiresAt: string;
    
    /** ISO timestamp when uploaded */
    uploadedAt: string;
}

// ========================
// API Response Types
// ========================

/** Response from GET /api/estimations/:id/assets */
export interface TrojanAssetsResponse {
    success: true;
    data: {
        /** Estimation ID */
        estimationId: string;
        
        /** Concept code queried */
        conceptCode: string;
        
        /** Total assets available for this concept */
        total: number;
        
        /** Limit applied to query */
        limit: number;
        
        /** Offset applied to query */
        offset: number;
        
        /** Asset items */
        assets: TrojanAsset[];
    };
}

/** Error response structure */
export interface TrojanAssetsErrorResponse {
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

/** Props for TrojanAssetPanel component */
export interface TrojanAssetPanelProps {
    /** Estimation ID to load assets for */
    estimationId: string;
    
    /** Currently selected concept code (null = no selection) */
    conceptCode: string | null;
    
    /** Whether panel is open/visible */
    isOpen: boolean;
    
    /** Callback to close panel */
    onClose: () => void;
    
    /** Optional callback when asset is clicked */
    onAssetClick?: (asset: TrojanAsset) => void;
}

/** Props for AssetThumbnail component */
export interface AssetThumbnailProps {
    /** Asset to display */
    asset: TrojanAsset;
    
    /** Size variant */
    size?: 'small' | 'medium' | 'large';
    
    /** Click handler */
    onClick?: (asset: TrojanAsset) => void;
    
    /** Additional CSS class */
    className?: string;
}

/** Props for AssetLightbox component */
export interface AssetLightboxProps {
    /** All assets in the current view */
    assets: TrojanAsset[];
    
    /** Currently displayed asset index */
    currentIndex: number;
    
    /** Close handler */
    onClose: () => void;
    
    /** Navigate to next asset */
    onNext: () => void;
    
    /** Navigate to previous asset */
    onPrev: () => void;
}

// ========================
// Hook Types
// ========================

/** State for useAssets hook */
export interface AssetsState {
    /** Loaded assets */
    assets: TrojanAsset[];
    
    /** Loading state */
    isLoading: boolean;
    
    /** Loading more (pagination) */
    isLoadingMore: boolean;
    
    /** Error message if any */
    error: string | null;
    
    /** Pagination metadata */
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    } | null;
    
    /** Assets grouped by type */
    grouped: {
        photos: TrojanAsset[];
        generators: TrojanAsset[];
        specs: TrojanAsset[];
        details: TrojanAsset[];
    };
}

/** Options for useAssets hook */
export interface UseAssetsOptions {
    /** Assets per page */
    limit?: number;
    
    /** Initial offset */
    offset?: number;
    
    /** Abort signal for cancellation */
    signal?: AbortSignal;
}

// ========================
// Tab Types
// ========================

/** Available tabs in asset panel */
export type AssetTab = 'photos' | 'generators' | 'specs' | 'details';

/** Tab configuration */
export interface AssetTabConfig {
    id: AssetTab;
    label: string;
    icon: string;
    assetType: TrojanAssetType;
    count: number;
}

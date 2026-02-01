// ============================================================================
// AutoGrid Shared Types
// ============================================================================

// Legacy Manifest (for backward compatibility)
export interface Manifest {
    version: 1;
    originalFileName: string;
    totalRows: number;
    totalColumns: number;
    chunkSize: number;
    chunks: ChunkMeta[];
    styles: Record<string, any>;
    sheets: SheetMeta[];
    // Trojan data (optional for backward compatibility)
    trojanManifest?: TrojanManifest;
}

export interface ChunkMeta {
    sheetId: string;
    startRow: number;
    endRow: number;
    key: string;
}

export interface SheetMeta {
    id: string;
    name: string;
    rowCount: number;
    columnCount: number;
    mergeData: any[];
    columnWidths: Record<number, number>;
}

// ============================================================================
// LEGACY JOB DATA
// ============================================================================

export interface ProcessingJobData {
    fileKey: string;
    userId: string;
    spreadsheetId: string;
}

// ============================================================================
// TROJAN ARCHITECTURE TYPES
// ============================================================================

export interface TrojanJobData {
    fileKey: string;
    userId: string;
    spreadsheetId: string;
    estimationId: string;
}

export interface TrojanManifest {
    version: number;
    originalFileName: string;
    processedAt: string;
    spreadsheetId: string;
    
    // Hoja principal (datos)
    mainSheet: {
        name: string;
        rowCount: number;
        columnCount: number;
        data: Array<Record<string, any>>;
        headers: string[];
    };
    
    // Assets extraídos
    assets: TrojanAsset[];
    
    // Mapeo concepto -> assets
    conceptAssetMap: Record<string, string[]>;
    
    // Stats
    stats: {
        totalSheets: number;
        mainSheetRows: number;
        imagesFound: number;
        imagesProcessed: number;
        imagesFailed: number;
        totalProcessingTimeMs: number;
    };
}

export interface TrojanAsset {
    id: string;
    conceptCode: string;
    originalSheet: string;
    originalCell: string;
    filename: string;
    r2Key: string;
    r2Url: string;
    size: number;
    width: number;
    height: number;
    format: 'webp';
    extractedAt: string;
}

// ============================================================================
// DATABASE TYPES (Supabase)
// ============================================================================

export interface EstimationSheet {
    id: string;
    spreadsheet_id: string;
    sheet_name: string;
    row_count: number;
    column_count: number;
    headers: string[];
    data: Record<string, any>[];
    data_r2_key: string;
    manifest_r2_key: string;
    processed_at: string;
    processing_time_ms: number;
    version: number;
    created_at: string;
    updated_at: string;
}

export interface EstimationAsset {
    id: string;
    spreadsheet_id: string;
    estimation_sheet_id: string | null;
    asset_id: string;
    concept_code: string;
    original_sheet_name: string;
    original_cell_ref: string;
    filename: string;
    file_format: string;
    file_size_bytes: number;
    width_pixels: number;
    height_pixels: number;
    r2_key: string;
    r2_url: string;
    r2_bucket: string;
    extracted_at: string;
    processing_metadata: Record<string, any>;
    status: 'active' | 'deleted' | 'error';
    created_at: string;
    updated_at: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface TrojanProcessingResult {
    success: boolean;
    manifestKey: string;
    mainDataKey: string;
    mainSheet: {
        name: string;
        rowCount: number;
        columnCount: number;
    };
    assets: {
        total: number;
        byConcept: number;
    };
    stats: TrojanManifest['stats'];
}

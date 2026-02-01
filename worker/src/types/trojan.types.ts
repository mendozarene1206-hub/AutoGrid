/**
 * Trojan Architecture Types
 * 
 * Type definitions for the Trojan Processor which separates:
 * - Data: Main "Desglose" sheet as flat JSON
 * - Assets: Images from other sheets converted to WebP
 */

import type { S3Client } from '@aws-sdk/client-s3';

// ============================================================================
// JOB DATA
// ============================================================================

export interface TrojanJobData {
  fileKey: string;
  userId: string;
  spreadsheetId: string;
  estimationId: string;
}

// ============================================================================
// MANIFEST
// ============================================================================

export interface TrojanManifest {
  version: number;
  originalFileName: string;
  processedAt: string;
  spreadsheetId: string;
  
  /** Main sheet (Desglose) data */
  mainSheet: {
    name: string;
    rowCount: number;
    columnCount: number;
    data: Array<Record<string, any>>;
    headers: string[];
  };
  
  /** Extracted image assets */
  assets: TrojanAsset[];
  
  /** Map concept codes to asset IDs */
  conceptAssetMap: Record<string, string[]>;
  
  /** Processing statistics */
  stats: {
    totalSheets: number;
    mainSheetRows: number;
    imagesFound: number;
    imagesProcessed: number;
    imagesFailed: number;
    totalProcessingTimeMs: number;
  };
  
  /** Processing errors (if any) */
  errors?: ProcessingError[];
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

export interface ProcessingError {
  sheet?: string;
  assetId?: string;
  type: 'sheet_processing' | 'image_extraction' | 'upload' | 'download' | 'conversion';
  message: string;
  timestamp: string;
}

// ============================================================================
// PROCESSOR OPTIONS
// ============================================================================

export interface TrojanProcessorOptions {
  s3: S3Client;
  bucket: string;
  fileKey: string;
  outputPrefix: string;
  jobData: TrojanJobData;
  onProgress?: (percent: number, message: string) => void | Promise<void>;
}

// ============================================================================
// SHEET DATA
// ============================================================================

export interface MainSheetData {
  headers: string[];
  rows: Array<Record<string, any>>;
  rowCount: number;
  columnCount: number;
}

// ============================================================================
// RESULT
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

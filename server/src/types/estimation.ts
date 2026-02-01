/**
 * Estimation API Types
 * 
 * Type definitions for Phase 2: API Endpoints
 * Following Boris Cherny's "Detailed Specs" tip
 */

import { z } from 'zod';

// ============================================================================
// DATABASE MODELS (from Supabase)
// ============================================================================

export interface EstimationAssetDB {
  id: string;
  estimation_id: string;
  concept_code: string;
  sheet_type: 'detail' | 'generator' | 'photo' | 'spec';
  image_count: number;
  storage_path: string;
  filename: string;
  file_size_bytes: number;
  width_pixels: number;
  height_pixels: number;
  created_at: string;
}

export interface EstimationSheetDB {
  id: string;
  estimation_id: string;
  sheet_name: string;
  concept_code: string;
  is_main: boolean;
  row_count: number;
  data_r2_key: string;
  manifest_r2_key: string;
  created_at: string;
}

// ============================================================================
// API REQUEST TYPES
// ============================================================================

export interface GetUniverDataParams {
  id: string;
}

export interface GetTreeDataParams {
  id: string;
}

export interface GetAssetsParams {
  id: string;
}

export interface GetAssetsQuery {
  conceptCode?: string;
  sheetType?: 'detail' | 'generator' | 'photo' | 'spec';
  limit?: string;
  offset?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface UniverDataResponse {
  success: true;
  data: {
    estimationId: string;
    sheetName: string;
    metadata: {
      totalRows: number;
      totalColumns: number;
      lastModified: string;
      rowCount: number;
    };
    columnDefs: ColumnDef[];
    rows: Array<Record<string, any>>;
  };
}

export interface ColumnDef {
  field: string;
  headerName: string;
  type: 'text' | 'number' | 'formula' | 'date';
  width?: number;
  editable: boolean;
}

export interface TreeDataResponse {
  success: true;
  data: {
    estimationId: string;
    totalNodes: number;
    maxDepth: number;
    roots: TreeNode[];
    flatList: TreeNode[];
  };
}

export interface TreeNode {
  id: string;
  hierarchyPath: string[];
  level: number;
  code: string;
  name: string;
  type: 'category' | 'concept';
  rowCount: number;
  photoCount: number;
  generatorCount: number;
  specCount: number;
  children?: TreeNode[];
  parentId?: string;
  isLeaf: boolean;
  conceptCode?: string;
}

export interface AssetsResponse {
  success: true;
  data: {
    estimationId: string;
    conceptCode: string | null;
    total: number;
    limit: number;
    offset: number;
    assets: AssetDTO[];
  };
}

export interface AssetDTO {
  id: string;
  conceptCode: string;
  type: 'detail' | 'generator' | 'photo' | 'spec';
  filename: string;
  originalName: string;
  width: number;
  height: number;
  sizeBytes: number;
  storagePath: string;
  signedUrl: string;
  signedUrlExpiresAt: string;
  uploadedAt: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface APIErrorResponse {
  success: false;
  error: {
    code: 
      | 'NOT_FOUND' 
      | 'UNAUTHORIZED' 
      | 'VALIDATION_ERROR' 
      | 'RATE_LIMITED'
      | 'INTERNAL_ERROR';
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
  };
}

// ============================================================================
// SERVICE TYPES
// ============================================================================

export interface EstimationServiceConfig {
  r2Bucket: string;
  r2PublicUrl: string;
  signedUrlExpirySeconds: number;
  maxTreeDepth: number;
  defaultLimit: number;
  maxLimit: number;
}

export interface BuildTreeOptions {
  includeEmptyNodes?: boolean;
  maxDepth?: number;
}

export interface GetAssetsOptions {
  conceptCode?: string;
  sheetType?: EstimationAssetDB['sheet_type'];
  limit: number;
  offset: number;
  generateSignedUrls: boolean;
}

// ============================================================================
// ZOD SCHEMAS (for validation)
// ============================================================================

export const GetUniverDataParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid estimation ID format' }),
});

export const GetTreeDataParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid estimation ID format' }),
});

export const GetAssetsParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid estimation ID format' }),
});

export const GetAssetsQuerySchema = z.object({
  conceptCode: z.string().regex(/^\d+(\.\d+)*$/, { 
    message: 'Concept code must be numbers separated by dots (e.g., 5.2.1)' 
  }).optional(),
  sheetType: z.enum(['detail', 'generator', 'photo', 'spec']).optional(),
  limit: z.string().transform(Number).pipe(
    z.number().min(1).max(100).default(20)
  ).optional(),
  offset: z.string().transform(Number).pipe(
    z.number().min(0).default(0)
  ).optional(),
});

// Type inference from schemas
export type GetUniverDataParamsInput = z.infer<typeof GetUniverDataParamsSchema>;
export type GetTreeDataParamsInput = z.infer<typeof GetTreeDataParamsSchema>;
export type GetAssetsParamsInput = z.infer<typeof GetAssetsParamsSchema>;
export type GetAssetsQueryInput = z.infer<typeof GetAssetsQuerySchema>;

/**
 * Estimation Service
 * 
 * Business logic for Phase 2 API endpoints
 * Following Boris Cherny's "Elegant Solution" tip - separation of concerns
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  EstimationAssetDB,
  EstimationSheetDB,
  UniverDataResponse,
  TreeDataResponse,
  AssetsResponse,
  TreeNode,
  AssetDTO,
  ColumnDef,
  EstimationServiceConfig,
  BuildTreeOptions,
  GetAssetsOptions,
  APIErrorResponse,
} from '../types/estimation.js';

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class EstimationService {
  private config: EstimationServiceConfig;
  private supabase: SupabaseClient;
  private s3: S3Client;

  constructor(config: EstimationServiceConfig, supabaseUrl: string, supabaseKey: string, s3: S3Client) {
    this.config = {
      signedUrlExpirySeconds: 3600, // 1 hour default
      maxTreeDepth: 10,
      defaultLimit: 20,
      maxLimit: 100,
      ...config,
    };
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.s3 = s3;
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Get Univer data - Main sheet as flat JSON
   */
  async getUniverData(estimationId: string): Promise<UniverDataResponse> {
    console.log(`[EstimationService] Getting Univer data for: ${estimationId}`);

    // 1. Fetch main sheet from DB
    const { data: sheet, error } = await this.supabase
      .from('estimation_sheets')
      .select('*')
      .eq('estimation_id', estimationId)
      .eq('is_main', true)
      .single();

    if (error || !sheet) {
      throw new NotFoundError(`Main sheet not found for estimation ${estimationId}`);
    }

    // 2. Fetch data from R2
    const sheetData = await this.fetchSheetDataFromR2(sheet.data_r2_key);

    // 3. Infer column definitions
    const columnDefs = this.inferColumnDefs(sheetData.headers, sheetData.rows);

    // 4. Build response
    return {
      success: true,
      data: {
        estimationId,
        sheetName: sheet.sheet_name,
        metadata: {
          totalRows: sheet.row_count,
          totalColumns: sheetData.headers.length,
          lastModified: sheet.created_at,
          rowCount: sheetData.rows.length,
        },
        columnDefs,
        rows: sheetData.rows,
      },
    };
  }

  /**
   * Get Tree data - Hierarchical structure for AG Grid
   */
  async getTreeData(estimationId: string, options: BuildTreeOptions = {}): Promise<TreeDataResponse> {
    console.log(`[EstimationService] Building tree for: ${estimationId}`);

    // 1. Fetch all sheets for this estimation
    const { data: sheets, error } = await this.supabase
      .from('estimation_sheets')
      .select('*')
      .eq('estimation_id', estimationId)
      .order('concept_code', { ascending: true });

    if (error) {
      throw new DatabaseError('Failed to fetch sheets', error);
    }

    if (!sheets || sheets.length === 0) {
      throw new NotFoundError(`No sheets found for estimation ${estimationId}`);
    }

    // 2. Fetch asset counts for aggregation
    const { data: assets } = await this.supabase
      .from('estimation_assets')
      .select('concept_code, sheet_type, image_count')
      .eq('estimation_id', estimationId);

    // 3. Aggregate counts by concept
    const assetCounts = this.aggregateAssetCounts(assets || []);

    // 4. Build hierarchical tree
    const tree = this.buildHierarchy(sheets, assetCounts, options);

    // 5. Flatten for AG Grid
    const flatList = this.flattenTree(tree);

    return {
      success: true,
      data: {
        estimationId,
        totalNodes: flatList.length,
        maxDepth: this.calculateMaxDepth(tree),
        roots: tree,
        flatList,
      },
    };
  }

  /**
   * Get Assets - List with signed URLs
   */
  async getAssets(estimationId: string, options: GetAssetsOptions): Promise<AssetsResponse> {
    console.log(`[EstimationService] Getting assets for: ${estimationId}`, options);

    // 1. Build query
    let query = this.supabase
      .from('estimation_assets')
      .select('*', { count: 'exact' })
      .eq('estimation_id', estimationId);

    // 2. Apply filters
    if (options.conceptCode) {
      query = query.eq('concept_code', options.conceptCode);
    }

    if (options.sheetType) {
      query = query.eq('sheet_type', options.sheetType);
    }

    // 3. Apply pagination
    const limit = Math.min(options.limit, this.config.maxLimit);
    query = query
      .order('created_at', { ascending: false })
      .range(options.offset, options.offset + limit - 1);

    // 4. Execute query
    const { data: assets, error, count } = await query;

    if (error) {
      throw new DatabaseError('Failed to fetch assets', error);
    }

    // 5. Generate signed URLs if requested
    const assetDTOs: AssetDTO[] = await Promise.all(
      (assets || []).map(asset => this.mapAssetToDTO(asset, options.generateSignedUrls))
    );

    return {
      success: true,
      data: {
        estimationId,
        conceptCode: options.conceptCode || null,
        total: count || 0,
        limit,
        offset: options.offset,
        assets: assetDTOs,
      },
    };
  }

  // ============================================================================
  // PRIVATE METHODS - Data Fetching
  // ============================================================================

  private async fetchSheetDataFromR2(dataR2Key: string): Promise<{
    headers: string[];
    rows: Array<Record<string, any>>;
  }> {
    try {
      const response = await this.s3.send(new GetObjectCommand({
        Bucket: this.config.r2Bucket,
        Key: dataR2Key,
      }));

      const chunks: Buffer[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(Buffer.from(chunk));
      }

      const data = JSON.parse(Buffer.concat(chunks).toString());
      
      return {
        headers: data.headers || [],
        rows: data.rows || [],
      };
    } catch (error) {
      console.error('[EstimationService] Failed to fetch from R2:', error);
      throw new R2Error(`Failed to fetch sheet data from ${dataR2Key}`);
    }
  }

  private async generateSignedUrl(storagePath: string): Promise<{ url: string; expiresAt: string }> {
    const command = new GetObjectCommand({
      Bucket: this.config.r2Bucket,
      Key: storagePath,
    });

    const url = await getSignedUrl(this.s3, command, {
      expiresIn: this.config.signedUrlExpirySeconds,
    });

    const expiresAt = new Date(Date.now() + this.config.signedUrlExpirySeconds * 1000).toISOString();

    return { url, expiresAt };
  }

  // ============================================================================
  // PRIVATE METHODS - Data Transformation
  // ============================================================================

  private inferColumnDefs(headers: string[], rows: any[]): ColumnDef[] {
    return headers.map((header, index) => {
      // Sample first 100 rows to infer type
      const sample = rows.slice(0, 100);
      const type = this.inferColumnType(sample, header);
      
      return {
        field: header,
        headerName: header,
        type,
        width: this.estimateColumnWidth(header, sample, index),
        editable: !header.startsWith('_'), // Internal fields (like _conceptCode) are not editable
      };
    });
  }

  private inferColumnType(rows: any[], field: string): ColumnDef['type'] {
    let hasNumber = false;
    let hasDate = false;
    let hasFormula = false;
    let hasText = false;

    for (const row of rows) {
      const value = row[field];
      
      if (value === null || value === undefined) continue;
      
      // Check for formula object
      if (typeof value === 'object' && value.formula) {
        hasFormula = true;
        continue;
      }
      
      const strValue = String(value).trim();
      if (!strValue) continue;

      // Check for number
      if (!isNaN(Number(strValue)) && strValue !== '') {
        hasNumber = true;
        continue;
      }

      // Check for date
      if (/^\d{4}-\d{2}-\d{2}/.test(strValue) || !isNaN(Date.parse(strValue))) {
        hasDate = true;
        continue;
      }

      hasText = true;
    }

    // Priority: formula > date > number > text
    if (hasFormula) return 'formula';
    if (hasDate && !hasNumber && !hasText) return 'date';
    if (hasNumber && !hasDate && !hasText) return 'number';
    return 'text';
  }

  private estimateColumnWidth(header: string, rows: any[], columnIndex: number): number {
    // Base width on header length
    let maxWidth = header.length * 10 + 20;

    // Sample rows to find max content width
    const sample = rows.slice(0, 50);
    for (const row of sample) {
      const value = Object.values(row)[columnIndex];
      if (value) {
        const strLength = String(value).length;
        maxWidth = Math.max(maxWidth, Math.min(strLength * 8 + 20, 300));
      }
    }

    return Math.max(maxWidth, 80); // Minimum 80px
  }

  // ============================================================================
  // PRIVATE METHODS - Tree Building
  // ============================================================================

  private aggregateAssetCounts(assets: EstimationAssetDB[]): Map<string, {
    photos: number;
    generators: number;
    specs: number;
    details: number;
  }> {
    const counts = new Map();

    for (const asset of assets) {
      if (!counts.has(asset.concept_code)) {
        counts.set(asset.concept_code, { photos: 0, generators: 0, specs: 0, details: 0 });
      }

      const count = counts.get(asset.concept_code);
      switch (asset.sheet_type) {
        case 'photo':
          count.photos += asset.image_count;
          break;
        case 'generator':
          count.generators += asset.image_count;
          break;
        case 'spec':
          count.specs += asset.image_count;
          break;
        case 'detail':
          count.details += asset.image_count;
          break;
      }
    }

    return counts;
  }

  private buildHierarchy(
    sheets: EstimationSheetDB[],
    assetCounts: Map<string, any>,
    options: BuildTreeOptions
  ): TreeNode[] {
    const nodes = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // Sort by concept code to ensure parents are created before children
    const sortedSheets = [...sheets].sort((a, b) => 
      a.concept_code.localeCompare(b.concept_code)
    );

    for (const sheet of sortedSheets) {
      const parts = sheet.concept_code.split('.');
      const counts = assetCounts.get(sheet.concept_code) || { photos: 0, generators: 0, specs: 0, details: 0 };

      // Create node for this sheet
      const node: TreeNode = {
        id: `node-${sheet.concept_code}`,
        hierarchyPath: parts,
        level: parts.length - 1,
        code: sheet.concept_code,
        name: sheet.sheet_name,
        type: sheet.is_main ? 'concept' : 'category',
        rowCount: sheet.row_count,
        photoCount: counts.photos,
        generatorCount: counts.generators,
        specCount: counts.specs,
        children: [],
        isLeaf: sheet.is_main,
        conceptCode: sheet.concept_code,
      };

      nodes.set(sheet.concept_code, node);

      // Find parent
      if (parts.length > 1) {
        const parentCode = parts.slice(0, -1).join('.');
        const parent = nodes.get(parentCode);
        
        if (parent) {
          node.parentId = parent.id;
          parent.children = parent.children || [];
          parent.children.push(node);
        } else {
          // Parent doesn't exist yet (orphan node) - add to roots temporarily
          roots.push(node);
        }
      } else {
        // Root level node
        roots.push(node);
      }
    }

    // Aggregate counts up the tree
    this.aggregateTreeCounts(roots);

    return roots;
  }

  private aggregateTreeCounts(nodes: TreeNode[]): void {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        this.aggregateTreeCounts(node.children);
        
        // Sum children's counts
        for (const child of node.children) {
          node.rowCount += child.rowCount;
          node.photoCount += child.photoCount;
          node.generatorCount += child.generatorCount;
          node.specCount += child.specCount;
        }
      }
    }
  }

  private flattenTree(nodes: TreeNode[], result: TreeNode[] = []): TreeNode[] {
    for (const node of nodes) {
      result.push(node);
      if (node.children) {
        this.flattenTree(node.children, result);
      }
    }
    return result;
  }

  private calculateMaxDepth(nodes: TreeNode[]): number {
    let maxDepth = 0;
    for (const node of nodes) {
      maxDepth = Math.max(maxDepth, node.level + 1);
      if (node.children) {
        maxDepth = Math.max(maxDepth, this.calculateMaxDepth(node.children));
      }
    }
    return maxDepth;
  }

  // ============================================================================
  // PRIVATE METHODS - DTO Mapping
  // ============================================================================

  private async mapAssetToDTO(asset: EstimationAssetDB, generateSignedUrl: boolean): Promise<AssetDTO> {
    let signedUrl = '';
    let signedUrlExpiresAt = '';

    if (generateSignedUrl) {
      try {
        const urlData = await this.generateSignedUrl(asset.storage_path);
        signedUrl = urlData.url;
        signedUrlExpiresAt = urlData.expiresAt;
      } catch (error) {
        console.error(`[EstimationService] Failed to generate signed URL for ${asset.id}:`, error);
      }
    }

    return {
      id: asset.id,
      conceptCode: asset.concept_code,
      type: asset.sheet_type,
      filename: asset.filename,
      originalName: asset.filename.replace(/\.webp$/, ''), // Remove extension
      width: asset.width_pixels,
      height: asset.height_pixels,
      sizeBytes: asset.file_size_bytes,
      storagePath: asset.storage_path,
      signedUrl,
      signedUrlExpiresAt,
      uploadedAt: asset.created_at,
    };
  }
}

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public originalError: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class R2Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'R2Error';
  }
}

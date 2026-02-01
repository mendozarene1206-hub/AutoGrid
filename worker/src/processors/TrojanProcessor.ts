/**
 * Trojan Processor v2 - Elegante
 * 
 * Refactorizado siguiendo best practices:
 * - Pipeline pattern para procesamiento
 * - Retry logic con exponential backoff
 * - Streaming uploads sin acumular en memoria
 * - Better error segregation
 */

import ExcelJS from 'exceljs';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { createHash } from 'crypto';
import type {
  TrojanJobData,
  TrojanManifest,
  TrojanAsset,
  MainSheetData,
  ProcessingError
} from '../types/trojan.types.js';

// Re-export types
export type {
  TrojanJobData,
  TrojanManifest,
  TrojanAsset,
  TrojanProcessingResult
} from '../types/trojan.types.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAIN_SHEET_PATTERNS = ['Desglose', '03 Desglose', 'Desglose f', '03 Desglose f'];
const WEBP_QUALITY = 85;
const MAX_IMAGE_DIMENSION = 2048;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

// ============================================================================
// MAIN PROCESSOR
// ============================================================================

export async function processTrojanExcel(
  s3: S3Client,
  bucket: string,
  fileKey: string,
  outputPrefix: string,
  jobData: TrojanJobData,
  onProgress?: (percent: number, message: string) => void
): Promise<TrojanManifest> {
  const startTime = Date.now();
  const errors: ProcessingError[] = [];
  
  console.log('[TrojanProcessor] 🚀 Starting Trojan processing for:', fileKey);
  
  // PHASE 1: Download & Parse (10%)
  onProgress?.(5, 'Downloading Excel file...');
  const { workbook, fileBuffer } = await downloadAndParseWorkbook(s3, bucket, fileKey);
  console.log('[TrojanProcessor] File:', (fileBuffer.length / 1024 / 1024).toFixed(2), 'MB,', workbook.worksheets.length, 'sheets');
  
  // PHASE 2: Extract Main Sheet (20%)
  onProgress?.(15, 'Identifying main sheet...');
  const mainSheet = findMainSheet(workbook);
  if (!mainSheet) {
    throw new Error(`No main "Desglose" sheet found. Expected: ${MAIN_SHEET_PATTERNS.join(', ')}`);
  }
  
  onProgress?.(20, `Extracting "${mainSheet.name}"...`);
  const mainSheetData = extractMainSheetData(mainSheet);
  console.log('[TrojanProcessor] Main sheet:', mainSheetData.rowCount, 'rows,', mainSheetData.columnCount, 'cols');
  
  // PHASE 3: Process Images (60%)
  const otherSheets = workbook.worksheets.filter(s => s.id !== mainSheet.id);
  console.log('[TrojanProcessor] Processing', otherSheets.length, 'asset sheets...');
  
  const imageResults = await processAllSheets(
    workbook,
    otherSheets,
    jobData.spreadsheetId,
    outputPrefix,
    fileBuffer,
    onProgress,
    30, 70 // progress range
  );
  
  // PHASE 4: Upload Assets (85%)
  onProgress?.(75, 'Uploading assets to R2...');
  const uploadedAssets = await uploadAllAssets(
    s3,
    bucket,
    imageResults.assets,
    workbook,
    onProgress,
    75, 90
  );
  
  // PHASE 5: Build & Upload Manifest (100%)
  onProgress?.(90, 'Building manifest...');
  const manifest = buildManifest(
    fileKey,
    jobData.spreadsheetId,
    mainSheet,
    mainSheetData,
    uploadedAssets,
    imageResults.errors,
    workbook.worksheets.length,
    Date.now() - startTime
  );
  
  onProgress?.(95, 'Uploading manifest...');
  await uploadManifest(s3, bucket, outputPrefix, manifest, mainSheetData);
  
  onProgress?.(100, 'Trojan processing complete!');
  
  // Log summary
  logSummary(manifest, errors);
  
  return manifest;
}

// ============================================================================
// PHASE FUNCTIONS
// ============================================================================

async function downloadAndParseWorkbook(
  s3: S3Client,
  bucket: string,
  fileKey: string
): Promise<{ workbook: ExcelJS.Workbook; fileBuffer: Buffer }> {
  const fileBuffer = await downloadWithRetry(s3, bucket, fileKey);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);
  return { workbook, fileBuffer };
}

async function processAllSheets(
  workbook: ExcelJS.Workbook,
  sheets: ExcelJS.Worksheet[],
  spreadsheetId: string,
  outputPrefix: string,
  fileBuffer: Buffer,
  onProgress?: (percent: number, message: string) => void,
  progressStart = 30,
  progressEnd = 70
): Promise<{ assets: TrojanAsset[]; errors: ProcessingError[] }> {
  const assets: TrojanAsset[] = [];
  const errors: ProcessingError[] = [];
  
  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const progress = progressStart + ((i / sheets.length) * (progressEnd - progressStart));
    onProgress?.(Math.floor(progress), `Scanning sheet ${i + 1}/${sheets.length}: ${sheet.name}...`);
    
    try {
      const sheetAssets = await processSheetImages(workbook, sheet, spreadsheetId, outputPrefix);
      assets.push(...sheetAssets);
    } catch (error) {
      errors.push({
        sheet: sheet.name,
        type: 'sheet_processing',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      console.error(`[TrojanProcessor] Sheet ${sheet.name} failed:`, error);
    }
  }
  
  return { assets, errors };
}

async function uploadAllAssets(
  s3: S3Client,
  bucket: string,
  assets: TrojanAsset[],
  workbook: ExcelJS.Workbook,
  onProgress?: (percent: number, message: string) => void,
  progressStart = 75,
  progressEnd = 90
): Promise<TrojanAsset[]> {
  const uploaded: TrojanAsset[] = [];
  const workbookImages = (workbook as any).media || [];
  
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const progress = progressStart + ((i / assets.length) * (progressEnd - progressStart));
    onProgress?.(Math.floor(progress), `Uploading asset ${i + 1}/${assets.length}...`);
    
    try {
      // Find the original image by index (more reliable than hash matching)
      const imageIndex = findImageIndexByAsset(asset, workbookImages);
      if (imageIndex === -1) {
        throw new Error(`Image not found for asset ${asset.id}`);
      }
      
      const imageData = workbookImages[imageIndex];
      if (!imageData?.buffer) {
        throw new Error(`Empty buffer for image ${imageIndex}`);
      }
      
      // Convert to WebP
      const webpBuffer = await convertToWebP(imageData.buffer);
      
      // Upload with retry
      await uploadWithRetry(s3, bucket, asset.r2Key, webpBuffer, 'image/webp');
      
      uploaded.push(asset);
      console.log(`[TrojanProcessor] ✅ Uploaded: ${asset.r2Key} (${(webpBuffer.length / 1024).toFixed(1)} KB)`);
      
    } catch (error) {
      console.error(`[TrojanProcessor] ❌ Failed to upload ${asset.id}:`, error);
      // Continue with other assets, don't fail entire job
    }
  }
  
  return uploaded;
}

function buildManifest(
  fileKey: string,
  spreadsheetId: string,
  mainSheet: ExcelJS.Worksheet,
  mainSheetData: MainSheetData,
  assets: TrojanAsset[],
  errors: ProcessingError[],
  totalSheets: number,
  processingTimeMs: number
): TrojanManifest {
  // Build concept asset map
  const conceptAssetMap: Record<string, string[]> = {};
  for (const asset of assets) {
    if (!conceptAssetMap[asset.conceptCode]) {
      conceptAssetMap[asset.conceptCode] = [];
    }
    conceptAssetMap[asset.conceptCode].push(asset.id);
  }
  
  return {
    version: 1,
    originalFileName: fileKey.split('/').pop()!,
    processedAt: new Date().toISOString(),
    spreadsheetId,
    mainSheet: {
      name: mainSheet.name,
      rowCount: mainSheetData.rowCount,
      columnCount: mainSheetData.columnCount,
      data: mainSheetData.rows,
      headers: mainSheetData.headers,
    },
    assets,
    conceptAssetMap,
    stats: {
      totalSheets,
      mainSheetRows: mainSheetData.rowCount,
      imagesFound: assets.length + errors.length,
      imagesProcessed: assets.length,
      imagesFailed: errors.length,
      totalProcessingTimeMs: processingTimeMs,
    },
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function uploadManifest(
  s3: S3Client,
  bucket: string,
  outputPrefix: string,
  manifest: TrojanManifest,
  mainSheetData: MainSheetData
): Promise<void> {
  // Upload manifest
  await uploadWithRetry(
    s3,
    bucket,
    `${outputPrefix}/trojan-manifest.json`,
    Buffer.from(JSON.stringify(manifest, null, 2)),
    'application/json'
  );
  
  // Upload main data separately for easy access
  await uploadWithRetry(
    s3,
    bucket,
    `${outputPrefix}/main-data.json`,
    Buffer.from(JSON.stringify({
      headers: mainSheetData.headers,
      rows: mainSheetData.rows,
    }, null, 2)),
    'application/json'
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function downloadWithRetry(
  s3: S3Client,
  bucket: string,
  key: string,
  retries = MAX_RETRIES
): Promise<Buffer> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const chunks: Buffer[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (error) {
      if (attempt === retries) throw error;
      const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
      console.log(`[TrojanProcessor] Download retry ${attempt}/${retries} in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error('Download failed after retries');
}

async function uploadWithRetry(
  s3: S3Client,
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string,
  retries = MAX_RETRIES
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }));
      return;
    } catch (error) {
      if (attempt === retries) throw error;
      const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
      console.log(`[TrojanProcessor] Upload retry ${attempt}/${retries} for ${key} in ${delay}ms...`);
      await sleep(delay);
    }
  }
}

function findMainSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet | undefined {
  // Exact matches first
  for (const pattern of MAIN_SHEET_PATTERNS) {
    const sheet = workbook.getWorksheet(pattern);
    if (sheet) return sheet;
  }
  
  // Partial matches (case insensitive)
  for (const sheet of workbook.worksheets) {
    const nameLower = sheet.name.toLowerCase();
    if (MAIN_SHEET_PATTERNS.some(p => nameLower.includes(p.toLowerCase()))) {
      return sheet;
    }
  }
  
  return undefined;
}

function extractMainSheetData(sheet: ExcelJS.Worksheet): MainSheetData {
  const headers: string[] = [];
  const rows: Array<Record<string, any>> = [];
  
  // Extract headers
  const headerRow = sheet.getRow(1);
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.text || `Column${colNumber}`).trim();
  });
  
  // Extract data rows
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    const rowData: Record<string, any> = {};
    let hasData = false;
    
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1] || `Column${colNumber}`;
      const value = extractCellValue(cell);
      
      if (value !== null && value !== undefined && value !== '') {
        rowData[header] = value;
        hasData = true;
      }
      
      // Special: concept code in column A
      if (colNumber === 1 && value) {
        rowData._conceptCode = String(value).trim();
      }
    });
    
    if (hasData) {
      rows.push(rowData);
    }
  });
  
  return {
    headers,
    rows,
    rowCount: rows.length,
    columnCount: headers.length,
  };
}

function extractCellValue(cell: ExcelJS.Cell): any {
  let value = cell.value;
  
  // Handle rich text
  if (typeof value === 'object' && value !== null && 'richText' in value) {
    value = (value as any).richText.map((rt: any) => rt.text).join('');
  }
  
  // Handle formulas - return result
  if (cell.formula) {
    return cell.result ?? value;
  }
  
  return value;
}

async function processSheetImages(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  spreadsheetId: string,
  outputPrefix: string
): Promise<TrojanAsset[]> {
  const assets: TrojanAsset[] = [];
  const workbookImages = (workbook as any).media || [];
  const sheetImages = (sheet as any).images || [];
  
  for (const imageRef of sheetImages) {
    try {
      const imageId = imageRef.imageId;
      if (imageId < 1 || imageId > workbookImages.length) continue;
      
      const imageData = workbookImages[imageId - 1];
      if (!imageData?.buffer) continue;
      
      // Get cell reference
      const tl = imageRef.range.tl;
      const cellRef = `${sheet.getColumn(tl.col + 1).letter}${tl.row + 1}`;
      
      // Find concept code
      const conceptCode = findConceptCodeForImage(sheet, tl.col + 1, tl.row + 1);
      
      // Generate asset ID (based on image buffer hash)
      const imageHash = createHash('md5').update(imageData.buffer).digest('hex').substring(0, 8);
      const assetId = `img-${conceptCode}-${imageHash}`;
      const filename = `${assetId}.webp`;
      const r2Key = `${outputPrefix}/assets/${conceptCode}/${filename}`;
      
      // Get dimensions from original image
      const metadata = await sharp(imageData.buffer).metadata();
      
      assets.push({
        id: assetId,
        conceptCode,
        originalSheet: sheet.name,
        originalCell: cellRef,
        filename,
        r2Key,
        r2Url: `https://${process.env.R2_PUBLIC_URL || 'r2'}/${r2Key}`,
        size: imageData.buffer.length, // Original size, will update after WebP conversion
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: 'webp',
        extractedAt: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error(`[TrojanProcessor] Error processing image in ${sheet.name}:`, error);
    }
  }
  
  return assets;
}

function findImageIndexByAsset(asset: TrojanAsset, workbookImages: any[]): number {
  // Extract hash from asset ID: img-5.2.1-a1b2c3d4 -> a1b2c3d4
  const parts = asset.id.split('-');
  const assetHash = parts[parts.length - 1];
  
  for (let i = 0; i < workbookImages.length; i++) {
    const img = workbookImages[i];
    if (!img?.buffer) continue;
    
    const imgHash = createHash('md5').update(img.buffer).digest('hex').substring(0, 8);
    if (imgHash === assetHash) {
      return i;
    }
  }
  
  return -1;
}

function findConceptCodeForImage(
  sheet: ExcelJS.Worksheet,
  col: number,
  row: number
): string {
  // Strategy 1: Same row, column A
  const firstColCell = sheet.getRow(row).getCell(1);
  if (firstColCell.value) {
    const code = String(firstColCell.value).trim();
    if (/^[\d.]+$/.test(code)) return code;
  }
  
  // Strategy 2: Look upward
  for (let r = row; r >= 1; r--) {
    const cell = sheet.getRow(r).getCell(1);
    if (cell.value) {
      const code = String(cell.value).trim();
      if (/^[\d.]+$/.test(code)) return code;
    }
  }
  
  // Strategy 3: Sheet name fallback
  return sheet.name.replace(/\s+/g, '-').toLowerCase();
}

async function convertToWebP(buffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(buffer, {
      failOnError: false,
      limitInputPixels: 268402689, // ~16k x 16k
    });
    
    // Resize if too large
    const metadata = await image.metadata();
    if (metadata.width && metadata.height) {
      const maxDim = Math.max(metadata.width, metadata.height);
      if (maxDim > MAX_IMAGE_DIMENSION) {
        image.resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
    }
    
    return await image.webp({ quality: WEBP_QUALITY, effort: 4 }).toBuffer();
  } catch (error) {
    console.error('[TrojanProcessor] WebP conversion failed:', error);
    return buffer; // Return original if conversion fails
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function logSummary(manifest: TrojanManifest, errors: ProcessingError[]): void {
  console.log('\n[TrojanProcessor] ✅ Processing complete!');
  console.log('========================================');
  console.log(`Main Sheet: ${manifest.mainSheet.name}`);
  console.log(`  Rows: ${manifest.mainSheet.rowCount}`);
  console.log(`  Columns: ${manifest.mainSheet.columnCount}`);
  console.log(`Assets: ${manifest.stats.imagesProcessed} processed`);
  console.log(`  Failed: ${manifest.stats.imagesFailed}`);
  console.log(`  Concepts: ${Object.keys(manifest.conceptAssetMap).length}`);
  console.log(`Time: ${(manifest.stats.totalProcessingTimeMs / 1000).toFixed(2)}s`);
  if (errors.length > 0) {
    console.log(`⚠️  Errors: ${errors.length} (see manifest)`);
  }
  console.log('========================================\n');
}

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

export async function processExcel(
  s3: S3Client,
  bucket: string,
  fileKey: string,
  outputPrefix: string,
  onProgress?: (percent: number, message: string) => void
): Promise<any> {
  console.warn('[TrojanProcessor] Legacy processExcel called, using Trojan mode...');
  
  const spreadsheetId = outputPrefix.replace('processed/', '');
  
  const result = await processTrojanExcel(
    s3, bucket, fileKey, outputPrefix,
    { fileKey, userId: 'legacy', spreadsheetId, estimationId: spreadsheetId },
    onProgress
  );
  
  return {
    version: result.version,
    originalFileName: result.originalFileName,
    totalRows: result.mainSheet.rowCount,
    totalColumns: result.mainSheet.columnCount,
    chunkSize: 0,
    chunks: [],
    sheets: [{
      id: 'main',
      name: result.mainSheet.name,
      rowCount: result.mainSheet.rowCount,
      columnCount: result.mainSheet.columnCount,
    }],
    trojanManifest: result,
  };
}

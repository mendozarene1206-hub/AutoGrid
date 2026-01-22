/**
 * UniverPersistenceService.ts
 * 
 * Handles saving and loading Univer snapshots to/from Supabase Storage.
 * Uses gzip compression to reduce file sizes by ~80%.
 * 
 * Key Features:
 * - Gzip compression (client-side)
 * - Direct upload to Supabase Storage
 * - Progress callbacks for large files
 * - Fallback to legacy raw_data for old projects
 */

import pako from 'pako';
import { createClient } from '@supabase/supabase-js';
import type { IWorkbookData } from '@univerjs/core';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET_NAME = 'estimations';

export interface SaveResult {
    success: boolean;
    storagePath: string;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
}

export interface LoadResult {
    success: boolean;
    workbook: IWorkbookData | null;
    source: 'storage' | 'legacy' | 'empty';
    error?: string;
}

/**
 * Saves a Univer snapshot to Supabase Storage with gzip compression.
 */
export async function saveSnapshot(
    spreadsheetId: string,
    workbook: IWorkbookData,
    onProgress?: (phase: string, percent: number) => void
): Promise<SaveResult> {
    onProgress?.('Preparing snapshot...', 10);

    // 1. Convert workbook to JSON string
    const jsonString = JSON.stringify(workbook);
    const originalSize = new Blob([jsonString]).size;

    onProgress?.('Compressing data...', 30);

    // 2. Compress using gzip
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(jsonString);
    const compressed = pako.gzip(uint8Array);
    const compressedSize = compressed.length;

    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    console.log(`[Persistence] Compression: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${compressionRatio}% saved)`);

    onProgress?.('Uploading to storage...', 50);

    // 3. Create storage path with timestamp for versioning
    const timestamp = Date.now();
    const storagePath = `${spreadsheetId}/${timestamp}.json.gz`;

    // 4. Upload to Supabase Storage
    const blob = new Blob([compressed], { type: 'application/gzip' });

    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, blob, {
            contentType: 'application/gzip',
            upsert: false // Don't overwrite, create new version
        });

    if (uploadError) {
        console.error('[Persistence] Upload failed:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
    }

    onProgress?.('Updating database...', 80);

    // 5. Update spreadsheet record with new storage path
    const { error: updateError } = await supabase
        .from('spreadsheets')
        .update({
            storage_path: storagePath,
            updated_at: new Date().toISOString()
        })
        .eq('id', spreadsheetId);

    if (updateError) {
        console.error('[Persistence] DB update failed:', updateError);
        throw new Error(`DB update failed: ${updateError.message}`);
    }

    onProgress?.('Complete!', 100);

    return {
        success: true,
        storagePath,
        originalSize,
        compressedSize,
        compressionRatio: parseFloat(compressionRatio)
    };
}

/**
 * Loads a Univer snapshot from Supabase Storage.
 * Falls back to legacy raw_data if storage_path is not set.
 */
export async function loadSnapshot(
    spreadsheetId: string,
    onProgress?: (phase: string, percent: number) => void
): Promise<LoadResult> {
    onProgress?.('Fetching metadata...', 10);

    // 1. Get spreadsheet record
    const { data: spreadsheet, error: fetchError } = await supabase
        .from('spreadsheets')
        .select('storage_path, raw_data')
        .eq('id', spreadsheetId)
        .single();

    if (fetchError || !spreadsheet) {
        return {
            success: false,
            workbook: null,
            source: 'empty',
            error: fetchError?.message || 'Spreadsheet not found'
        };
    }

    // 2. Check if we have a storage path (new system) or raw_data (legacy)
    if (spreadsheet.storage_path) {
        onProgress?.('Downloading from storage...', 30);

        // Download from Storage
        const { data: fileData, error: downloadError } = await supabase.storage
            .from(BUCKET_NAME)
            .download(spreadsheet.storage_path);

        if (downloadError || !fileData) {
            return {
                success: false,
                workbook: null,
                source: 'storage',
                error: downloadError?.message || 'Download failed'
            };
        }

        onProgress?.('Decompressing...', 60);

        // Decompress
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const decompressed = pako.ungzip(uint8Array);

        onProgress?.('Parsing data...', 80);

        // Parse JSON
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(decompressed);
        const workbook = JSON.parse(jsonString) as IWorkbookData;

        onProgress?.('Complete!', 100);

        return {
            success: true,
            workbook,
            source: 'storage'
        };
    } else if (spreadsheet.raw_data && Object.keys(spreadsheet.raw_data).length > 0) {
        // Legacy: Load from raw_data column
        onProgress?.('Loading legacy data...', 50);

        return {
            success: true,
            workbook: spreadsheet.raw_data as IWorkbookData,
            source: 'legacy'
        };
    }

    // No data found
    return {
        success: true,
        workbook: null,
        source: 'empty'
    };
}

/**
 * Calculate SHA-256 hash of a workbook snapshot.
 * Used for integrity verification and signatures.
 */
export async function calculateSnapshotHash(workbook: IWorkbookData): Promise<string> {
    const jsonString = JSON.stringify(workbook);
    const encoder = new TextEncoder();
    const data = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Ensures the storage bucket exists.
 * Should be called once during app initialization.
 */
export async function ensureStorageBucket(): Promise<void> {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === BUCKET_NAME);

    if (!exists) {
        const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
            public: false,
            fileSizeLimit: 50 * 1024 * 1024 // 50MB limit (Supabase Free plan)
        });

        if (error && !error.message.includes('already exists')) {
            console.error('[Persistence] Failed to create bucket:', error);
        }
    }
}

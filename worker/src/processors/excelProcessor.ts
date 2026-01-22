import ExcelJS from 'exceljs';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import type { Manifest, ChunkMeta, SheetMeta } from '../../../shared/types.js';

const CHUNK_SIZE = 2000; // rows per chunk

export async function processExcel(
    s3: S3Client,
    bucket: string,
    fileKey: string,
    outputPrefix: string,
    onProgress?: (percent: number, message: string) => void
): Promise<Manifest> {
    console.log('[ExcelProcessor] Starting streaming processing for:', fileKey);

    // 1. Get file as STREAM (not buffer!)
    const { Body, ContentLength } = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: fileKey }));
    const stream = Body as Readable;

    console.log('[ExcelProcessor] File size:', ContentLength, 'bytes');
    onProgress?.(5, 'Downloading file stream...');

    // 2. Use ExcelJS streaming reader - CRITICAL for memory efficiency
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(stream, {
        worksheets: 'emit',
        entries: 'emit',
        sharedStrings: 'cache',
        hyperlinks: 'ignore',
        styles: 'cache',
    });

    const manifest: Manifest = {
        version: 1,
        originalFileName: fileKey.split('/').pop()!,
        totalRows: 0,
        totalColumns: 0,
        chunkSize: CHUNK_SIZE,
        chunks: [],
        styles: {},
        sheets: [],
    };

    let currentChunk: any[] = [];
    let chunkIndex = 0;
    let currentSheetId = '';
    let rowInChunk = 0;
    let chunkStartRow = 0;
    let globalRowCount = 0;

    onProgress?.(10, 'Parsing Excel structure...');

    // 3. Process worksheet by worksheet (streaming)
    for await (const worksheetReader of workbookReader) {
        currentSheetId = `sheet-${worksheetReader.id}`;
        let maxCol = 0;
        let sheetRowCount = 0;

        const sheetMeta: SheetMeta = {
            id: currentSheetId,
            name: worksheetReader.name,
            rowCount: 0,
            columnCount: 0,
            mergeData: [],
            columnWidths: {},
        };

        manifest.sheets.push(sheetMeta);

        console.log('[ExcelProcessor] Processing sheet:', worksheetReader.name);

        // 4. Process row by row (never load all rows into memory)
        for await (const row of worksheetReader) {
            const rowData = convertRowToUniverFormat(row);
            currentChunk.push({ r: row.number - 1, data: rowData });
            rowInChunk++;
            sheetRowCount++;
            globalRowCount++;
            maxCol = Math.max(maxCol, Object.keys(rowData).length);

            // 5. Flush chunk to R2 when size reached
            if (rowInChunk >= CHUNK_SIZE) {
                await uploadChunk(s3, bucket, outputPrefix, chunkIndex, currentSheetId, chunkStartRow, currentChunk);

                manifest.chunks.push({
                    sheetId: currentSheetId,
                    startRow: chunkStartRow,
                    endRow: chunkStartRow + rowInChunk - 1,
                    key: `${outputPrefix}/chunk_${chunkIndex}.json`,
                });

                const progress = Math.min(90, 10 + (globalRowCount / 50000) * 80);
                onProgress?.(progress, `Processed ${globalRowCount} rows, ${chunkIndex + 1} chunks created`);

                chunkIndex++;
                chunkStartRow = row.number;
                currentChunk = [];
                rowInChunk = 0;
            }
        }

        // 6. Flush remaining rows for this sheet
        if (currentChunk.length > 0) {
            await uploadChunk(s3, bucket, outputPrefix, chunkIndex, currentSheetId, chunkStartRow, currentChunk);

            manifest.chunks.push({
                sheetId: currentSheetId,
                startRow: chunkStartRow,
                endRow: chunkStartRow + rowInChunk - 1,
                key: `${outputPrefix}/chunk_${chunkIndex}.json`,
            });
            chunkIndex++;
            currentChunk = [];
            rowInChunk = 0;
            chunkStartRow = 0;
        }

        // Update sheet metadata
        sheetMeta.rowCount = sheetRowCount;
        sheetMeta.columnCount = maxCol;
        manifest.totalRows += sheetRowCount;
        manifest.totalColumns = Math.max(manifest.totalColumns, maxCol);
    }

    onProgress?.(95, 'Uploading manifest...');

    // 7. Upload manifest
    await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: `${outputPrefix}/manifest.json`,
        Body: JSON.stringify(manifest),
        ContentType: 'application/json',
    }));

    console.log('[ExcelProcessor] Processing complete!');
    console.log(`  - Total rows: ${manifest.totalRows}`);
    console.log(`  - Total chunks: ${manifest.chunks.length}`);
    console.log(`  - Manifest: ${outputPrefix}/manifest.json`);

    onProgress?.(100, 'Processing complete!');

    return manifest;
}

async function uploadChunk(
    s3: S3Client,
    bucket: string,
    prefix: string,
    index: number,
    sheetId: string,
    startRow: number,
    rows: any[]
) {
    const chunkData = { sheetId, startRow, rows };

    await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: `${prefix}/chunk_${index}.json`,
        Body: JSON.stringify(chunkData),
        ContentType: 'application/json',
    }));

    console.log(`[ExcelProcessor] Uploaded chunk_${index}.json (${rows.length} rows)`);
}

function convertRowToUniverFormat(row: ExcelJS.Row): Record<number, any> {
    const cells: Record<number, any> = {};

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const colIndex = colNumber - 1;
        let value = cell.value;
        let formula: string | undefined;
        let cellType = 1; // string

        if (cell.formula) {
            formula = cell.formula;
            value = cell.result;
        } else if (typeof cell.value === 'object' && cell.value !== null) {
            if ('result' in (cell.value as any)) {
                value = (cell.value as any).result;
                formula = (cell.value as any).formula;
            } else if (cell.value instanceof Date) {
                value = cell.value.toISOString();
            }
        }

        if (typeof value === 'number') cellType = 2;
        else if (typeof value === 'boolean') cellType = 3;

        cells[colIndex] = {
            v: value ?? '',
            t: cellType,
            ...(formula && { f: formula }),
        };

        // Extract basic style
        const style = extractBasicStyle(cell);
        if (style) {
            cells[colIndex].s = style;
        }
    });

    return cells;
}

function extractBasicStyle(cell: ExcelJS.Cell): any | undefined {
    const style: any = {};
    let hasStyle = false;

    // Font styling (Univer uses nested objects)
    if (cell.font) {
        if (cell.font.bold) {
            style.bl = 1;
            hasStyle = true;
        }
        if (cell.font.italic) {
            style.it = 1;
            hasStyle = true;
        }
        if (cell.font.underline) {
            style.ul = { s: 1 }; // underline style
            hasStyle = true;
        }
        if (cell.font.strike) {
            style.st = { s: 1 }; // strikethrough
            hasStyle = true;
        }
        if (cell.font.size) {
            style.fs = cell.font.size;
            hasStyle = true;
        }
        if (cell.font.name) {
            style.ff = cell.font.name;
            hasStyle = true;
        }
        if (cell.font.color?.argb) {
            // Univer uses cl for text color
            style.cl = {
                rgb: cell.font.color.argb.length === 8
                    ? cell.font.color.argb.substring(2)
                    : cell.font.color.argb
            };
            hasStyle = true;
        }
    }

    // Background color
    if (cell.fill?.type === 'pattern') {
        const patternFill = cell.fill as any;
        if (patternFill.fgColor?.argb) {
            style.bg = {
                rgb: patternFill.fgColor.argb.length === 8
                    ? patternFill.fgColor.argb.substring(2)
                    : patternFill.fgColor.argb
            };
            hasStyle = true;
        }
    }

    // Alignment
    if (cell.alignment) {
        if (cell.alignment.horizontal) {
            const hMap: Record<string, number> = {
                left: 0, center: 1, right: 2, fill: 3, justify: 4
            };
            if (hMap[cell.alignment.horizontal] !== undefined) {
                style.ht = hMap[cell.alignment.horizontal];
                hasStyle = true;
            }
        }
        if (cell.alignment.vertical) {
            const vMap: Record<string, number> = {
                top: 0, middle: 1, bottom: 2
            };
            if (vMap[cell.alignment.vertical] !== undefined) {
                style.vt = vMap[cell.alignment.vertical];
                hasStyle = true;
            }
        }
        if (cell.alignment.wrapText) {
            style.tb = 3; // wrap text
            hasStyle = true;
        }
    }

    // Number format
    if (cell.numFmt) {
        style.n = { pattern: cell.numFmt };
        hasStyle = true;
    }

    return hasStyle ? style : undefined;
}


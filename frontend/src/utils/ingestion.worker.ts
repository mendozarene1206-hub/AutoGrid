/// <reference lib="webworker" />

import ExcelJS from 'exceljs';
import type { IWorkbookData, IStyleData } from '@univerjs/core';
import { LocaleType } from '@univerjs/presets';

// Define types for messages
export type IngestionMessage =
    | { type: 'START'; payload: { buffer: ArrayBuffer; fileName: string; userId: string; spreadsheetId: string; parallelImageUploads: number } }
    | { type: 'PROGRESS'; payload: { phase: string; percent: number } }
    | { type: 'COMPLETE'; payload: { workbook: IWorkbookData; images: any[]; warnings: string[] } }
    | { type: 'ERROR'; payload: { message: string } };

const ctx: Worker = self as any;

ctx.addEventListener('message', async (event) => {
    const { type, payload } = event.data;

    if (type === 'START') {
        try {
            const { buffer, fileName, parallelImageUploads } = payload;

            ctx.postMessage({ type: 'PROGRESS', payload: { phase: '📄 Worker: Cargando Excel en memoria...', percent: 15 } });

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);

            ctx.postMessage({ type: 'PROGRESS', payload: { phase: '🏗️ Worker: Procesando estructura...', percent: 30 } });

            const result = await convertExcelJSToUniver(
                workbook,
                payload.userId,
                payload.spreadsheetId,
                [],
                parallelImageUploads,
                (phase, percent) => {
                    ctx.postMessage({ type: 'PROGRESS', payload: { phase, percent } });
                }
            );

            ctx.postMessage({ type: 'COMPLETE', payload: result });

        } catch (error: any) {
            console.error('Worker Error:', error);
            ctx.postMessage({ type: 'ERROR', payload: { message: error.message || 'Unknown worker error' } });
        }
    }
});

// Helper functions (copied/adapted from ingestion.ts)
// We need to duplicate the logic here since we can't easily import non-exported internals or mixed environment modules
// Ideally we would extract shared logic to a separate pure-utility file, but for now copying is safer to ensure standalone worker execution.

interface IngestResult {
    workbook: IWorkbookData;
    images: { sheetId: string; url: string; row: number; col: number }[];
    warnings: string[];
}

async function convertExcelJSToUniver(
    workbook: ExcelJS.Workbook,
    userId: string,
    spreadsheetId: string,
    warnings: string[],
    parallelImageUploads: number,
    onProgress?: (phase: string, percent: number) => void
): Promise<IngestResult> {
    const sheets: Record<string, any> = {};
    const sheetOrder: string[] = [];
    const images: IngestResult['images'] = [];
    const styles: Record<string, IStyleData> = {};
    let styleIndex = 0;

    const totalSheets = workbook.worksheets.length;
    let processedSheets = 0;

    for (const worksheet of workbook.worksheets) {
        const sheetId = `sheet-${worksheet.id}`;
        sheetOrder.push(sheetId);

        // Progress update every few sheets to avoid spamming messages
        processedSheets++;
        if (processedSheets % 5 === 0 || processedSheets === totalSheets) {
            const percent = 30 + Math.floor((processedSheets / totalSheets) * 60); // 30% to 90%
            onProgress?.(`Procesando hoja ${processedSheets}/${totalSheets}...`, percent);
        }

        const cellData: Record<string, Record<string, any>> = {};
        const rowData: Record<string, any> = {};
        const columnData: Record<string, any> = {};
        const mergeData: any[] = [];

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            const rowIndex = rowNumber - 1;
            if (row.height && row.height !== 15) {
                rowData[rowIndex] = { h: row.height, hd: 0 };
            }

            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                const colIndex = colNumber - 1;
                if (!cellData[rowIndex]) cellData[rowIndex] = {};

                let value: any = cell.value;
                let formula: string | undefined;
                let cellType = 1;

                if (cell.formula) {
                    formula = cell.formula;
                    value = cell.result;
                } else if (typeof cell.value === 'object' && cell.value !== null) {
                    if ('result' in (cell.value as any)) {
                        value = (cell.value as any).result;
                        formula = (cell.value as any).formula;
                    } else if (cell.value instanceof Date) {
                        value = cell.value.toISOString();
                        cellType = 1;
                    }
                }

                if (typeof value === 'number') cellType = 2;
                else if (typeof value === 'boolean') cellType = 3;

                const univerCell: any = { v: value ?? '', t: cellType };
                if (formula) univerCell.f = formula;

                // Simple style conversion to avoid bloat in worker
                const style = convertExcelJSStyleToUniver(cell);
                if (style && Object.keys(style).length > 0) {
                    const styleId = `s${styleIndex++}`;
                    styles[styleId] = style;
                    univerCell.s = styleId;
                }

                cellData[rowIndex][colIndex] = univerCell;
            });
        });

        // Safe column iteration (FIX FROM PREVIOUS STEP)
        worksheet.columns?.forEach((col, index) => {
            if (col.width || col.hidden) {
                columnData[index] = { w: (col.width || 10) * 7, hd: col.hidden ? 1 : 0 };
            }
        });

        worksheet.model.merges?.forEach((mergeRange: string) => {
            const range = safeParseRange(mergeRange);
            if (range) mergeData.push(range);
        });

        sheets[sheetId] = {
            id: sheetId,
            name: worksheet.name,
            hidden: worksheet.state === 'hidden' ? 1 : 0,
            rowCount: Math.max(worksheet.rowCount + 50, 200),
            columnCount: Math.max(worksheet.columnCount + 10, 30),
            defaultColumnWidth: 100,
            defaultRowHeight: 25,
            cellData,
            rowData,
            columnData,
            mergeData,
            showGridlines: 1,
            rightToLeft: 0
        };
    }

    const univerWorkbook: IngestResult = {
        workbook: {
            id: spreadsheetId,
            rev: 1,
            name: 'Imported Workbook',
            appVersion: '3.0.0',
            locale: LocaleType.ES_ES,
            styles,
            sheetOrder,
            sheets,
            resources: []
        },
        images,
        warnings
    };

    return univerWorkbook;
}

// Minimal style converter for worker
function convertExcelJSStyleToUniver(cell: ExcelJS.Cell): IStyleData | undefined {
    const style: IStyleData = {};
    let hasStyle = false;

    if (cell.font?.bold) { style.bd = 1; hasStyle = true; }
    if (cell.font?.italic) { style.it = 1; hasStyle = true; }
    if (cell.font?.strike) { style.st = { s: 1 }; hasStyle = true; }
    if (cell.font?.underline) { style.ul = { s: 1 }; hasStyle = true; }
    if (cell.font?.color?.argb) { style.cl = { rgb: '#' + cell.font.color.argb.substring(2) }; hasStyle = true; }
    if (cell.fill?.type === 'pattern' && cell.fill.pattern === 'solid' && cell.fill.fgColor?.argb) {
        style.bg = { rgb: '#' + cell.fill.fgColor.argb.substring(2) };
        hasStyle = true;
    }
    // Number format
    if (cell.numFmt) {
        style.n = { pattern: cell.numFmt };
        hasStyle = true;
    }

    return hasStyle ? style : undefined;
}

function safeParseRange(rangeStr: string) {
    try {
        const [start, end] = rangeStr.split(':');
        const s = parseCellAddress(start);
        const e = parseCellAddress(end);
        return { startRow: s.row, startColumn: s.col, endRow: e.row, endColumn: e.col };
    } catch { return null; }
}

function parseCellAddress(address: string) {
    const colMatch = address.match(/[A-Z]+/);
    const rowMatch = address.match(/\d+/);
    if (!colMatch || !rowMatch) throw new Error('Invalid address');
    return {
        col: columnToIndex(colMatch[0]),
        row: parseInt(rowMatch[0]) - 1
    };
}

function columnToIndex(col: string): number {
    let index = 0;
    for (let i = 0; i < col.length; i++) {
        index = index * 26 + (col.charCodeAt(i) - 64);
    }
    return index - 1;
}

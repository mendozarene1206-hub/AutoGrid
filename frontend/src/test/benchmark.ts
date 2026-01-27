/**
 * benchmark.ts - Excel Parser Performance Benchmark Suite
 * 
 * Measures the following critical metrics:
 * - T1: File → ArrayBuffer
 * - T2: ArrayBuffer → ExcelJS Workbook
 * - T3: ExcelJS → IWorkbookData (Univer format)
 * - T4: IWorkbookData → Univer Render
 * - Memory consumption (heap usage)
 * 
 * Usage:
 *   // In browser console:
 *   import { runParserBenchmark } from './test/benchmark';
 *   await runParserBenchmark(file); // Pass a File object
 * 
 *   // Or use the global helper:
 *   window.benchmarkExcelParser(file);
 */

import * as ExcelJS from 'exceljs';
import type { IWorkbookData, IStyleData } from '@univerjs/core';
import { LocaleType } from '@univerjs/presets';

// ============================================================================
// TYPES
// ============================================================================

export interface BenchmarkResult {
    fileName: string;
    fileSizeMB: number;
    timings: {
        fileLoadMs: number;
        excelJSParseMs: number;
        transformMs: number;
        totalMs: number;
    };
    memory: {
        heapUsedBeforeMB: number;
        heapUsedAfterMB: number;
        heapDeltaMB: number;
        heapLimitMB: number;
    };
    stats: {
        sheetCount: number;
        totalRows: number;
        totalCells: number;
        mergedRegions: number;
        stylesGenerated: number;
        formulasFound: number;
    };
    warnings: string[];
}

export interface BenchmarkOptions {
    onProgress?: (phase: string, percent: number) => void;
    includeStyleDedup?: boolean;
    verbose?: boolean;
}

// ============================================================================
// MEMORY UTILITIES
// ============================================================================

interface PerformanceMemory {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
}

function getMemoryUsage(): { usedMB: number; limitMB: number } | null {
    // Chrome-only API
    const perf = performance as Performance & { memory?: PerformanceMemory };
    if (perf.memory) {
        return {
            usedMB: perf.memory.usedJSHeapSize / (1024 * 1024),
            limitMB: perf.memory.jsHeapSizeLimit / (1024 * 1024)
        };
    }
    return null;
}

function forceGC(): void {
    // Attempt to trigger garbage collection (only works with --expose-gc flag)
    if (typeof (window as any).gc === 'function') {
        (window as any).gc();
    }
}

// ============================================================================
// MAIN BENCHMARK FUNCTION
// ============================================================================

export async function runParserBenchmark(
    file: File,
    options: BenchmarkOptions = {}
): Promise<BenchmarkResult> {
    const { onProgress, includeStyleDedup = true, verbose = true } = options;
    const warnings: string[] = [];

    if (verbose) console.log('\n📊 ═══════════════════════════════════════════════════════════');
    if (verbose) console.log('   EXCEL PARSER BENCHMARK');
    if (verbose) console.log('═══════════════════════════════════════════════════════════\n');

    // Force GC before starting
    forceGC();
    await new Promise(r => setTimeout(r, 100));

    const memBefore = getMemoryUsage();
    const startTotal = performance.now();

    // ─────────────────────────────────────────────────────────────
    // T1: File → ArrayBuffer
    // ─────────────────────────────────────────────────────────────
    onProgress?.('📄 Loading file into memory...', 10);
    const t1Start = performance.now();

    const buffer = await file.arrayBuffer();

    const t1End = performance.now();
    const fileLoadMs = t1End - t1Start;

    if (verbose) console.log(`⏱️  T1 (File → Buffer):     ${fileLoadMs.toFixed(2)} ms`);

    // ─────────────────────────────────────────────────────────────
    // T2: ArrayBuffer → ExcelJS Workbook
    // ─────────────────────────────────────────────────────────────
    onProgress?.('🔄 Parsing Excel structure...', 30);
    const t2Start = performance.now();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const t2End = performance.now();
    const excelJSParseMs = t2End - t2Start;

    if (verbose) console.log(`⏱️  T2 (Buffer → ExcelJS):   ${excelJSParseMs.toFixed(2)} ms`);

    // ─────────────────────────────────────────────────────────────
    // T3: ExcelJS → IWorkbookData (Univer format)
    // ─────────────────────────────────────────────────────────────
    onProgress?.('🏗️ Transforming to Univer format...', 60);
    const t3Start = performance.now();

    const transformResult = transformToUniverFormat(workbook, includeStyleDedup);

    const t3End = performance.now();
    const transformMs = t3End - t3Start;

    if (verbose) console.log(`⏱️  T3 (ExcelJS → Univer):   ${transformMs.toFixed(2)} ms`);

    // ─────────────────────────────────────────────────────────────
    // Final measurements
    // ─────────────────────────────────────────────────────────────
    const endTotal = performance.now();
    const totalMs = endTotal - startTotal;

    // Allow GC and measure final memory
    await new Promise(r => setTimeout(r, 50));
    const memAfter = getMemoryUsage();

    // Calculate stats
    const stats = calculateStats(transformResult.workbook);

    if (verbose) {
        console.log('\n────────────────────────────────────────────────────────────');
        console.log(`✅ TOTAL TIME:              ${totalMs.toFixed(2)} ms`);
        console.log('────────────────────────────────────────────────────────────');
        console.log('\n📈 STATISTICS:');
        console.log(`   Sheets:          ${stats.sheetCount}`);
        console.log(`   Total Rows:      ${stats.totalRows.toLocaleString()}`);
        console.log(`   Total Cells:     ${stats.totalCells.toLocaleString()}`);
        console.log(`   Merged Regions:  ${stats.mergedRegions}`);
        console.log(`   Styles Created:  ${transformResult.stylesCount.toLocaleString()}`);
        console.log(`   Formulas Found:  ${stats.formulasFound.toLocaleString()}`);

        if (memBefore && memAfter) {
            console.log('\n💾 MEMORY:');
            console.log(`   Before:  ${memBefore.usedMB.toFixed(2)} MB`);
            console.log(`   After:   ${memAfter.usedMB.toFixed(2)} MB`);
            console.log(`   Delta:   ${(memAfter.usedMB - memBefore.usedMB).toFixed(2)} MB`);
            console.log(`   Limit:   ${memBefore.limitMB.toFixed(0)} MB`);
        } else {
            warnings.push('Memory API not available (Chrome-only with flags)');
        }

        console.log('\n═══════════════════════════════════════════════════════════\n');
    }

    onProgress?.('✅ Benchmark complete', 100);

    return {
        fileName: file.name,
        fileSizeMB: file.size / (1024 * 1024),
        timings: {
            fileLoadMs,
            excelJSParseMs,
            transformMs,
            totalMs
        },
        memory: {
            heapUsedBeforeMB: memBefore?.usedMB ?? -1,
            heapUsedAfterMB: memAfter?.usedMB ?? -1,
            heapDeltaMB: memBefore && memAfter ? memAfter.usedMB - memBefore.usedMB : -1,
            heapLimitMB: memBefore?.limitMB ?? -1
        },
        stats: {
            ...stats,
            stylesGenerated: transformResult.stylesCount
        },
        warnings
    };
}

// ============================================================================
// TRANSFORM FUNCTION (Mirrors ingestion.ts logic with benchmarking)
// ============================================================================

interface TransformResult {
    workbook: IWorkbookData;
    stylesCount: number;
}

function transformToUniverFormat(
    workbook: ExcelJS.Workbook,
    useStyleDedup: boolean
): TransformResult {
    const sheets: Record<string, any> = {};
    const sheetOrder: string[] = [];
    const styles: Record<string, IStyleData> = {};

    // Style deduplication cache
    const styleCache = new Map<string, string>();
    let styleIndex = 0;

    for (const worksheet of workbook.worksheets) {
        const sheetId = `sheet-${worksheet.id}`;
        sheetOrder.push(sheetId);

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
                    }
                }

                if (typeof value === 'number') cellType = 2;
                else if (typeof value === 'boolean') cellType = 3;

                const univerCell: any = { v: value ?? '', t: cellType };
                if (formula) univerCell.f = formula;

                // Style extraction with optional deduplication
                const style = extractCellStyle(cell);
                if (style && Object.keys(style).length > 0) {
                    if (useStyleDedup) {
                        const styleHash = JSON.stringify(style);
                        if (!styleCache.has(styleHash)) {
                            const styleId = `s${styleIndex++}`;
                            styleCache.set(styleHash, styleId);
                            styles[styleId] = style;
                        }
                        univerCell.s = styleCache.get(styleHash);
                    } else {
                        const styleId = `s${styleIndex++}`;
                        styles[styleId] = style;
                        univerCell.s = styleId;
                    }
                }

                cellData[rowIndex][colIndex] = univerCell;
            });
        });

        // Column widths
        worksheet.columns?.forEach((col, index) => {
            if (col.width || col.hidden) {
                columnData[index] = {
                    w: (col.width || 10) * 7,
                    hd: col.hidden ? 1 : 0
                };
            }
        });

        // Merged cells
        worksheet.model.merges?.forEach((mergeRange: string) => {
            const [start, end] = mergeRange.split(':');
            const startCell = parseCellAddress(start);
            const endCell = parseCellAddress(end);
            mergeData.push({
                startRow: startCell.row,
                startColumn: startCell.col,
                endRow: endCell.row,
                endColumn: endCell.col,
            });
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
            rightToLeft: 0,
        };
    }

    const univerWorkbook: IWorkbookData = {
        id: 'benchmark-workbook-' + Date.now(),
        sheetOrder,
        name: workbook.title || 'Benchmark Workbook',
        appVersion: '1.0.0',
        locale: LocaleType.ES_ES,
        styles,
        sheets,
        resources: [],
    };

    return {
        workbook: univerWorkbook,
        stylesCount: Object.keys(styles).length
    };
}

// ============================================================================
// STYLE EXTRACTION (Complete version with borders)
// ============================================================================

function extractCellStyle(cell: ExcelJS.Cell): IStyleData | undefined {
    const style: any = {};
    let hasStyle = false;

    // Font properties
    if (cell.font) {
        if (cell.font.bold) { style.bl = 1; hasStyle = true; }
        if (cell.font.italic) { style.it = 1; hasStyle = true; }
        if (cell.font.underline) { style.ul = { s: 1 }; hasStyle = true; }
        if (cell.font.strike) { style.st = { s: 1 }; hasStyle = true; }
        if (cell.font.size) { style.fs = cell.font.size; hasStyle = true; }
        if (cell.font.name) { style.ff = cell.font.name; hasStyle = true; }
        if (cell.font.color?.argb) {
            style.cl = { rgb: '#' + cell.font.color.argb.substring(2) };
            hasStyle = true;
        }
    }

    // Background color
    if (cell.fill?.type === 'pattern' && (cell.fill as any).fgColor?.argb) {
        style.bg = { rgb: '#' + (cell.fill as any).fgColor.argb.substring(2) };
        hasStyle = true;
    }

    // Alignment
    if (cell.alignment) {
        const hMap: Record<string, number> = { left: 1, center: 2, right: 3, justify: 4 };
        const vMap: Record<string, number> = { top: 1, middle: 2, bottom: 3 };

        if (cell.alignment.horizontal && hMap[cell.alignment.horizontal]) {
            style.ht = hMap[cell.alignment.horizontal];
            hasStyle = true;
        }
        if (cell.alignment.vertical && vMap[cell.alignment.vertical]) {
            style.vt = vMap[cell.alignment.vertical];
            hasStyle = true;
        }
        if (cell.alignment.wrapText) {
            style.tb = 2;
            hasStyle = true;
        }
        if (cell.alignment.textRotation) {
            style.tr = { a: cell.alignment.textRotation };
            hasStyle = true;
        }
    }

    // Borders (CRITICAL - was missing in worker)
    if (cell.border) {
        style.bd = {};
        const convertBorder = (border: any) => {
            if (!border) return undefined;
            return {
                s: getBorderStyle(border.style),
                cl: border.color?.argb
                    ? { rgb: '#' + border.color.argb.substring(2) }
                    : { rgb: '#000000' }
            };
        };

        if (cell.border.top) { style.bd.t = convertBorder(cell.border.top); hasStyle = true; }
        if (cell.border.bottom) { style.bd.b = convertBorder(cell.border.bottom); hasStyle = true; }
        if (cell.border.left) { style.bd.l = convertBorder(cell.border.left); hasStyle = true; }
        if (cell.border.right) { style.bd.r = convertBorder(cell.border.right); hasStyle = true; }
    }

    // Number format
    if (cell.numFmt) {
        style.n = { pattern: cell.numFmt };
        hasStyle = true;
    }

    return hasStyle ? style : undefined;
}

function getBorderStyle(excelStyle: string): number {
    const styleMap: Record<string, number> = {
        'thin': 1, 'medium': 2, 'thick': 3, 'dotted': 4,
        'dashed': 5, 'double': 6, 'hair': 7, 'mediumDashed': 8,
        'dashDot': 9, 'mediumDashDot': 10, 'dashDotDot': 11,
        'mediumDashDotDot': 12, 'slantDashDot': 13,
    };
    return styleMap[excelStyle] || 1;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function parseCellAddress(address: string): { row: number; col: number } {
    const match = address.match(/^([A-Z]+)(\d+)$/);
    if (!match) return { row: 0, col: 0 };

    const colStr = match[1];
    const rowNum = parseInt(match[2], 10) - 1;

    let colNum = 0;
    for (let i = 0; i < colStr.length; i++) {
        colNum = colNum * 26 + (colStr.charCodeAt(i) - 64);
    }

    return { row: rowNum, col: colNum - 1 };
}

function calculateStats(workbook: IWorkbookData) {
    let totalRows = 0;
    let totalCells = 0;
    let mergedRegions = 0;
    let formulasFound = 0;

    for (const sheet of Object.values(workbook.sheets || {})) {
        const s = sheet as any;
        if (s.cellData) {
            for (const rowKey of Object.keys(s.cellData)) {
                totalRows++;
                const row = s.cellData[rowKey];
                for (const cell of Object.values(row)) {
                    totalCells++;
                    if ((cell as any).f) formulasFound++;
                }
            }
        }
        if (s.mergeData) {
            mergedRegions += s.mergeData.length;
        }
    }

    return {
        sheetCount: Object.keys(workbook.sheets || {}).length,
        totalRows,
        totalCells,
        mergedRegions,
        formulasFound
    };
}

// ============================================================================
// GLOBAL HELPER (for console usage)
// ============================================================================

if (typeof window !== 'undefined') {
    (window as any).benchmarkExcelParser = async (file: File) => {
        const result = await runParserBenchmark(file);
        console.table({
            'File': result.fileName,
            'Size (MB)': result.fileSizeMB.toFixed(2),
            'T1: File Load (ms)': result.timings.fileLoadMs.toFixed(0),
            'T2: ExcelJS Parse (ms)': result.timings.excelJSParseMs.toFixed(0),
            'T3: Transform (ms)': result.timings.transformMs.toFixed(0),
            'TOTAL (ms)': result.timings.totalMs.toFixed(0),
            'Memory Delta (MB)': result.memory.heapDeltaMB.toFixed(1),
            'Cells': result.stats.totalCells,
            'Styles': result.stats.stylesGenerated
        });
        return result;
    };

    (window as any).runParserBenchmark = runParserBenchmark;

    console.log('📊 Benchmark tools loaded. Usage:');
    console.log('   const result = await window.benchmarkExcelParser(file);');
}

export default runParserBenchmark;

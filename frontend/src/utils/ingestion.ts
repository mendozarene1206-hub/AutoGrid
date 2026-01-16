/**
 * ingestion.ts - Excel Import for AutoGrid (Univer version)
 * 
 * Transforma archivos .xlsx en formato IWorkbookData de Univer.
 * FULL COMPLIANCE con Univer data model:
 * - IWorkbookData: id, name, appVersion, locale, styles, sheetOrder, sheets, resources
 * - IWorksheetData: freeze, tabColor, hidden, showGridlines, etc.
 * - IStyleData: borders (bd), number format (n), underline, strikethrough
 * - ICellData: cell type (t), value (v), formula (f), style (s)
 * 
 * OPTIMIZADO para archivos pesados con:
 * - Callbacks de progreso
 * - Validación de tamaño (50MB)
 * - Subida paralela de imágenes
 * - Manejo de errores parciales
 */

import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import type { IWorkbookData, IStyleData } from '@univerjs/core';
import { LocaleType } from '@univerjs/presets';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Resultado de la ingestion de un archivo Excel.
 */
export interface IngestResult {
    workbook: IWorkbookData;
    images: { sheetId: string; url: string; row: number; col: number }[];
    warnings: string[];
}

/**
 * Opciones para la ingestion de archivos Excel.
 */
export interface IngestionOptions {
    onProgress?: (phase: string, percent: number) => void;
    maxFileSizeMB?: number;
    parallelImageUploads?: number;
}

/**
 * Función principal de ingestion.
 */
export async function ingestExcelFile(
    file: File,
    userId: string,
    spreadsheetId: string,
    options?: IngestionOptions
): Promise<IngestResult> {
    const {
        onProgress,
        maxFileSizeMB = 50,
        parallelImageUploads = 3
    } = options || {};

    const warnings: string[] = [];

    console.log("[Ingestion] Procesando archivo Excel:", file.name, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    // 1. Validar tamaño del archivo
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSizeMB) {
        throw new Error(`El archivo (${fileSizeMB.toFixed(1)}MB) excede el límite de ${maxFileSizeMB}MB`);
    }

    onProgress?.('📄 Leyendo archivo...', 5);

    // 2. Leer el archivo en memoria
    const buffer = await file.arrayBuffer();
    onProgress?.('📄 Cargando Excel...', 15);

    // 3. Parsear con ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    onProgress?.('🔄 Procesando hojas...', 25);

    // 4. Convertir a formato Univer
    const univerWorkbook = await convertExcelJSToUniver(
        workbook,
        userId,
        spreadsheetId,
        warnings,
        parallelImageUploads,
        onProgress
    );

    onProgress?.('✅ Completado', 100);

    console.log("[Ingestion] Completado. Hojas:", Object.keys(univerWorkbook.workbook.sheets).length);
    if (warnings.length > 0) {
        console.warn("[Ingestion] Advertencias:", warnings);
    }

    return univerWorkbook;
}

/**
 * Convierte un workbook de ExcelJS a formato Univer IWorkbookData.
 * FULL COMPLIANCE con todas las propiedades de Univer.
 */
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

    // Procesar cada hoja del workbook
    for (const worksheet of workbook.worksheets) {
        const sheetId = `sheet-${worksheet.id}`;
        sheetOrder.push(sheetId);

        const cellData: Record<string, Record<string, any>> = {};
        const rowData: Record<string, any> = {};
        const columnData: Record<string, any> = {};
        const mergeData: any[] = [];

        // Procesar filas y celdas
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            const rowIndex = rowNumber - 1;

            // Altura de fila personalizada
            if (row.height && row.height !== 15) {
                rowData[rowIndex] = {
                    h: row.height,
                    hd: 0  // Not hidden
                };
            }

            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                const colIndex = colNumber - 1;

                if (!cellData[rowIndex]) {
                    cellData[rowIndex] = {};
                }

                // Extraer valor y determinar tipo
                let value: any = cell.value;
                let formula: string | undefined;
                let cellType: number = 1; // Default: string

                // Manejar fórmulas
                if (cell.formula) {
                    formula = cell.formula;
                    value = cell.result;
                } else if (typeof cell.value === 'object' && cell.value !== null) {
                    if ('result' in cell.value) {
                        value = (cell.value as any).result;
                        formula = (cell.value as any).formula;
                    } else if (cell.value instanceof Date) {
                        value = cell.value.toISOString();
                        cellType = 1;
                    }
                }

                // Determinar tipo de celda (t)
                if (typeof value === 'number') {
                    cellType = 2; // Number
                } else if (typeof value === 'boolean') {
                    cellType = 3; // Boolean
                } else if (typeof value === 'string') {
                    cellType = 1; // String
                }

                // Crear objeto de celda Univer con tipo
                const univerCell: any = {
                    v: value ?? '',
                    t: cellType
                };

                // Añadir fórmula si existe
                if (formula) {
                    univerCell.f = formula;
                }

                // Convertir estilos (ahora con borders, number format, etc.)
                const style = convertExcelJSStyleToUniver(cell);
                if (style && Object.keys(style).length > 0) {
                    const styleId = `s${styleIndex++}`;
                    styles[styleId] = style;
                    univerCell.s = styleId;
                }

                cellData[rowIndex][colIndex] = univerCell;
            });
        });

        // Procesar anchos de columna con hidden flag
        worksheet.columns.forEach((col, index) => {
            if (col.width || col.hidden) {
                columnData[index] = {
                    w: (col.width || 10) * 7,
                    hd: col.hidden ? 1 : 0
                };
            }
        });

        // Procesar celdas combinadas (merges)
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

        // Extraer freeze panes
        const freeze = extractFreezePanes(worksheet);

        // Crear worksheet con TODAS las propiedades de IWorksheetData
        sheets[sheetId] = {
            id: sheetId,
            name: worksheet.name,
            tabColor: (worksheet as any).tabColor?.argb
                ? '#' + (worksheet as any).tabColor.argb.substring(2)
                : undefined,
            hidden: worksheet.state === 'hidden' ? 1 : 0,
            freeze: freeze,
            rowCount: Math.max(worksheet.rowCount + 50, 200),
            columnCount: Math.max(worksheet.columnCount + 10, 30),
            defaultColumnWidth: 100,
            defaultRowHeight: 25,
            cellData,
            rowData,
            columnData,
            mergeData,
            showGridlines: 1, // Show gridlines by default
            rightToLeft: 0,
        };

        processedSheets++;
        const sheetProgress = 25 + (processedSheets / totalSheets) * 35;
        onProgress?.(`🔄 Procesando hoja ${processedSheets}/${totalSheets}: ${worksheet.name}`, sheetProgress);
    }

    // Procesar imágenes
    onProgress?.('🖼️ Procesando imágenes...', 65);
    const pendingImages: { sheetId: string; imageId: number; media: any; range: any }[] = [];

    for (const worksheet of workbook.worksheets) {
        const sheetId = `sheet-${worksheet.id}`;
        const worksheetImages = worksheet.getImages();

        for (const img of worksheetImages) {
            const imageId = parseInt(img.imageId, 10);
            const media = (workbook as any).model.media?.[imageId];

            if (media?.buffer) {
                pendingImages.push({ sheetId, imageId, media, range: img.range });
            }
        }
    }

    // Subir imágenes en paralelo
    if (pendingImages.length > 0) {
        onProgress?.(`🖼️ Subiendo ${pendingImages.length} imágenes...`, 70);

        const uploadImage = async (img: typeof pendingImages[0], index: number) => {
            try {
                const ext = img.media.extension || 'png';
                const fileName = `${userId}/${spreadsheetId}/${uuidv4()}.${ext}`;
                const blob = new Blob([img.media.buffer], { type: `image/${ext}` });

                const { data, error } = await supabase.storage
                    .from('project-assets')
                    .upload(fileName, blob);

                if (error) {
                    warnings.push(`Error subiendo imagen ${index + 1}: ${error.message}`);
                    return;
                }

                if (data) {
                    const { data: publicData } = supabase.storage
                        .from('project-assets')
                        .getPublicUrl(fileName);

                    images.push({
                        sheetId: img.sheetId,
                        url: publicData.publicUrl,
                        row: Math.floor(img.range.tl.nativeRow),
                        col: Math.floor(img.range.tl.nativeCol),
                    });
                }

                const imageProgress = 70 + ((index + 1) / pendingImages.length) * 25;
                onProgress?.(`🖼️ Imagen ${index + 1}/${pendingImages.length}`, imageProgress);
            } catch (err: any) {
                warnings.push(`Error procesando imagen ${index + 1}: ${err.message}`);
            }
        };

        for (let i = 0; i < pendingImages.length; i += parallelImageUploads) {
            const batch = pendingImages.slice(i, i + parallelImageUploads);
            await Promise.all(batch.map((img, batchIndex) => uploadImage(img, i + batchIndex)));
        }
    }

    // Crear workbook con TODAS las propiedades de IWorkbookData
    const univerWorkbook: IWorkbookData = {
        id: `workbook-${spreadsheetId}`,
        sheetOrder,
        name: workbook.title || 'Estimación de Obra',
        appVersion: '1.0.0',
        locale: LocaleType.ES_ES,
        styles,
        sheets,
        resources: {}, // Plugin data storage
    };

    return { workbook: univerWorkbook, images, warnings };
}

/**
 * Extrae la configuración de freeze panes de una hoja.
 */
function extractFreezePanes(worksheet: ExcelJS.Worksheet): any {
    const views = worksheet.views;
    if (!views || views.length === 0) return undefined;

    const view = views[0];
    if (view.state !== 'frozen') return undefined;

    return {
        xSplit: view.xSplit || 0,
        ySplit: view.ySplit || 0,
        startRow: view.ySplit || 0,
        startColumn: view.xSplit || 0,
    };
}

/**
 * Convierte estilos de ExcelJS a formato Univer IStyleData.
 * FULL COMPLIANCE: borders, number format, underline, strikethrough, etc.
 */
function convertExcelJSStyleToUniver(cell: ExcelJS.Cell): IStyleData | undefined {
    const style: any = {};

    // Background color (bg)
    if (cell.fill && cell.fill.type === 'pattern' && cell.fill.fgColor) {
        const argb = (cell.fill.fgColor as any).argb;
        if (argb) {
            style.bg = { rgb: '#' + argb.substring(2) };
        }
    }

    // Font properties
    if (cell.font) {
        if (cell.font.bold) style.bl = 1;
        if (cell.font.italic) style.it = 1;
        if (cell.font.underline) style.ul = { s: 1 };
        if (cell.font.strike) style.st = { s: 1 };
        if (cell.font.size) style.fs = cell.font.size;
        if (cell.font.color?.argb) {
            style.cl = { rgb: '#' + cell.font.color.argb.substring(2) };
        }
        if (cell.font.name) style.ff = cell.font.name;

        // Superscript/subscript (va)
        if (cell.font.vertAlign === 'superscript') style.va = 1;
        if (cell.font.vertAlign === 'subscript') style.va = 2;
    }

    // Alignment (ht, vt)
    if (cell.alignment) {
        const hAlignMap: Record<string, number> = { left: 1, center: 2, right: 3, justify: 4 };
        const vAlignMap: Record<string, number> = { top: 1, middle: 2, bottom: 3 };

        if (cell.alignment.horizontal) {
            style.ht = hAlignMap[cell.alignment.horizontal] || 1;
        }
        if (cell.alignment.vertical) {
            style.vt = vAlignMap[cell.alignment.vertical] || 2;
        }

        // Text rotation (tr)
        if (cell.alignment.textRotation) {
            style.tr = { a: cell.alignment.textRotation };
        }

        // Wrap text (tb)
        if (cell.alignment.wrapText) {
            style.tb = 2; // Wrap
        }
    }

    // Borders (bd) - CRITICAL for Excel files
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

        if (cell.border.top) style.bd.t = convertBorder(cell.border.top);
        if (cell.border.bottom) style.bd.b = convertBorder(cell.border.bottom);
        if (cell.border.left) style.bd.l = convertBorder(cell.border.left);
        if (cell.border.right) style.bd.r = convertBorder(cell.border.right);
    }

    // Number format (n) - CRITICAL for currency/percentages
    if (cell.numFmt) {
        style.n = { pattern: cell.numFmt };
    }

    return Object.keys(style).length > 0 ? style : undefined;
}

/**
 * Convierte estilos de borde de Excel a Univer.
 */
function getBorderStyle(excelStyle: string): number {
    const styleMap: Record<string, number> = {
        'thin': 1,
        'medium': 2,
        'thick': 3,
        'dotted': 4,
        'dashed': 5,
        'double': 6,
        'hair': 7,
        'mediumDashed': 8,
        'dashDot': 9,
        'mediumDashDot': 10,
        'dashDotDot': 11,
        'mediumDashDotDot': 12,
        'slantDashDot': 13,
    };
    return styleMap[excelStyle] || 1;
}

/**
 * Parsea una dirección de celda (ej: "A1") a índices de fila/columna.
 */
function parseCellAddress(address: string): { row: number; col: number } {
    const match = address.match(/^([A-Z]+)(\d+)$/);
    if (!match) return { row: 0, col: 0 };

    const colStr = match[1];
    const rowNum = parseInt(match[2], 10) - 1;

    let colNum = 0;
    for (let i = 0; i < colStr.length; i++) {
        colNum = colNum * 26 + (colStr.charCodeAt(i) - 64);
    }
    colNum -= 1;

    return { row: rowNum, col: colNum };
}

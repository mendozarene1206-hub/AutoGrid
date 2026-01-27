/**
 * generate-stress-test.mjs - Excel Stress Test File Generator
 * 
 * Generates Excel files with edge cases to stress test the parser:
 * - Large row counts
 * - Heavy merged cells
 * - Complex styles
 * - Cross-sheet formulas
 * - WBS-style construction data
 * 
 * Usage:
 *   node generate-stress-test.mjs [type]
 *   
 *   Types:
 *     basic     - 5000 rows, mixed data types
 *     merges    - Heavy merged cell regions
 *     styles    - Unique style per cell (worst case)
 *     formulas  - Cross-sheet formulas
 *     wbs       - Construction WBS structure
 *     all       - Generate all test files
 */

import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, 'stress-test-files');

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ============================================================================
// GENERATORS
// ============================================================================

/**
 * Basic stress test: 5000 rows with mixed data types
 */
async function generateBasic() {
    console.log('📊 Generating stress_basic.xlsx...');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AutoGrid Benchmark';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Data');

    // Header row with styles
    const headers = [
        'ID', 'Descripción', 'Cantidad', 'Unidad', 'Precio Unitario',
        'Subtotal', 'IVA 16%', 'Total', 'Categoría', 'Fecha',
        'Proveedor', 'Código', 'Estado', 'Notas', 'Referencia',
        'Col16', 'Col17', 'Col18', 'Col19', 'Col20',
        'Col21', 'Col22', 'Col23', 'Col24', 'Col25'
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Generate 5000 rows of data
    const categories = ['Material', 'Mano de Obra', 'Equipo', 'Subcontrato', 'Indirecto'];
    const units = ['m²', 'm³', 'kg', 'pza', 'lt', 'hr', 'día', 'viaje'];
    const states = ['Pendiente', 'Aprobado', 'En proceso', 'Completado'];

    for (let i = 1; i <= 5000; i++) {
        const qty = Math.floor(Math.random() * 1000) + 1;
        const price = Math.round(Math.random() * 10000 * 100) / 100;
        const subtotal = qty * price;
        const iva = subtotal * 0.16;
        const total = subtotal + iva;

        sheet.addRow([
            i,
            `Partida ${i} - Descripción extendida del concepto de obra #${i}`,
            qty,
            units[Math.floor(Math.random() * units.length)],
            price,
            subtotal,
            iva,
            total,
            categories[Math.floor(Math.random() * categories.length)],
            new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            `Proveedor ${Math.floor(Math.random() * 50) + 1}`,
            `COD-${String(i).padStart(5, '0')}`,
            states[Math.floor(Math.random() * states.length)],
            i % 10 === 0 ? `Nota especial para partida ${i}` : '',
            `REF-${i}`
        ]);

        if (i % 1000 === 0) {
            console.log(`   ${i}/5000 rows...`);
        }
    }

    // Apply number formats
    sheet.getColumn(5).numFmt = '"$"#,##0.00';
    sheet.getColumn(6).numFmt = '"$"#,##0.00';
    sheet.getColumn(7).numFmt = '"$"#,##0.00';
    sheet.getColumn(8).numFmt = '"$"#,##0.00';
    sheet.getColumn(10).numFmt = 'dd/mm/yyyy';

    // Set column widths
    sheet.columns.forEach(col => {
        col.width = 15;
    });

    await workbook.xlsx.writeFile(join(OUTPUT_DIR, 'stress_basic.xlsx'));
    console.log('✅ stress_basic.xlsx created (5000 rows, 25 cols)\n');
}

/**
 * Merged cells stress test
 */
async function generateMerges() {
    console.log('📊 Generating stress_merges.xlsx...');
    const workbook = new ExcelJS.Workbook();

    // Create 3 sheets with heavy merges
    for (let s = 1; s <= 3; s++) {
        const sheet = workbook.addWorksheet(`Sheet${s}`);

        // Title merge (A1:J1)
        sheet.mergeCells('A1:J1');
        sheet.getCell('A1').value = `WBS PRESUPUESTO - SECCIÓN ${s}`;
        sheet.getCell('A1').font = { bold: true, size: 16 };
        sheet.getCell('A1').alignment = { horizontal: 'center' };

        // Create WBS-style structure with merges
        let row = 3;
        for (let chapter = 1; chapter <= 10; chapter++) {
            // Chapter header (merge across columns)
            sheet.mergeCells(`A${row}:J${row}`);
            sheet.getCell(`A${row}`).value = `${chapter}. CAPITULO ${chapter} - Trabajos Preliminares`;
            sheet.getCell(`A${row}`).font = { bold: true };
            sheet.getCell(`A${row}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD9E2F3' }
            };
            row++;

            // Subcategories with vertical merges
            for (let sub = 1; sub <= 5; sub++) {
                const startRow = row;

                // Add 4 line items per subcategory
                for (let item = 1; item <= 4; item++) {
                    sheet.getCell(`B${row}`).value = `${chapter}.${sub}.${item}`;
                    sheet.getCell(`C${row}`).value = `Concepto ${item}`;
                    sheet.getCell(`D${row}`).value = Math.floor(Math.random() * 100);
                    sheet.getCell(`E${row}`).value = 'm²';
                    sheet.getCell(`F${row}`).value = Math.random() * 1000;
                    sheet.getCell(`G${row}`).value = { formula: `D${row}*F${row}` };
                    row++;
                }

                // Merge the subcategory identifier column
                sheet.mergeCells(`A${startRow}:A${row - 1}`);
                sheet.getCell(`A${startRow}`).value = `${chapter}.${sub}`;
                sheet.getCell(`A${startRow}`).alignment = { vertical: 'middle' };
            }

            // Chapter totals row
            sheet.mergeCells(`A${row}:E${row}`);
            sheet.getCell(`A${row}`).value = `TOTAL CAPITULO ${chapter}`;
            sheet.getCell(`A${row}`).font = { bold: true };
            sheet.getCell(`A${row}`).alignment = { horizontal: 'right' };
            row++;
        }

        // Large rectangular merge at bottom
        sheet.mergeCells(`A${row + 2}:J${row + 6}`);
        sheet.getCell(`A${row + 2}`).value = 'NOTAS Y OBSERVACIONES:\n\nEste presupuesto incluye todos los materiales y mano de obra necesarios.\nSujeto a cambios según condiciones del sitio.\nVigencia: 30 días.';
        sheet.getCell(`A${row + 2}`).alignment = { wrapText: true, vertical: 'top' };
    }

    await workbook.xlsx.writeFile(join(OUTPUT_DIR, 'stress_merges.xlsx'));
    console.log('✅ stress_merges.xlsx created (3 sheets, ~500 merged regions)\n');
}

/**
 * Unique style per cell (worst case for style deduplication)
 */
async function generateStyles() {
    console.log('📊 Generating stress_styles.xlsx...');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Styles');

    const fonts = ['Arial', 'Calibri', 'Times New Roman', 'Verdana', 'Tahoma'];
    const colors = ['FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
        'FF8800', '8800FF', '0088FF', 'FF0088', '88FF00', '00FF88'];

    // Generate 5000 rows x 25 cols = 125,000 cells, each with unique style
    for (let r = 1; r <= 5000; r++) {
        const row = sheet.addRow([]);

        for (let c = 1; c <= 25; c++) {
            const cell = row.getCell(c);
            cell.value = `R${r}C${c}`;

            // Create unique style combination
            cell.font = {
                name: fonts[(r + c) % fonts.length],
                size: 8 + ((r + c) % 8),
                bold: (r + c) % 3 === 0,
                italic: (r + c) % 5 === 0,
                color: { argb: 'FF' + colors[(r * c) % colors.length] }
            };

            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF' + colors[(r + c + 3) % colors.length] }
            };

            cell.alignment = {
                horizontal: ['left', 'center', 'right'][(r + c) % 3],
                vertical: ['top', 'middle', 'bottom'][(r + c) % 3]
            };

            if ((r + c) % 7 === 0) {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF000000' } },
                    right: { style: 'thin', color: { argb: 'FF000000' } }
                };
            }
        }

        if (r % 1000 === 0) {
            console.log(`   ${r}/5000 rows...`);
        }
    }

    await workbook.xlsx.writeFile(join(OUTPUT_DIR, 'stress_styles.xlsx'));
    console.log('✅ stress_styles.xlsx created (125,000 uniquely styled cells)\n');
}

/**
 * Formula stress test with cross-sheet references
 */
async function generateFormulas() {
    console.log('📊 Generating stress_formulas.xlsx...');
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Source data
    const source = workbook.addWorksheet('Datos');
    source.addRow(['Mes', 'Ventas', 'Costos', 'Margen']);

    for (let i = 1; i <= 1000; i++) {
        const ventas = Math.round(Math.random() * 100000);
        const costos = Math.round(ventas * (0.5 + Math.random() * 0.3));
        source.addRow([
            `Mes ${i}`,
            ventas,
            costos,
            { formula: `B${i + 1}-C${i + 1}` }
        ]);
    }

    // Sheet 2: Summary with cross-sheet formulas
    const summary = workbook.addWorksheet('Resumen');
    summary.addRow(['Métrica', 'Valor', 'Fórmula']);

    summary.addRow(['Total Ventas', { formula: 'SUM(Datos!B:B)' }, 'SUM(Datos!B:B)']);
    summary.addRow(['Total Costos', { formula: 'SUM(Datos!C:C)' }, 'SUM(Datos!C:C)']);
    summary.addRow(['Total Margen', { formula: 'SUM(Datos!D:D)' }, 'SUM(Datos!D:D)']);
    summary.addRow(['Promedio Ventas', { formula: 'AVERAGE(Datos!B:B)' }, 'AVERAGE(Datos!B:B)']);
    summary.addRow(['Max Ventas', { formula: 'MAX(Datos!B:B)' }, 'MAX(Datos!B:B)']);
    summary.addRow(['Min Ventas', { formula: 'MIN(Datos!B:B)' }, 'MIN(Datos!B:B)']);
    summary.addRow(['Count', { formula: 'COUNTA(Datos!A:A)-1' }, 'COUNTA(Datos!A:A)-1']);

    // Sheet 3: Complex formulas
    const complex = workbook.addWorksheet('Fórmulas Complejas');

    for (let r = 1; r <= 50; r++) {
        for (let c = 1; c <= 50; c++) {
            const cell = complex.getCell(r, c);

            if (r === 1 || c === 1) {
                cell.value = r === 1 ? c : r;
            } else {
                // Create chain of formulas
                if (r === 2 && c === 2) {
                    cell.value = { formula: 'A1+B1' };
                } else if (c === 2) {
                    cell.value = { formula: `A${r}+B${r - 1}` };
                } else {
                    cell.value = { formula: `${getColLetter(c - 1)}${r}+${getColLetter(c)}${r - 1}` };
                }
            }
        }
    }

    await workbook.xlsx.writeFile(join(OUTPUT_DIR, 'stress_formulas.xlsx'));
    console.log('✅ stress_formulas.xlsx created (1000 rows + cross-sheet formulas)\n');
}

/**
 * Construction WBS stress test
 */
async function generateWBS() {
    console.log('📊 Generating stress_wbs.xlsx...');
    const workbook = new ExcelJS.Workbook();

    const wbsStructure = [
        { code: '01', name: 'PRELIMINARES', items: 15 },
        { code: '02', name: 'CIMENTACIÓN', items: 25 },
        { code: '03', name: 'ESTRUCTURA', items: 40 },
        { code: '04', name: 'ALBAÑILERÍA', items: 30 },
        { code: '05', name: 'INSTALACIÓN HIDRÁULICA', items: 35 },
        { code: '06', name: 'INSTALACIÓN SANITARIA', items: 25 },
        { code: '07', name: 'INSTALACIÓN ELÉCTRICA', items: 45 },
        { code: '08', name: 'ACABADOS', items: 60 },
        { code: '09', name: 'CARPINTERÍA', items: 20 },
        { code: '10', name: 'HERRERÍA', items: 15 },
        { code: '11', name: 'CANCELERÍA', items: 12 },
        { code: '12', name: 'PINTURA', items: 18 },
        { code: '13', name: 'IMPERMEABILIZACIÓN', items: 8 },
        { code: '14', name: 'JARDINERÍA', items: 10 },
        { code: '15', name: 'LIMPIEZA', items: 5 },
    ];

    for (let sheetNum = 1; sheetNum <= 2; sheetNum++) {
        const sheet = workbook.addWorksheet(`Edificio ${sheetNum}`);

        // Title
        sheet.mergeCells('A1:H1');
        sheet.getCell('A1').value = `PRESUPUESTO DE OBRA - EDIFICIO ${sheetNum}`;
        sheet.getCell('A1').font = { bold: true, size: 14 };
        sheet.getCell('A1').alignment = { horizontal: 'center' };
        sheet.getCell('A1').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1F4E79' }
        };
        sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };

        // Headers
        const headers = ['CÓDIGO', 'CONCEPTO', 'UNIDAD', 'CANTIDAD', 'P.U.', 'IMPORTE', 'IVA', 'TOTAL'];
        const headerRow = sheet.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9E2F3' }
        };

        let currentRow = 3;
        let grandTotal = 0;

        for (const chapter of wbsStructure) {
            // Chapter header
            sheet.mergeCells(`A${currentRow}:H${currentRow}`);
            sheet.getCell(`A${currentRow}`).value = `${chapter.code} - ${chapter.name}`;
            sheet.getCell(`A${currentRow}`).font = { bold: true };
            sheet.getCell(`A${currentRow}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFF2CC' }
            };
            currentRow++;

            let chapterTotal = 0;

            // Items
            for (let i = 1; i <= chapter.items; i++) {
                const qty = Math.round(Math.random() * 500 * 100) / 100;
                const pu = Math.round(Math.random() * 5000 * 100) / 100;

                const row = sheet.addRow([
                    `${chapter.code}.${String(i).padStart(2, '0')}`,
                    `Concepto de ${chapter.name.toLowerCase()} #${i}`,
                    ['m²', 'm³', 'kg', 'pza', 'ml', 'lot'][Math.floor(Math.random() * 6)],
                    qty,
                    pu,
                    { formula: `D${currentRow}*E${currentRow}` },
                    { formula: `F${currentRow}*0.16` },
                    { formula: `F${currentRow}+G${currentRow}` }
                ]);

                currentRow++;
            }

            // Chapter subtotal
            const subtotalRow = sheet.addRow([
                '',
                `SUBTOTAL ${chapter.name}`,
                '', '', '',
                { formula: `SUM(F${currentRow - chapter.items}:F${currentRow - 1})` },
                { formula: `SUM(G${currentRow - chapter.items}:G${currentRow - 1})` },
                { formula: `SUM(H${currentRow - chapter.items}:H${currentRow - 1})` }
            ]);
            subtotalRow.font = { bold: true };
            subtotalRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE2EFDA' }
            };
            currentRow++;
        }

        // Grand total
        currentRow++;
        sheet.mergeCells(`A${currentRow}:E${currentRow}`);
        sheet.getCell(`A${currentRow}`).value = 'TOTAL GENERAL';
        sheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
        sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right' };

        // Number formats
        sheet.getColumn(4).numFmt = '#,##0.00';
        sheet.getColumn(5).numFmt = '"$"#,##0.00';
        sheet.getColumn(6).numFmt = '"$"#,##0.00';
        sheet.getColumn(7).numFmt = '"$"#,##0.00';
        sheet.getColumn(8).numFmt = '"$"#,##0.00';

        // Column widths
        sheet.getColumn(1).width = 12;
        sheet.getColumn(2).width = 50;
        sheet.getColumn(3).width = 10;
        sheet.getColumn(4).width = 12;
        sheet.getColumn(5).width = 14;
        sheet.getColumn(6).width = 16;
        sheet.getColumn(7).width = 14;
        sheet.getColumn(8).width = 16;
    }

    await workbook.xlsx.writeFile(join(OUTPUT_DIR, 'stress_wbs.xlsx'));
    console.log('✅ stress_wbs.xlsx created (2 sheets, ~400 items per sheet)\n');
}

// ============================================================================
// UTILITIES
// ============================================================================

function getColLetter(num) {
    let letter = '';
    while (num > 0) {
        const mod = (num - 1) % 26;
        letter = String.fromCharCode(65 + mod) + letter;
        num = Math.floor((num - mod) / 26);
    }
    return letter || 'A';
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    const type = process.argv[2] || 'all';

    console.log('\n🔧 Excel Stress Test File Generator');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Output directory: ${OUTPUT_DIR}\n`);

    const generators = {
        basic: generateBasic,
        merges: generateMerges,
        styles: generateStyles,
        formulas: generateFormulas,
        wbs: generateWBS,
    };

    if (type === 'all') {
        for (const [name, fn] of Object.entries(generators)) {
            await fn();
        }
    } else if (generators[type]) {
        await generators[type]();
    } else {
        console.log('Unknown type. Available: basic, merges, styles, formulas, wbs, all');
        process.exit(1);
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ All stress test files generated!');
    console.log(`📁 Location: ${OUTPUT_DIR}`);
    console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);

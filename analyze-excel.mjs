/**
 * analyze-excel.mjs
 * Analyze the structure of the SUMMYT estimation Excel file
 */

import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function analyzeExcel() {
    const filePath = resolve(__dirname, 'SUMMYT_ESTIMACIÓN  29-.xlsx');
    console.log('📂 Analyzing:', filePath);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    console.log('\n📊 WORKBOOK STRUCTURE');
    console.log('====================');
    console.log(`Total sheets: ${workbook.worksheets.length}`);

    for (const sheet of workbook.worksheets) {
        console.log(`\n📋 SHEET: "${sheet.name}"`);
        console.log(`   Rows: ${sheet.rowCount}`);
        console.log(`   Columns: ${sheet.columnCount}`);

        // Analyze first 15 rows to understand structure
        console.log('\n   HEADER ANALYSIS (first 3 rows):');
        for (let rowNum = 1; rowNum <= Math.min(3, sheet.rowCount); rowNum++) {
            const row = sheet.getRow(rowNum);
            const values = [];
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= 15) { // First 15 columns
                    const val = cell.value;
                    if (val !== null && val !== undefined && val !== '') {
                        values.push(`[${colNumber}] ${String(val).substring(0, 30)}`);
                    }
                }
            });
            if (values.length > 0) {
                console.log(`   Row ${rowNum}: ${values.join(' | ')}`);
            }
        }

        // Detect WBS patterns
        console.log('\n   WBS PATTERN DETECTION (first column, rows 1-30):');
        const wbsPatterns = [];
        for (let rowNum = 1; rowNum <= Math.min(30, sheet.rowCount); rowNum++) {
            const cell = sheet.getCell(rowNum, 1);
            const val = cell.value;
            if (val) {
                const str = String(val).trim();
                // Check for WBS-like patterns
                if (/^\d+(\.\d+)*\.?$/.test(str) || /^[A-Z]\d*(\.\d+)*\.?$/.test(str)) {
                    wbsPatterns.push({ row: rowNum, value: str });
                }
            }
        }
        if (wbsPatterns.length > 0) {
            console.log(`   Found ${wbsPatterns.length} WBS codes:`);
            wbsPatterns.slice(0, 10).forEach(p => console.log(`   - Row ${p.row}: "${p.value}"`));
        }

        // Detect column types by sampling data
        console.log('\n   COLUMN TYPE ANALYSIS (rows 5-20):');
        const columnStats = {};
        for (let rowNum = 5; rowNum <= Math.min(20, sheet.rowCount); rowNum++) {
            const row = sheet.getRow(rowNum);
            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                if (colNumber <= 15) {
                    if (!columnStats[colNumber]) {
                        columnStats[colNumber] = { types: {}, samples: [] };
                    }
                    const type = typeof cell.value;
                    columnStats[colNumber].types[type] = (columnStats[colNumber].types[type] || 0) + 1;
                    if (columnStats[colNumber].samples.length < 3) {
                        columnStats[colNumber].samples.push(String(cell.value).substring(0, 25));
                    }
                }
            });
        }

        for (const [col, stats] of Object.entries(columnStats)) {
            const mainType = Object.entries(stats.types).sort((a, b) => b[1] - a[1])[0];
            console.log(`   Col ${col}: ${mainType?.[0] || 'mixed'} (samples: ${stats.samples.join(', ')})`);
        }

        // Check for merged cells
        const mergedCells = sheet.model?.merges || [];
        if (mergedCells.length > 0) {
            console.log(`\n   MERGED CELLS: ${mergedCells.length} regions`);
            mergedCells.slice(0, 5).forEach(m => console.log(`   - ${m}`));
        }

        // Check for formulas
        let formulaCount = 0;
        for (let rowNum = 1; rowNum <= Math.min(100, sheet.rowCount); rowNum++) {
            const row = sheet.getRow(rowNum);
            row.eachCell((cell) => {
                if (cell.formula) formulaCount++;
            });
        }
        console.log(`\n   FORMULAS: ${formulaCount} formulas in first 100 rows`);

        // Only analyze first sheet in detail
        if (workbook.worksheets.indexOf(sheet) >= 2) {
            console.log('\n   (Skipping detailed analysis for remaining sheets...)');
            break;
        }
    }

    console.log('\n✅ Analysis complete!');
}

analyzeExcel().catch(console.error);

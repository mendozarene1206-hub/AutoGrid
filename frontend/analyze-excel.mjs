/**
 * analyze-excel.mjs
 * Analyze the structure of the SUMMYT estimation Excel file - LOG TO FILE
 */

import ExcelJS from 'exceljs';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

async function analyzeExcel() {
    const filePath = resolve('../SUMMYT_ESTIMACIÓN  29-.xlsx');
    const output = [];
    const log = (msg) => { output.push(msg); console.log(msg); };

    log('📂 Analyzing: ' + filePath);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    log('\n📊 WORKBOOK STRUCTURE');
    log('====================');
    log(`Total sheets: ${workbook.worksheets.length}`);
    log(`Sheet names: ${workbook.worksheets.map(s => s.name).join(', ')}`);

    for (const sheet of workbook.worksheets) {
        log(`\n${'='.repeat(60)}`);
        log(`📋 SHEET: "${sheet.name}"`);
        log(`${'='.repeat(60)}`);
        log(`   Rows: ${sheet.rowCount}`);
        log(`   Columns: ${sheet.columnCount}`);

        // Analyze first rows to understand structure
        log('\n   HEADER ANALYSIS (first 8 rows):');
        for (let rowNum = 1; rowNum <= Math.min(8, sheet.rowCount); rowNum++) {
            const row = sheet.getRow(rowNum);
            const values = [];
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= 15) {
                    const val = cell.value;
                    if (val !== null && val !== undefined && val !== '') {
                        let display = '';
                        if (typeof val === 'object') {
                            if (val.richText) display = val.richText.map(r => r.text).join('').substring(0, 20);
                            else if (val.formula) display = `[F]`;
                            else if (val.result !== undefined) display = String(val.result).substring(0, 20);
                            else display = JSON.stringify(val).substring(0, 20);
                        } else {
                            display = String(val).substring(0, 25);
                        }
                        values.push(`[Col${colNumber}]"${display}"`);
                    }
                }
            });
            if (values.length > 0) {
                log(`   Row ${rowNum}: ${values.join(' | ')}`);
            }
        }

        // Sample data rows
        log('\n   DATA SAMPLE (rows 10-25):');
        for (let rowNum = 10; rowNum <= Math.min(25, sheet.rowCount); rowNum++) {
            const row = sheet.getRow(rowNum);
            const values = [];
            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                if (colNumber <= 12) {
                    const val = cell.value;
                    let display = '';
                    if (typeof val === 'object' && val !== null) {
                        if (val.formula) display = `[F]`;
                        else if (val.result !== undefined) display = String(val.result).substring(0, 12);
                        else if (val.richText) display = val.richText.map(r => r.text).join('').substring(0, 12);
                        else display = '(obj)';
                    } else if (typeof val === 'number') {
                        display = val.toLocaleString('en-US', { maximumFractionDigits: 2 }).substring(0, 12);
                    } else {
                        display = String(val).substring(0, 15);
                    }
                    values.push(`[${colNumber}]${display}`);
                }
            });
            if (values.length > 0) {
                log(`   Row ${rowNum}: ${values.join(' | ')}`);
            }
        }

        // Check for formulas
        let formulaCount = 0;
        let sampleFormulas = [];
        for (let rowNum = 1; rowNum <= Math.min(100, sheet.rowCount); rowNum++) {
            const row = sheet.getRow(rowNum);
            row.eachCell((cell) => {
                if (cell.formula) {
                    formulaCount++;
                    if (sampleFormulas.length < 8) {
                        sampleFormulas.push({ cell: cell.address, formula: cell.formula.substring(0, 50) });
                    }
                }
            });
        }
        log(`\n   FORMULAS: ${formulaCount} formulas in first 100 rows`);
        if (sampleFormulas.length > 0) {
            sampleFormulas.forEach(f => log(`   - ${f.cell}: ${f.formula}`));
        }

        // Column width analysis
        log('\n   COLUMN WIDTHS:');
        for (let i = 1; i <= Math.min(12, sheet.columnCount); i++) {
            const col = sheet.getColumn(i);
            log(`   Col ${i}: width=${col.width || 'default'}`);
        }

        // Only analyze first 2 sheets
        if (workbook.worksheets.indexOf(sheet) >= 1) {
            log('\n   (Limiting to first 2 sheets...)');
            break;
        }
    }

    log('\n✅ Analysis complete!');

    // Write to file
    writeFileSync('excel-analysis-output.txt', output.join('\n'));
    log('\n📄 Full output saved to excel-analysis-output.txt');
}

analyzeExcel().catch(console.error);

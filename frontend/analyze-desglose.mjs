/**
 * analyze-desglose.mjs
 * Deep analysis of the 03 Desglose sheet which is the main estimation breakdown
 */

import ExcelJS from 'exceljs';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

async function analyzeDesglose() {
    const filePath = resolve('../SUMMYT_ESTIMACIÓN  29-.xlsx');
    const output = [];
    const log = (msg) => { output.push(msg); console.log(msg); };

    log('📂 Deep analysis of 03 Desglose sheet');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    // Find the Desglose sheet
    let sheet = workbook.getWorksheet('03 Desglose f') || workbook.getWorksheet('03 Desglose');
    if (!sheet) {
        // Try to find by partial name
        sheet = workbook.worksheets.find(s => s.name.includes('Desglose'));
    }

    if (!sheet) {
        log('❌ Could not find Desglose sheet!');
        log('Available sheets: ' + workbook.worksheets.slice(0, 10).map(s => s.name).join(', '));
        return;
    }

    log(`\n📋 Analyzing sheet: "${sheet.name}"`);
    log(`   Total Rows: ${sheet.rowCount}`);
    log(`   Total Columns: ${sheet.columnCount}`);

    // Header row analysis - scan first 15 rows for headers
    log('\n📊 HEADER STRUCTURE (rows 1-15):');
    for (let rowNum = 1; rowNum <= Math.min(15, sheet.rowCount); rowNum++) {
        const row = sheet.getRow(rowNum);
        const cells = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber <= 20) {
                const val = cell.value;
                if (val !== null && val !== undefined && val !== '') {
                    let display = '';
                    if (typeof val === 'object') {
                        if (val.richText) display = val.richText.map(r => r.text).join('').substring(0, 30);
                        else if (val.formula) display = `[FORMULA]`;
                        else display = JSON.stringify(val).substring(0, 20);
                    } else {
                        display = String(val).substring(0, 30);
                    }
                    cells.push(`Col${colNumber}:"${display}"`);
                }
            }
        });
        if (cells.length > 0) {
            log(`Row ${rowNum}: ${cells.join(' | ')}`);
        }
    }

    // WBS Detection in first visible column
    log('\n🔢 WBS STRUCTURE (first 80 data rows):');
    const wbsRows = [];
    for (let rowNum = 1; rowNum <= Math.min(100, sheet.rowCount); rowNum++) {
        // Check first 3 columns for WBS patterns
        for (let col = 1; col <= 3; col++) {
            const cell = sheet.getCell(rowNum, col);
            const val = cell.value;
            if (val) {
                const str = String(typeof val === 'object' && val.richText
                    ? val.richText.map(r => r.text).join('')
                    : val).trim();

                // WBS patterns: 1, 1.1, 1.1.1, I, II, A, etc
                if (/^\d+(\.\d+)*\.?$/.test(str) ||
                    /^[IVX]+(\.\d+)*\.?$/.test(str) ||
                    /^[A-Z](\.\d+)*\.?$/.test(str)) {

                    // Get description from next column
                    const descCell = sheet.getCell(rowNum, col + 1);
                    const desc = descCell.value;
                    let descStr = '';
                    if (desc) {
                        descStr = typeof desc === 'object' && desc.richText
                            ? desc.richText.map(r => r.text).join('')
                            : String(desc);
                    }

                    wbsRows.push({
                        row: rowNum,
                        col: col,
                        wbs: str,
                        description: descStr.substring(0, 40)
                    });
                    break;
                }
            }
        }
    }

    log(`Found ${wbsRows.length} WBS entries:`);
    wbsRows.slice(0, 30).forEach(w => {
        const level = (w.wbs.match(/\./g) || []).length;
        const indent = '  '.repeat(level);
        log(`   ${indent}[${w.wbs}] ${w.description}`);
    });

    // DATA COLUMNS - Find the actual data area
    log('\n📈 DATA COLUMN STRUCTURE:');
    // Find a row with numeric data (likely row 15+)
    for (let rowNum = 15; rowNum <= 30; rowNum++) {
        const row = sheet.getRow(rowNum);
        let hasNumbers = false;
        const values = [];

        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const val = cell.value;
            if (typeof val === 'number') hasNumbers = true;

            let display = '';
            if (typeof val === 'object') {
                if (val.formula) display = `[F=${val.formula.substring(0, 15)}]`;
                else if (val.result !== undefined) display = `${val.result}`.substring(0, 10);
                else display = '(obj)';
            } else if (typeof val === 'number') {
                display = val.toLocaleString('en-US', { maximumFractionDigits: 2 });
            } else {
                display = String(val).substring(0, 20);
            }
            values.push(`C${colNumber}:${display}`);
        });

        if (hasNumbers && values.length > 3) {
            log(`Row ${rowNum} (sample): ${values.join(' | ')}`);
        }
    }

    // Column headers - try to find them
    log('\n📋 DETECTED COLUMN LAYOUT:');
    const colHeaders = {};
    for (let rowNum = 1; rowNum <= 12; rowNum++) {
        const row = sheet.getRow(rowNum);
        row.eachCell((cell, colNumber) => {
            const val = cell.value;
            if (val && typeof val === 'string' && val.length > 2 && val.length < 30) {
                if (!colHeaders[colNumber]) {
                    colHeaders[colNumber] = val;
                }
            } else if (val && typeof val === 'object' && val.richText) {
                const text = val.richText.map(r => r.text).join('');
                if (text.length > 2 && text.length < 30) {
                    if (!colHeaders[colNumber]) {
                        colHeaders[colNumber] = text;
                    }
                }
            }
        });
    }

    Object.entries(colHeaders).slice(0, 15).forEach(([col, header]) => {
        log(`   Column ${col}: "${header}"`);
    });

    // Formula patterns
    log('\n🔣 FORMULA PATTERNS:');
    const formulaPatterns = {};
    for (let rowNum = 1; rowNum <= Math.min(200, sheet.rowCount); rowNum++) {
        const row = sheet.getRow(rowNum);
        row.eachCell((cell) => {
            if (cell.formula) {
                // Extract formula type
                const match = cell.formula.match(/^([A-Z]+)\(/);
                if (match) {
                    const func = match[1];
                    formulaPatterns[func] = (formulaPatterns[func] || 0) + 1;
                }
            }
        });
    }

    Object.entries(formulaPatterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([func, count]) => {
            log(`   ${func}: ${count} uses`);
        });

    log('\n✅ Analysis complete!');

    writeFileSync('desglose-analysis.txt', output.join('\n'));
    log('\n📄 Saved to desglose-analysis.txt');
}

analyzeDesglose().catch(console.error);

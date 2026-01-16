/**
 * Script para generar un archivo Excel de prueba con estilos
 * para verificar la importación "Pixel Perfect" de AutoGrid.
 * 
 * Ejecutar: node generate-test-excel.mjs
 */

import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateTestExcel() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AutoGrid Test Generator';
    workbook.created = new Date();

    // ============================================
    // HOJA 1: Estimación de Obra
    // ============================================
    const sheet1 = workbook.addWorksheet('Estimación', {
        properties: { tabColor: { argb: '4F46E5' } }
    });

    // Configurar anchos de columna
    sheet1.columns = [
        { width: 12 },  // A - Código
        { width: 45 },  // B - Descripción
        { width: 10 },  // C - Unidad
        { width: 12 },  // D - Cantidad
        { width: 15 },  // E - P.U.
        { width: 18 },  // F - Importe
    ];

    // TÍTULO PRINCIPAL (Celdas combinadas)
    sheet1.mergeCells('A1:F1');
    const titleCell = sheet1.getCell('A1');
    titleCell.value = 'ESTIMACIÓN DE OBRA No. 001';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet1.getRow(1).height = 35;

    // SUBTÍTULO
    sheet1.mergeCells('A2:F2');
    const subtitleCell = sheet1.getCell('A2');
    subtitleCell.value = 'Proyecto: Edificio Corporativo Plaza Central';
    subtitleCell.font = { name: 'Arial', size: 12, italic: true };
    subtitleCell.alignment = { horizontal: 'center' };
    sheet1.getRow(2).height = 25;

    // ENCABEZADOS DE TABLA
    const headers = ['CÓDIGO', 'DESCRIPCIÓN', 'UNIDAD', 'CANTIDAD', 'P.U.', 'IMPORTE'];
    const headerRow = sheet1.getRow(4);
    headers.forEach((header, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = header;
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F2937' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin', color: { argb: '000000' } },
            bottom: { style: 'thin', color: { argb: '000000' } },
            left: { style: 'thin', color: { argb: '000000' } },
            right: { style: 'thin', color: { argb: '000000' } }
        };
    });
    headerRow.height = 25;

    // DATOS DE EJEMPLO (Capítulos y Conceptos)
    const data = [
        { type: 'chapter', code: '1', desc: 'PRELIMINARES', unit: '', qty: '', pu: '', amount: '' },
        { type: 'item', code: '1.1', desc: 'Limpieza y trazo del terreno', unit: 'M2', qty: 500, pu: 25.50, amount: null },
        { type: 'item', code: '1.2', desc: 'Demolición de estructuras existentes', unit: 'M3', qty: 120, pu: 180.00, amount: null },
        { type: 'item', code: '1.3', desc: 'Retiro de escombro a 20km', unit: 'M3', qty: 150, pu: 95.00, amount: null },

        { type: 'chapter', code: '2', desc: 'CIMENTACIÓN', unit: '', qty: '', pu: '', amount: '' },
        { type: 'item', code: '2.1', desc: 'Excavación a cielo abierto', unit: 'M3', qty: 320, pu: 85.00, amount: null },
        { type: 'item', code: '2.2', desc: 'Plantilla de concreto f\'c=100 kg/cm2', unit: 'M2', qty: 280, pu: 145.00, amount: null },
        { type: 'item', code: '2.3', desc: 'Zapatas de concreto f\'c=250 kg/cm2', unit: 'M3', qty: 95, pu: 2850.00, amount: null },
        { type: 'item', code: '2.4', desc: 'Acero de refuerzo fy=4200 kg/cm2', unit: 'KG', qty: 4500, pu: 28.50, amount: null },

        { type: 'chapter', code: '3', desc: 'ESTRUCTURA', unit: '', qty: '', pu: '', amount: '' },
        { type: 'item', code: '3.1', desc: 'Columnas de concreto armado', unit: 'M3', qty: 45, pu: 4200.00, amount: null },
        { type: 'item', code: '3.2', desc: 'Trabes de concreto armado', unit: 'M3', qty: 85, pu: 3800.00, amount: null },
        { type: 'item', code: '3.3', desc: 'Losa maciza de 12cm', unit: 'M2', qty: 1200, pu: 680.00, amount: null },
    ];

    let rowNum = 5;
    data.forEach((item) => {
        const row = sheet1.getRow(rowNum);

        if (item.type === 'chapter') {
            // Capítulo: fondo amarillo, negrita
            sheet1.mergeCells(`B${rowNum}:F${rowNum}`);
            row.getCell(1).value = item.code;
            row.getCell(2).value = item.desc;

            for (let c = 1; c <= 6; c++) {
                const cell = row.getCell(c);
                cell.font = { name: 'Arial', size: 11, bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
                cell.border = {
                    top: { style: 'thin', color: { argb: '000000' } },
                    bottom: { style: 'thin', color: { argb: '000000' } },
                    left: { style: 'thin', color: { argb: '000000' } },
                    right: { style: 'thin', color: { argb: '000000' } }
                };
            }
        } else {
            // Concepto: datos normales con fórmula
            row.getCell(1).value = item.code;
            row.getCell(2).value = item.desc;
            row.getCell(3).value = item.unit;
            row.getCell(3).alignment = { horizontal: 'center' };
            row.getCell(4).value = item.qty;
            row.getCell(4).numFmt = '#,##0.00';
            row.getCell(4).alignment = { horizontal: 'right' };
            row.getCell(5).value = item.pu;
            row.getCell(5).numFmt = '$#,##0.00';
            row.getCell(5).alignment = { horizontal: 'right' };

            // FÓRMULA: Importe = Cantidad * P.U.
            row.getCell(6).value = { formula: `D${rowNum}*E${rowNum}` };
            row.getCell(6).numFmt = '$#,##0.00';
            row.getCell(6).alignment = { horizontal: 'right' };
            row.getCell(6).font = { name: 'Arial', size: 11, bold: true };

            // Bordes para todas las celdas
            for (let c = 1; c <= 6; c++) {
                row.getCell(c).border = {
                    top: { style: 'thin', color: { argb: 'D1D5DB' } },
                    bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
                    left: { style: 'thin', color: { argb: 'D1D5DB' } },
                    right: { style: 'thin', color: { argb: 'D1D5DB' } }
                };
            }

            // Alternar colores de fondo
            if (rowNum % 2 === 0) {
                for (let c = 1; c <= 6; c++) {
                    row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };
                }
            }
        }

        rowNum++;
    });

    // FILA DE TOTAL
    rowNum += 1;
    sheet1.mergeCells(`A${rowNum}:E${rowNum}`);
    const totalLabelCell = sheet1.getCell(`A${rowNum}`);
    totalLabelCell.value = 'TOTAL ESTIMACIÓN';
    totalLabelCell.font = { name: 'Arial', size: 12, bold: true };
    totalLabelCell.alignment = { horizontal: 'right' };
    totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };
    totalLabelCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFF' } };

    const totalValueCell = sheet1.getCell(`F${rowNum}`);
    totalValueCell.value = { formula: `SUM(F5:F${rowNum - 2})` };
    totalValueCell.numFmt = '$#,##0.00';
    totalValueCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFF' } };
    totalValueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };
    totalValueCell.alignment = { horizontal: 'right' };

    // Bordes para total
    for (let c = 1; c <= 6; c++) {
        sheet1.getCell(rowNum, c).border = {
            top: { style: 'medium', color: { argb: '000000' } },
            bottom: { style: 'medium', color: { argb: '000000' } },
            left: { style: 'thin', color: { argb: '000000' } },
            right: { style: 'thin', color: { argb: '000000' } }
        };
    }
    sheet1.getRow(rowNum).height = 28;

    // ============================================
    // GUARDAR ARCHIVO
    // ============================================
    const outputPath = path.join(__dirname, 'estimacion_prueba.xlsx');
    await workbook.xlsx.writeFile(outputPath);
    console.log('✅ Archivo generado:', outputPath);
    console.log('');
    console.log('Características del archivo de prueba:');
    console.log('  - Celdas combinadas (título, capítulos)');
    console.log('  - Bordes con diferentes estilos');
    console.log('  - Colores de fondo y fuente');
    console.log('  - Formatos de número (moneda)');
    console.log('  - Fórmulas (D*E para importe, SUM para total)');
    console.log('  - Filas alternas con color');
}

generateTestExcel().catch(console.error);

import React, { useMemo } from 'react';
import { Workbook } from '@fortune-sheet/react';
import '@fortune-sheet/react/dist/index.css';
import './EqualsTheme.css';

interface AutoGridProps {
    data: any;
    readOnly?: boolean;
}

export const AutoGrid: React.FC<AutoGridProps> = ({ data, readOnly = false }) => {

    const fortuneData = useMemo(() => {
        // New format: data.sheets is already an array in LuckySheet/FortuneSheet format
        if (!data?.sheets) {
            return [{ name: "Sheet1", celldata: [], status: 1 }];
        }

        // If data.sheets is already an array (new LuckyExcel format), use directly
        if (Array.isArray(data.sheets)) {
            return data.sheets.map((sheet: any, index: number) => ({
                ...sheet,
                status: index === 0 ? 1 : 0
            }));
        }

        // Fallback: Legacy format where sheets is an object { sheetName: { rows: {...} } }
        return Object.entries(data.sheets).map(([sheetName, sheet]: [string, any], index: number) => {
            const celldata: any[] = [];

            Object.entries(sheet.rows || {}).forEach(([rStr, rowObj]: [string, any]) => {
                const r = parseInt(rStr);
                Object.entries(rowObj).forEach(([cStr, cell]: [string, any]) => {
                    const c = parseInt(cStr);
                    celldata.push({ r, c, v: cell });
                });
            });

            return {
                name: sheetName,
                celldata,
                status: index === 0 ? 1 : 0
            };
        });
    }, [data]);

    const settings = {
        showToolbar: true,
        showSheetConfigBar: true,
        showFormulaBar: true,
        lang: 'es',
        showtoolbarConfig: {
            undo: true,
            redo: true,
            paintformat: true,
            currencyFormat: true,
            percentageFormat: true,
            numberDecrease: true,
            numberIncrease: true,
            moreFormats: true,
            font: true,
            fontSize: true,
            bold: true,
            italic: true,
            strikethrough: false,
            underline: false,
            textColor: true,
            fillColor: true,
            border: true,
            mergeCell: true,
            align: true,
            valign: true,
            textWrap: true,
            freeze: true,
            autofilter: true,
            function: true,
            chart: false,
            postil: false,
            pivotTable: false
        }
    };

    return (
        <div style={{ width: '100%', height: '800px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
            <Workbook
                key={fortuneData[0]?.name || 'empty'}
                data={fortuneData}
                allowEdit={!readOnly}
                columnHeaderHeight={30}
                rowHeaderWidth={40}
                {...settings}
            />
        </div>
    );
};

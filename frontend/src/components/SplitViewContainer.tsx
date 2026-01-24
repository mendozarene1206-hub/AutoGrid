/**
 * SplitViewContainer.tsx
 * 
 * Container for displaying two sheets side-by-side for comparison.
 * Users can drag sheet tabs to assign them to left or right panels.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createUniver, defaultTheme, LocaleType, merge } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/presets/preset-sheets-core';
import sheetsCoreCssEn from '@univerjs/presets/preset-sheets-core/locales/es-ES';
import '@univerjs/presets/lib/styles/preset-sheets-core.css';
import type { IWorkbookData, Univer } from '@univerjs/core';

interface SplitViewContainerProps {
    workbookData: IWorkbookData | null;
    readOnly?: boolean;
}

interface SheetInfo {
    id: string;
    name: string;
}

export const SplitViewContainer: React.FC<SplitViewContainerProps> = ({
    workbookData,
    readOnly: _readOnly = false
}) => {
    const [sheets, setSheets] = useState<SheetInfo[]>([]);
    const [leftSheetId, setLeftSheetId] = useState<string | null>(null);
    const [rightSheetId, setRightSheetId] = useState<string | null>(null);
    const [draggedSheet, setDraggedSheet] = useState<string | null>(null);

    const leftContainerRef = useRef<HTMLDivElement>(null);
    const rightContainerRef = useRef<HTMLDivElement>(null);
    const leftUniverRef = useRef<Univer | null>(null);
    const rightUniverRef = useRef<Univer | null>(null);

    // Extract sheet list from workbook data
    useEffect(() => {
        if (workbookData?.sheets) {
            const sheetList = Object.values(workbookData.sheets).map((sheet: any) => ({
                id: sheet.id,
                name: sheet.name || 'Unnamed Sheet'
            }));
            setSheets(sheetList);

            // Auto-select first two sheets if available
            if (sheetList.length >= 1 && !leftSheetId) {
                setLeftSheetId(sheetList[0].id);
            }
            if (sheetList.length >= 2 && !rightSheetId) {
                setRightSheetId(sheetList[1].id);
            }
        }
    }, [workbookData]);

    // Initialize Univer instance for a container
    const initUniver = useCallback((
        container: HTMLDivElement,
        sheetId: string,
        univerRef: React.MutableRefObject<Univer | null>
    ) => {
        // Cleanup previous instance
        if (univerRef.current) {
            try {
                univerRef.current.dispose();
            } catch (e) {
                console.warn('[SplitView] Dispose error:', e);
            }
            univerRef.current = null;
        }

        if (!workbookData || !sheetId) return;

        // Create a workbook with only the selected sheet
        const selectedSheet = workbookData.sheets?.[sheetId];
        if (!selectedSheet) return;

        const singleSheetWorkbook: IWorkbookData = {
            ...workbookData,
            id: `split-${sheetId}-${Date.now()}`,
            sheetOrder: [sheetId],
            sheets: { [sheetId]: selectedSheet }
        };

        try {
            const { univer, univerAPI } = createUniver({
                locale: LocaleType.ES_ES,
                locales: {
                    [LocaleType.ES_ES]: merge({}, sheetsCoreCssEn),
                },
                theme: defaultTheme,
                presets: [
                    UniverSheetsCorePreset({
                        container: container,
                    }),
                ],
            });

            univerRef.current = univer;
            univerAPI.createWorkbook(singleSheetWorkbook);
            console.log(`[SplitView] Initialized sheet: ${selectedSheet.name}`);
        } catch (err) {
            console.error('[SplitView] Init error:', err);
        }
    }, [workbookData]);

    // Initialize left panel
    useEffect(() => {
        if (leftContainerRef.current && leftSheetId) {
            initUniver(leftContainerRef.current, leftSheetId, leftUniverRef);
        }
        return () => {
            if (leftUniverRef.current) {
                try { leftUniverRef.current.dispose(); } catch (e) { }
            }
        };
    }, [leftSheetId, initUniver]);

    // Initialize right panel
    useEffect(() => {
        if (rightContainerRef.current && rightSheetId) {
            initUniver(rightContainerRef.current, rightSheetId, rightUniverRef);
        }
        return () => {
            if (rightUniverRef.current) {
                try { rightUniverRef.current.dispose(); } catch (e) { }
            }
        };
    }, [rightSheetId, initUniver]);

    // Drag handlers
    const handleDragStart = (sheetId: string) => {
        setDraggedSheet(sheetId);
    };

    const handleDragEnd = () => {
        setDraggedSheet(null);
    };

    const handleDropLeft = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedSheet) {
            setLeftSheetId(draggedSheet);
        }
    };

    const handleDropRight = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedSheet) {
            setRightSheetId(draggedSheet);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div className="split-view-wrapper">
            {/* Sheet Tabs Bar */}
            <div className="split-sheet-tabs">
                <span className="tabs-label">Sheets:</span>
                {sheets.map(sheet => (
                    <div
                        key={sheet.id}
                        className={`sheet-tab ${leftSheetId === sheet.id || rightSheetId === sheet.id ? 'active' : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(sheet.id)}
                        onDragEnd={handleDragEnd}
                    >
                        <span className="tab-icon">📄</span>
                        {sheet.name}
                        {leftSheetId === sheet.id && <span className="position-badge left">L</span>}
                        {rightSheetId === sheet.id && <span className="position-badge right">R</span>}
                    </div>
                ))}
                <div className="tabs-hint">
                    Drag sheets to panels below
                </div>
            </div>

            {/* Split Panels */}
            <div className="split-panels">
                {/* Left Panel */}
                <div
                    className={`split-panel left ${draggedSheet ? 'drop-ready' : ''}`}
                    onDrop={handleDropLeft}
                    onDragOver={handleDragOver}
                >
                    <div className="panel-header">
                        <span className="panel-label">LEFT</span>
                        <span className="panel-sheet-name">
                            {sheets.find(s => s.id === leftSheetId)?.name || 'Drop a sheet here'}
                        </span>
                    </div>
                    <div className="panel-content" ref={leftContainerRef}>
                        {!leftSheetId && (
                            <div className="drop-placeholder">
                                <span>📄</span>
                                <p>Drag a sheet tab here</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Divider */}
                <div className="split-divider">
                    <div className="divider-handle" />
                </div>

                {/* Right Panel */}
                <div
                    className={`split-panel right ${draggedSheet ? 'drop-ready' : ''}`}
                    onDrop={handleDropRight}
                    onDragOver={handleDragOver}
                >
                    <div className="panel-header">
                        <span className="panel-label">RIGHT</span>
                        <span className="panel-sheet-name">
                            {sheets.find(s => s.id === rightSheetId)?.name || 'Drop a sheet here'}
                        </span>
                    </div>
                    <div className="panel-content" ref={rightContainerRef}>
                        {!rightSheetId && (
                            <div className="drop-placeholder">
                                <span>📄</span>
                                <p>Drag a sheet tab here</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SplitViewContainer;

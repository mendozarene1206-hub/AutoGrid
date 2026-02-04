/**
 * TrojanTreeView Component
 * 
 * AG Grid-based tree view for WBS (Work Breakdown Structure) hierarchy.
 * Displays estimation concepts in a hierarchical tree with expand/collapse support.
 * 
 * Features:
 * - Hierarchical display using AG Grid Tree Data
 * - Expand/collapse nodes
 * - Row selection with visual feedback
 * - Performance optimized for large datasets (500+ nodes)
 * - Loading skeleton states
 * 
 * Boris Cherny Tips Applied:
 * - Challenge Mode: Virtualization via AG Grid, race condition handling via hook
 * - Prove It Works: Structured logs, performance metrics display
 * - Elegant Solution: Custom hook separation, clean component structure
 * - Detailed Specs: Full TypeScript types, typed props
 */

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { 
    GridReadyEvent, 
    RowSelectedEvent, 
    CellClickedEvent,
    ColDef,
    GridOptions,
    ICellRendererParams,
} from 'ag-grid-community';
import { 
    AllCommunityModule, 
    ModuleRegistry,
} from 'ag-grid-community';

import { useTreeData } from '../hooks/useTreeData';
import './TrojanTreeView.css';
import type { 
    TrojanTreeViewProps, 
    // TrojanFlatNode - available for future flat list operations
    TreeRowData,
} from '../types/trojanTree';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

// ========================
// Logger Utility
// ========================

const LOG_PREFIX = '[TrojanTreeView]';

interface LogContext {
    estimationId: string;
    [key: string]: unknown;
}

function logInfo(message: string, context: LogContext): void {
    // eslint-disable-next-line no-console
    console.log(`${LOG_PREFIX} ${message}`, context);
}

function logDebug(message: string, context: LogContext): void {
    // Only log in development
    if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug(`${LOG_PREFIX} ${message}`, context);
    }
}

function _logError(message: string, context: LogContext & { error: unknown }): void {
    // eslint-disable-next-line no-console
    console.error(`${LOG_PREFIX} ${message}`, context);
}

// ========================
// Cell Renderers
// ========================

/**
 * Cell renderer for the tree column.
 * Applies different styles based on node type.
 */
const ConceptCellRenderer: React.FC<ICellRendererParams<TreeRowData>> = (props) => {
    const { value, data } = props;
    
    if (!data) return null;
    
    const isCategory = data.type === 'category';
    const hasAssets = data.photoCount > 0 || data.generatorCount > 0 || data.specCount > 0;
    
    return (
        <span 
            className={`trojan-tree-concept ${isCategory ? 'trojan-tree-category' : 'trojan-tree-leaf'}`}
            title={data.code}
        >
            {value}
            {!isCategory && hasAssets && (
                <span className="trojan-tree-asset-indicator"> ●</span>
            )}
        </span>
    );
};

/**
 * Cell renderer for asset counts.
 * Shows count with subtle styling.
 */
const AssetCountRenderer: React.FC<ICellRendererParams<TreeRowData>> = (props) => {
    const { value } = props;
    const count = typeof value === 'number' ? value : 0;
    
    return (
        <span className={`trojan-tree-count ${count > 0 ? 'has-items' : 'empty'}`}>
            {count}
        </span>
    );
};

// ========================
// Component
// ========================

export const TrojanTreeView: React.FC<TrojanTreeViewProps> = ({
    estimationId,
    onConceptSelect,
    selectedConceptCode,
}) => {
    // Refs
    const gridRef = useRef<AgGridReact<TreeRowData>>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const prevEstimationIdRef = useRef<string | null>(null);
    
    // Local state
    const [gridReady, setGridReady] = useState(false);
    
    // Fetch tree data
    const { 
        flatNodes, 
        isLoading, 
        error, 
        metadata, 
        metrics,
        refetch,
        isRefetching,
    } = useTreeData(estimationId);
    
    // Log when data changes
    useEffect(() => {
        if (metadata && estimationId) {
            logInfo(`Loaded ${metadata.totalNodes} nodes, depth ${metadata.maxDepth}`, {
                estimationId,
                totalNodes: metadata.totalNodes,
                maxDepth: metadata.maxDepth,
                fetchTime: metrics?.fetchTime,
                transformTime: metrics?.transformTime,
            });
        }
    }, [metadata, metrics, estimationId]);
    
    // Log estimationId changes
    useEffect(() => {
        if (estimationId !== prevEstimationIdRef.current) {
            logInfo('EstimationId changed', {
                estimationId: estimationId || 'null',
                previousId: prevEstimationIdRef.current || 'null',
            });
            prevEstimationIdRef.current = estimationId || null;
        }
    }, [estimationId]);
    
    // Transform nodes to row data
    const rowData: TreeRowData[] = useMemo(() => {
        return flatNodes.map(node => ({
            id: node.id,
            hierarchy: node.hierarchy,
            hierarchyPath: node.hierarchyPath,
            level: node.level,
            code: node.code,
            name: node.name,
            type: node.type,
            rowCount: node.rowCount,
            photoCount: node.photoCount,
            generatorCount: node.generatorCount,
            specCount: node.specCount,
            isLeaf: node.isLeaf,
            conceptCode: node.conceptCode,
        }));
    }, [flatNodes]);
    
    // Column definitions
    const columnDefs: ColDef<TreeRowData>[] = useMemo(() => [
        // Tree column (auto-group column will handle the hierarchy)
        {
            field: 'name',
            headerName: 'Concepto',
            width: 400,
            cellRenderer: ConceptCellRenderer,
            flex: 2,
        },
        {
            field: 'code',
            headerName: 'Código',
            width: 100,
            sortable: true,
            filter: true,
            cellClass: 'trojan-tree-code-cell',
        },
        {
            field: 'type',
            headerName: 'Tipo',
            width: 100,
            sortable: true,
            filter: true,
            valueFormatter: (params) => {
                const value = params.value as string;
                return value === 'category' ? 'Categoría' : 'Concepto';
            },
            cellClass: (params) => {
                const value = params.value as string;
                return `trojan-tree-type-${value}`;
            },
        },
        {
            field: 'rowCount',
            headerName: 'Filas',
            width: 80,
            sortable: true,
            type: 'numericColumn',
            cellRenderer: AssetCountRenderer,
        },
        {
            field: 'photoCount',
            headerName: 'Fotos',
            width: 80,
            sortable: true,
            type: 'numericColumn',
            cellRenderer: AssetCountRenderer,
        },
        {
            field: 'generatorCount',
            headerName: 'Gen.',
            width: 80,
            sortable: true,
            type: 'numericColumn',
            cellRenderer: AssetCountRenderer,
        },
    ], []);
    
    // Grid options
    const gridOptions: GridOptions<TreeRowData> = useMemo(() => ({
        // Tree data configuration
        treeData: true,
        getDataPath: (data) => data.hierarchy,
        
        // Row configuration
        getRowId: (params) => params.data.id,
        rowSelection: 'single',
        suppressRowClickSelection: false,
        
        // Grouping configuration
        autoGroupColumnDef: {
            headerName: 'Concepto',
            field: 'name',
            cellRendererParams: {
                suppressCount: true,
                checkbox: false,
            },
            width: 400,
            flex: 2,
        },
        
        // Styling
        rowClass: 'trojan-tree-row',
        getRowClass: (params) => {
            const data = params.data as TreeRowData;
            const classes: string[] = [];
            
            if (data.type === 'category') {
                classes.push('trojan-tree-row-category');
            } else {
                classes.push('trojan-tree-row-concept');
            }
            
            if (data.conceptCode === selectedConceptCode) {
                classes.push('trojan-tree-row-selected');
            }
            
            if (data.isLeaf) {
                classes.push('trojan-tree-row-leaf');
            }
            
            return classes.join(' ');
        },
        
        // Virtualization (for performance with large datasets)
        rowBuffer: 20,
        rowModelType: 'clientSide',
        
        // Expand/collapse
        groupDefaultExpanded: 1, // Expand first level by default
        
        // Callbacks
        onRowSelected: (event: RowSelectedEvent<TreeRowData>) => {
            if (event.node.isSelected() && event.data) {
                const data = event.data;
                
                logDebug('Row selected', {
                    estimationId: estimationId || 'unknown',
                    nodeId: data.id,
                    code: data.code,
                    type: data.type,
                    isLeaf: data.isLeaf,
                });
                
                // Only emit for concept types (leaf nodes)
                if (data.type === 'concept' && data.conceptCode && onConceptSelect) {
                    const node = flatNodes.find(n => n.id === data.id);
                    if (node) {
                        onConceptSelect(data.conceptCode, {
                            ...node,
                            children: undefined, // Remove circular ref
                        } as typeof node);
                    }
                }
            }
        },
        
        onCellClicked: (event: CellClickedEvent<TreeRowData>) => {
            if (event.data?.type === 'concept') {
                logDebug('Cell clicked on concept', {
                    estimationId: estimationId || 'unknown',
                    code: event.data.code,
                    conceptCode: event.data.conceptCode,
                });
            }
        },
        
        // Loading overlay
        loadingOverlayComponent: () => (
            <div className="trojan-tree-loading">
                <div className="trojan-tree-loading-spinner" />
                <span>Cargando jerarquía...</span>
            </div>
        ),
        
        // Locale
        localeText: {
            loadingOoo: 'Cargando...',
            noRowsToShow: 'No hay datos para mostrar',
            page: 'Página',
            of: 'de',
            to: 'a',
        },
    }), [estimationId, selectedConceptCode, onConceptSelect, flatNodes]);
    
    // Grid ready handler
    const onGridReady = useCallback((event: GridReadyEvent) => {
        logInfo('Grid ready', {
            estimationId: estimationId || 'unknown',
            api: !!event.api,
        });
        setGridReady(true);
    }, [estimationId]);
    
    // Expand/collapse handlers
    const expandAll = useCallback(() => {
        gridRef.current?.api?.expandAll();
        logDebug('Expanded all nodes', {
            estimationId: estimationId || 'unknown',
        });
    }, [estimationId]);
    
    const collapseAll = useCallback(() => {
        gridRef.current?.api?.collapseAll();
        logDebug('Collapsed all nodes', {
            estimationId: estimationId || 'unknown',
        });
    }, [estimationId]);
    
    // Find and select node by concept code
    useEffect(() => {
        if (!gridReady || !selectedConceptCode || !gridRef.current?.api) return;
        
        const api = gridRef.current.api;
        let found = false;
        
        api.forEachNode((node) => {
            if (found) return;
            
            const data = node.data;
            if (data?.conceptCode === selectedConceptCode) {
                node.setSelected(true);
                api.ensureIndexVisible(node.rowIndex ?? 0, 'middle');
                found = true;
                
                logDebug('Auto-selected node by conceptCode', {
                    estimationId: estimationId || 'unknown',
                    conceptCode: selectedConceptCode,
                    nodeId: data.id,
                });
            }
        });
    }, [selectedConceptCode, gridReady, estimationId]);
    
    // Render loading state
    if (isLoading && !isRefetching) {
        return (
            <div className="trojan-tree-container trojan-tree-loading-container" ref={containerRef}>
                <div className="trojan-tree-loading">
                    <div className="trojan-tree-loading-spinner" />
                    <span>Cargando jerarquía WBS...</span>
                    {estimationId && (
                        <span className="trojan-tree-loading-detail">
                            Estimación: {estimationId.slice(0, 8)}...
                        </span>
                    )}
                </div>
            </div>
        );
    }
    
    // Render error state
    if (error && !isLoading) {
        return (
            <div className="trojan-tree-container trojan-tree-error-container" ref={containerRef}>
                <div className="trojan-tree-error">
                    <span className="trojan-tree-error-icon">⚠️</span>
                    <span className="trojan-tree-error-message">{error}</span>
                    <button 
                        className="trojan-tree-retry-button"
                        onClick={() => refetch()}
                        disabled={isRefetching}
                    >
                        {isRefetching ? 'Reintentando...' : 'Reintentar'}
                    </button>
                </div>
            </div>
        );
    }
    
    // Render main grid
    return (
        <div className="trojan-tree-wrapper">
            {/* Toolbar */}
            <div className="trojan-tree-toolbar">
                <div className="trojan-tree-toolbar-left">
                    <span className="trojan-tree-title">WBS - Estructura de Trabajo</span>
                    {metadata && (
                        <span className="trojan-tree-meta">
                            {metadata.totalNodes} nodos • Prof. {metadata.maxDepth}
                        </span>
                    )}
                </div>
                <div className="trojan-tree-toolbar-right">
                    {metrics && (
                        <span className="trojan-tree-metrics">
                            Load: {metrics.totalTime}ms
                        </span>
                    )}
                    <button 
                        className="trojan-tree-btn"
                        onClick={expandAll}
                        title="Expandir todo"
                    >
                        ⬇️
                    </button>
                    <button 
                        className="trojan-tree-btn"
                        onClick={collapseAll}
                        title="Colapsar todo"
                    >
                        ⬆️
                    </button>
                    <button 
                        className={`trojan-tree-btn ${isRefetching ? 'loading' : ''}`}
                        onClick={() => refetch()}
                        disabled={isRefetching}
                        title="Recargar"
                    >
                        🔄
                    </button>
                </div>
            </div>
            
            {/* Grid Container */}
            <div className="trojan-tree-container" ref={containerRef}>
                <AgGridReact<TreeRowData>
                    ref={gridRef}
                    gridOptions={gridOptions}
                    columnDefs={columnDefs}
                    rowData={rowData}
                    onGridReady={onGridReady}
                    domLayout="autoHeight"
                />
            </div>
            
            {/* Status bar */}
            <div className="trojan-tree-status">
                <span>
                    {rowData.length} nodos cargados
                    {selectedConceptCode && (
                        <span className="trojan-tree-status-selected">
                            • Seleccionado: {selectedConceptCode}
                        </span>
                    )}
                </span>
            </div>
        </div>
    );
};

// Display name for debugging
TrojanTreeView.displayName = 'TrojanTreeView';

export default TrojanTreeView;

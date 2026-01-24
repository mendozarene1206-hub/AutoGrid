/**
 * SelectionSidebar.tsx
 * 
 * Right sidebar showing summary and analysis of selected cells/rows.
 * Displays cell count, numeric stats, and quick actions.
 */

import React from 'react';

interface CellSelection {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
    values: (string | number | null)[];
}

interface SelectionSidebarProps {
    selection: CellSelection | null;
    isOpen: boolean;
    onClose: () => void;
}

export const SelectionSidebar: React.FC<SelectionSidebarProps> = ({
    selection,
    isOpen,
    onClose
}) => {
    if (!isOpen) return null;

    // Calculate statistics from numeric values
    const numericValues = selection?.values
        .filter((v): v is number => typeof v === 'number' && !isNaN(v)) || [];

    const stats = {
        count: selection?.values.length || 0,
        numericCount: numericValues.length,
        sum: numericValues.reduce((a, b) => a + b, 0),
        avg: numericValues.length > 0
            ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
            : 0,
        min: numericValues.length > 0 ? Math.min(...numericValues) : 0,
        max: numericValues.length > 0 ? Math.max(...numericValues) : 0,
    };

    const formatNumber = (n: number): string => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(n);
    };

    const formatCurrency = (n: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(n);
    };

    const getSelectionRange = (): string => {
        if (!selection) return 'No selection';
        const startCol = String.fromCharCode(65 + selection.startCol);
        const endCol = String.fromCharCode(65 + selection.endCol);
        return `${startCol}${selection.startRow + 1}:${endCol}${selection.endRow + 1}`;
    };

    return (
        <div className="selection-sidebar">
            {/* Header */}
            <div className="sidebar-header">
                <div className="header-title">
                    <span className="header-icon">📊</span>
                    <h3>Selection Summary</h3>
                </div>
                <button className="close-btn" onClick={onClose}>✕</button>
            </div>

            {/* Selection Info */}
            <div className="sidebar-section">
                <div className="section-label">Range</div>
                <div className="range-badge">{getSelectionRange()}</div>
            </div>

            {/* Cell Count */}
            <div className="sidebar-section">
                <div className="section-label">Cells</div>
                <div className="stat-grid">
                    <div className="stat-item">
                        <span className="stat-value">{stats.count}</span>
                        <span className="stat-label">Total</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{stats.numericCount}</span>
                        <span className="stat-label">Numeric</span>
                    </div>
                </div>
            </div>

            {/* Numeric Statistics */}
            {stats.numericCount > 0 && (
                <div className="sidebar-section">
                    <div className="section-label">Statistics</div>
                    <div className="stats-list">
                        <div className="stats-row">
                            <span className="stats-key">Sum</span>
                            <span className="stats-value mono">{formatCurrency(stats.sum)}</span>
                        </div>
                        <div className="stats-row">
                            <span className="stats-key">Average</span>
                            <span className="stats-value mono">{formatNumber(stats.avg)}</span>
                        </div>
                        <div className="stats-row">
                            <span className="stats-key">Min</span>
                            <span className="stats-value mono">{formatNumber(stats.min)}</span>
                        </div>
                        <div className="stats-row">
                            <span className="stats-key">Max</span>
                            <span className="stats-value mono">{formatNumber(stats.max)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="sidebar-section">
                <div className="section-label">Quick Actions</div>
                <div className="actions-list">
                    <button className="action-btn">
                        <span>📋</span> Copy Values
                    </button>
                    <button className="action-btn">
                        <span>📈</span> Create Chart
                    </button>
                    <button className="action-btn">
                        <span>🔍</span> Audit Selection
                    </button>
                </div>
            </div>

            {/* Footer with variance indicator */}
            <div className="sidebar-footer">
                <div className="variance-header">
                    <span>Variance from Budget</span>
                    <span className="variance-value positive">+5.2%</span>
                </div>
                <div className="variance-bar">
                    <div className="variance-fill" style={{ width: '5.2%' }} />
                </div>
            </div>
        </div>
    );
};

export default SelectionSidebar;

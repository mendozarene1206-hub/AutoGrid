/**
 * ViewToggle.tsx
 * 
 * Toggle buttons for switching between Grid, Split, and Kanban views.
 * Inspired by Google AI Studio prototype's clean icon-based navigation.
 */

import React from 'react';

export type ViewMode = 'GRID' | 'SPLIT' | 'TREE' | 'KANBAN';

interface ViewToggleProps {
    currentView: ViewMode;
    onViewChange: (view: ViewMode) => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ currentView, onViewChange }) => {
    const views: { mode: ViewMode; icon: string; label: string }[] = [
        { mode: 'GRID', icon: '▦', label: 'Grid View' },
        { mode: 'SPLIT', icon: '◫', label: 'Split View' },
        { mode: 'TREE', icon: '🌲', label: 'Tree View' },
        { mode: 'KANBAN', icon: '☰', label: 'Kanban' },
    ];

    return (
        <div className="view-toggle-container">
            {views.map(({ mode, icon, label }) => (
                <button
                    key={mode}
                    className={`view-toggle-btn ${currentView === mode ? 'active' : ''}`}
                    onClick={() => onViewChange(mode)}
                    title={label}
                >
                    <span className="view-icon">{icon}</span>
                    <span className="view-label">{label}</span>
                </button>
            ))}
        </div>
    );
};

export default ViewToggle;

/**
 * IconNav.tsx
 * 
 * Slim vertical icon navigation bar (w-16).
 * Based on AutoGrid Design System - "Linear" look.
 */

import React from 'react';
import { LayoutGrid, Layers, Kanban, MoreHorizontal } from 'lucide-react';
import type { ViewMode } from './ViewToggle';

interface IconNavProps {
    currentView: ViewMode;
    onViewChange: (view: ViewMode) => void;
}

export const IconNav: React.FC<IconNavProps> = ({ currentView, onViewChange }) => {
    const navItems: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
        { mode: 'GRID', icon: <LayoutGrid size={22} />, label: 'Grid View' },
        { mode: 'SPLIT', icon: <Layers size={22} />, label: 'Split View' },
        { mode: 'KANBAN', icon: <Kanban size={22} />, label: 'Kanban' },
    ];

    return (
        <nav className="icon-nav">
            {navItems.map(({ mode, icon, label }) => (
                <button
                    key={mode}
                    className={`icon-nav-btn ${currentView === mode ? 'active' : ''}`}
                    onClick={() => onViewChange(mode)}
                    title={label}
                >
                    {icon}
                </button>
            ))}

            <div className="icon-nav-spacer" />

            <button className="icon-nav-btn" title="More options">
                <MoreHorizontal size={22} />
            </button>
        </nav>
    );
};

export default IconNav;

import React from 'react';

interface SidebarProps {
    onHomeClick: () => void;
    activeTab: 'home' | 'projects' | 'shared';
    onTabChange: (tab: 'home' | 'projects' | 'shared') => void;
}

export const Sidebar: React.FC<SidebarProps & { className?: string }> = ({ onHomeClick, activeTab, onTabChange, className }) => {
    return (
        <aside className={`sidebar-workspace ${className || ''}`}>

            {/* Header / Brand */}
            <div className="sidebar-brand" onClick={onHomeClick} style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <div style={{ fontSize: '1.5rem', color: '#ff006e' }}>🧬</div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-dark)' }}>AutoGrid</h2>
            </div>

            {/* Menu Category */}
            <div className="sidebar-category">
                <span className="category-title">Menu</span>
                <nav className="category-nav">
                    <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => onTabChange('home')}>
                        <span className="icon">⭐</span> Favorite
                    </button>
                    <button className="nav-item">
                        <span className="icon">🛒</span> Marketplace
                    </button>
                    <button className="nav-item">
                        <span className="icon">🔌</span> Plug-in
                    </button>
                </nav>
            </div>

            {/* Workspace Category */}
            <div className="sidebar-category">
                <span className="category-title">All Workspace</span>
                <nav className="category-nav">
                    <button className={`nav-item ${activeTab === 'projects' ? 'active' : ''} folder-item`} onClick={() => onTabChange('projects')}>
                        <span className="folder-icon">📂</span> Workspace 1
                    </button>
                    <div style={{ paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div className="sub-item active-file">
                            <span className="file-icon bg-pink">📄</span> Q1 Report
                        </div>
                        <div className="sub-item">
                            <span className="file-icon bg-gray">📄</span> Q2 Report
                        </div>
                    </div>
                    <button className="nav-item folder-item">
                        <span className="folder-icon">📂</span> My Workspace
                    </button>
                    <button className="nav-item folder-item">
                        <span className="folder-icon">📂</span> Pixelz Studio
                    </button>
                </nav>
            </div>

            {/* Create New Category */}
            <div className="sidebar-category mt-auto">
                <span className="category-title">Create new</span>
                <nav className="category-nav">
                    <button className="nav-item text-blue">
                        <span className="icon">▦</span> Grid View
                    </button>
                    <button className="nav-item text-purple">
                        <span className="icon">📊</span> Kanban View
                    </button>
                </nav>
            </div>

            {/* User Footer */}
            <div className="sidebar-footer">
                <div className="user-badge-simple">
                    <div className="avatar small">JD</div>
                    <div className="user-info">
                        <span className="name">User Name</span>
                    </div>
                </div>
            </div>
        </aside>
    );
};

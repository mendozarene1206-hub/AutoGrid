import React from 'react';

interface ProjectCardProps {
    id: string;
    name: string;
    status: 'draft' | 'in_review' | 'signed';
    lastModified: string;
    onClick: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ id, name, status, lastModified, onClick }) => {
    const statusColors = {
        draft: '#9ca3af',
        in_review: '#6366f1',
        signed: '#10b981'
    };

    const statusLabels = {
        draft: 'Borrador',
        in_review: 'En Revisión',
        signed: 'Firmado'
    };

    return (
        <div className="project-card glassmorphism" onClick={onClick}>
            <div className="card-header">
                <span className="emoji">📊</span>
                <span className="status-dot" style={{ backgroundColor: statusColors[status] }}></span>
            </div>
            <div className="card-body">
                <h3>{name || 'Proyecto Sin Nombre'}</h3>
                <p className="uuid">{id.substring(0, 8)}...</p>
            </div>
            <div className="card-footer">
                <span className="status-label">{statusLabels[status]}</span>
                <span className="date">{new Date(lastModified).toLocaleDateString()}</span>
            </div>
        </div>
    );
};

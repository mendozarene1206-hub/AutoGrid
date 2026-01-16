import React from 'react';
import { ProjectCard } from './ProjectCard';

interface DashboardProps {
    projects: any[];
    onProjectClick: (id: string) => void;
    onUploadClick: () => void;
    onCreateClick: () => void;
    loading: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
    projects,
    onProjectClick,
    onUploadClick,
    onCreateClick,
    loading
}) => {
    return (
        <div className="dashboard-content">
            <header className="dashboard-header">
                <div className="header-titles">
                    <h1>Mis Proyectos</h1>
                    <p>Gestiona tus estimaciones de obra y presupuestos.</p>
                </div>
                <div className="header-actions">
                    <button className="secondary" onClick={onCreateClick}>
                        <span className="icon">➕</span> Nuevo
                    </button>
                    <button className="primary" onClick={onUploadClick}>
                        <span className="icon">📤</span> Subir Excel
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Cargando proyectos...</p>
                </div>
            ) : projects.length === 0 ? (
                <div className="empty-state glassmorphism">
                    <span className="big-icon">📂</span>
                    <h3>No hay proyectos aún</h3>
                    <p>Comienza subiendo un archivo Excel o creando un proyecto nuevo.</p>
                    <button className="primary" onClick={onUploadClick}>Empezar ahora</button>
                </div>
            ) : (
                <div className="projects-grid">
                    {projects.map(project => (
                        <ProjectCard
                            key={project.id}
                            id={project.id}
                            name={project.raw_data?.name || 'Estimación de Obra'}
                            status={project.status}
                            lastModified={project.updated_at || project.created_at}
                            onClick={() => onProjectClick(project.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

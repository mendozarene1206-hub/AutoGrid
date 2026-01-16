import React from 'react';

interface UploadProgressProps {
    /** Current phase description */
    phase: string;
    /** Progress percentage (0-100) */
    percent: number;
    /** Whether to show the overlay */
    isVisible: boolean;
}

/**
 * UploadProgress - Visual progress overlay for Excel file uploads
 * 
 * Shows phases:
 * - 📄 Leyendo archivo
 * - 🔄 Procesando celdas
 * - 🖼️ Subiendo imágenes
 * - ✅ Completado
 */
export const UploadProgress: React.FC<UploadProgressProps> = ({
    phase,
    percent,
    isVisible
}) => {
    if (!isVisible) return null;

    return (
        <div className="upload-progress-overlay">
            <div className="upload-progress-card glassmorphism">
                <div className="upload-progress-icon">
                    {percent < 100 ? (
                        <div className="spinner-large" />
                    ) : (
                        <span className="success-icon">✅</span>
                    )}
                </div>

                <h3>Cargando Estimación</h3>

                <div className="progress-bar-container">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${percent}%` }}
                    />
                </div>

                <p className="progress-phase">{phase}</p>
                <p className="progress-percent">{Math.round(percent)}%</p>
            </div>
        </div>
    );
};

export default UploadProgress;

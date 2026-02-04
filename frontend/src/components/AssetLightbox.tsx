/**
 * AssetLightbox Component
 * 
 * Full-screen modal for viewing assets at full size.
 * Supports navigation between multiple assets with keyboard shortcuts.
 * 
 * Boris Cherny Tips Applied:
 * - Challenge Mode: Keyboard navigation, backdrop click to close
 * - Prove It Works: Loading states, error handling
 * - Elegant Solution: Clean modal structure
 * - Detailed Specs: Full TypeScript types
 */

import React, { useEffect, useCallback, useState } from 'react';
import type { AssetLightboxProps, TrojanAsset } from '../types/trojanAssets';

// ========================
// Helper Components
// ========================

interface LightboxImageProps {
    asset: TrojanAsset;
    onLoad: () => void;
    onError: () => void;
}

const LightboxImage: React.FC<LightboxImageProps> = ({ asset, onLoad, onError }) => {
    const [isLoading, setIsLoading] = useState(true);
    
    const handleLoad = useCallback(() => {
        setIsLoading(false);
        onLoad();
    }, [onLoad]);
    
    const handleError = useCallback(() => {
        setIsLoading(false);
        onError();
    }, [onError]);
    
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {isLoading && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                    }}
                >
                    <div
                        style={{
                            width: 48,
                            height: 48,
                            border: '4px solid rgba(255,255,255,0.3)',
                            borderTopColor: 'white',
                            borderRadius: '50%',
                            animation: 'asset-lightbox-spin 1s linear infinite',
                        }}
                    />
                </div>
            )}
            <img
                src={asset.signedUrl}
                alt={asset.originalName}
                style={{
                    maxWidth: '90vw',
                    maxHeight: '85vh',
                    objectFit: 'contain',
                    opacity: isLoading ? 0 : 1,
                    transition: 'opacity 0.3s ease',
                }}
                onLoad={handleLoad}
                onError={handleError}
            />
        </div>
    );
};

// ========================
// Main Component
// ========================

export const AssetLightbox: React.FC<AssetLightboxProps> = ({
    assets,
    currentIndex,
    onClose,
    onNext,
    onPrev,
}) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    
    const currentAsset = assets[currentIndex];
    const totalAssets = assets.length;
    const hasNext = currentIndex < totalAssets - 1;
    const hasPrev = currentIndex > 0;
    
    // Reset states when asset changes
    useEffect(() => {
        setImageLoaded(false);
        setImageError(false);
    }, [currentIndex]);
    
    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowRight':
                    if (hasNext) onNext();
                    break;
                case 'ArrowLeft':
                    if (hasPrev) onPrev();
                    break;
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden'; // Prevent body scroll
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [onClose, onNext, onPrev, hasNext, hasPrev]);
    
    // Handle backdrop click
    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);
    
    if (!currentAsset) return null;
    
    const isPhoto = currentAsset.type === 'photo' || currentAsset.type === 'detail';
    
    return (
        <div
            className="asset-lightbox"
            onClick={handleBackdropClick}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                backdropFilter: 'blur(4px)',
            }}
        >
            {/* Close Button */}
            <button
                className="asset-lightbox__close"
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: 'white',
                    fontSize: 24,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s',
                    zIndex: 1001,
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                aria-label="Cerrar"
                title="Cerrar (Esc)"
            >
                ✕
            </button>
            
            {/* Navigation - Previous */}
            {hasPrev && (
                <button
                    className="asset-lightbox__nav asset-lightbox__nav--prev"
                    onClick={onPrev}
                    style={{
                        position: 'absolute',
                        left: 16,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        color: 'white',
                        fontSize: 32,
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s',
                        zIndex: 1001,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }}
                    aria-label="Anterior"
                    title="Anterior (←)"
                >
                    ‹
                </button>
            )}
            
            {/* Navigation - Next */}
            {hasNext && (
                <button
                    className="asset-lightbox__nav asset-lightbox__nav--next"
                    onClick={onNext}
                    style={{
                        position: 'absolute',
                        right: 16,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        color: 'white',
                        fontSize: 32,
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s',
                        zIndex: 1001,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }}
                    aria-label="Siguiente"
                    title="Siguiente (→)"
                >
                    ›
                </button>
            )}
            
            {/* Content */}
            <div
                className="asset-lightbox__content"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                }}
            >
                {/* Image or Document */}
                {isPhoto ? (
                    !imageLoaded && !imageError ? (
                        <div style={{ color: 'white', padding: 40, textAlign: 'center' }}>
                            <div style={{ 
                                width: 40, 
                                height: 40, 
                                border: '3px solid rgba(255,255,255,0.3)',
                                borderTop: '3px solid white',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                margin: '0 auto 16px'
                            }} />
                            <div>Cargando...</div>
                        </div>
                    ) : imageError ? (
                        <div
                            style={{
                                color: 'white',
                                textAlign: 'center',
                                padding: 40,
                            }}
                        >
                            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                            <div>Error al cargar la imagen</div>
                        </div>
                    ) : (
                        <LightboxImage
                            asset={currentAsset}
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageError(true)}
                        />
                    )
                ) : (
                    <div
                        style={{
                            background: 'white',
                            padding: 40,
                            borderRadius: 8,
                            textAlign: 'center',
                            minWidth: 300,
                        }}
                    >
                        <div style={{ fontSize: 64, marginBottom: 16 }}>
                            {currentAsset.type === 'generator' ? '⚙️' : '📄'}
                        </div>
                        <div style={{ fontWeight: 500, marginBottom: 8 }}>
                            {currentAsset.originalName}
                        </div>
                        <div style={{ color: '#64748b', fontSize: 14 }}>
                            {currentAsset.type === 'generator' ? 'Generador' : 'Especificación'}
                        </div>
                        <a
                            href={currentAsset.signedUrl}
                            download={currentAsset.originalName}
                            style={{
                                display: 'inline-block',
                                marginTop: 16,
                                padding: '8px 16px',
                                background: '#3b82f6',
                                color: 'white',
                                textDecoration: 'none',
                                borderRadius: 6,
                                fontSize: 14,
                            }}
                        >
                            Descargar
                        </a>
                    </div>
                )}
                
                {/* Info Footer */}
                <div
                    className="asset-lightbox__info"
                    style={{
                        marginTop: 16,
                        color: 'rgba(255, 255, 255, 0.8)',
                        textAlign: 'center',
                    }}
                >
                    <div style={{ fontSize: 14, marginBottom: 4 }}>
                        {currentAsset.originalName}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {currentIndex + 1} de {totalAssets} • {' '}
                        {currentAsset.width && currentAsset.height
                            ? `${currentAsset.width}×${currentAsset.height}px • `
                            : ''}
                        {(currentAsset.sizeBytes / 1024).toFixed(1)} KB
                    </div>
                </div>
            </div>
            
            {/* Thumbnail Strip */}
            {totalAssets > 1 && (
                <div
                    className="asset-lightbox__strip"
                    style={{
                        position: 'absolute',
                        bottom: 80,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: 8,
                        padding: 8,
                        background: 'rgba(0, 0, 0, 0.5)',
                        borderRadius: 8,
                        overflowX: 'auto',
                        maxWidth: '80vw',
                    }}
                >
                    {assets.map((asset, index) => (
                        <button
                            key={asset.id}
                            onClick={() => {
                                if (index < currentIndex) {
                                    for (let i = currentIndex; i > index; i--) onPrev();
                                } else if (index > currentIndex) {
                                    for (let i = currentIndex; i < index; i++) onNext();
                                }
                            }}
                            style={{
                                width: 48,
                                height: 48,
                                border: index === currentIndex ? '2px solid #3b82f6' : '2px solid transparent',
                                borderRadius: 4,
                                overflow: 'hidden',
                                cursor: 'pointer',
                                padding: 0,
                                background: 'none',
                                opacity: index === currentIndex ? 1 : 0.6,
                            }}
                            aria-label={`Ir a ${asset.originalName}`}
                        >
                            {asset.type === 'photo' || asset.type === 'detail' ? (
                                <img
                                    src={asset.signedUrl}
                                    alt=""
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: '#f8fafc',
                                        fontSize: 20,
                                    }}
                                >
                                    {asset.type === 'generator' ? '⚙️' : '📄'}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// Display name for debugging
AssetLightbox.displayName = 'AssetLightbox';

export default AssetLightbox;

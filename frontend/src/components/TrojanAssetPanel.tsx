/**
 * TrojanAssetPanel Component
 * 
 * Side panel for displaying assets (photos, generators, specs) associated with
 * a selected concept from the TrojanTreeView.
 * 
 * Features:
 * - Tabbed interface for different asset types
 * - Lazy loading thumbnails with Intersection Observer
 * - Lightbox for full-size photo viewing
 * - Pagination support
 * - Slide-in animation
 * 
 * Boris Cherny Tips Applied:
 * - Challenge Mode: Lazy loading, signed URL refresh, keyboard navigation
 * - Prove It Works: Structured logs, skeleton states, error handling
 * - Elegant Solution: Custom hook separation, reusable components
 * - Detailed Specs: Full TypeScript types, documented props
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAssets } from '../hooks/useAssets';
import { AssetThumbnail } from './AssetThumbnail';
import { AssetLightbox } from './AssetLightbox';
import type {
    TrojanAssetPanelProps,
    TrojanAsset,
    AssetTab,
    AssetTabConfig,
} from '../types/trojanAssets';
import './TrojanAssetPanel.css';

// ========================
// Logger Utility
// ========================

const LOG_PREFIX = '[TrojanAssetPanel]';

interface LogContext {
    estimationId: string;
    conceptCode?: string | null;
    [key: string]: unknown;
}

function logInfo(message: string, context: LogContext): void {
    // eslint-disable-next-line no-console
    console.log(`${LOG_PREFIX} ${message}`, context);
}

function _logWarn(message: string, context: LogContext & { warning: string }): void {
    // eslint-disable-next-line no-console
    console.warn(`${LOG_PREFIX} ${message}`, context);
}

function _logError(message: string, context: LogContext & { error: unknown }): void {
    // eslint-disable-next-line no-console
    console.error(`${LOG_PREFIX} ${message}`, context);
}

// ========================
// Helper Components
// ========================

/** Empty state placeholder */
const EmptyState: React.FC<{ message: string; icon?: string }> = ({ message, icon = '📂' }) => (
    <div className="asset-panel__empty">
        <span className="asset-panel__empty-icon">{icon}</span>
        <span className="asset-panel__empty-text">{message}</span>
    </div>
);

/** Loading skeleton grid */
const SkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
    <div className="asset-panel__skeleton-grid">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="asset-panel__skeleton-item" />
        ))}
    </div>
);

/** Tab button component */
const TabButton: React.FC<{
    config: AssetTabConfig;
    isActive: boolean;
    onClick: () => void;
}> = ({ config, isActive, onClick }) => (
    <button
        className={`asset-panel__tab ${isActive ? 'asset-panel__tab--active' : ''}`}
        onClick={onClick}
        aria-selected={isActive}
        role="tab"
    >
        <span className="asset-panel__tab-icon">{config.icon}</span>
        <span className="asset-panel__tab-label">{config.label}</span>
        {config.count > 0 && (
            <span className="asset-panel__tab-count">{config.count}</span>
        )}
    </button>
);

// ========================
// Main Component
// ========================

export const TrojanAssetPanel: React.FC<TrojanAssetPanelProps> = ({
    estimationId,
    conceptCode,
    isOpen,
    onClose,
    onAssetClick,
}) => {
    // Active tab state
    const [activeTab, setActiveTab] = useState<AssetTab>('photos');
    
    // Lightbox state
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    
    // Fetch assets
    const {
        assets,
        grouped,
        isLoading,
        isLoadingMore,
        error,
        pagination,
        loadMore,
        refresh,
        isRefreshing,
    } = useAssets(estimationId, conceptCode, { limit: 20 });
    
    // Log when concept changes
    useEffect(() => {
        if (conceptCode) {
            logInfo('Concept selected', {
                estimationId,
                conceptCode,
                previousTab: activeTab,
            });
            // Reset to photos tab when concept changes
            setActiveTab('photos');
        }
    }, [conceptCode, estimationId]);
    
    // Log when assets load
    useEffect(() => {
        if (!isLoading && assets.length > 0) {
            logInfo(`Loaded ${assets.length} assets`, {
                estimationId,
                conceptCode,
                photos: grouped.photos.length,
                generators: grouped.generators.length,
                specs: grouped.specs.length,
                details: grouped.details.length,
            });
        }
    }, [assets.length, isLoading, estimationId, conceptCode, grouped]);
    
    // Tab configurations
    const tabs: AssetTabConfig[] = useMemo(() => [
        { id: 'photos', label: 'Fotos', icon: '📷', assetType: 'photo', count: grouped.photos.length + grouped.details.length },
        { id: 'generators', label: 'Generadores', icon: '⚙️', assetType: 'generator', count: grouped.generators.length },
        { id: 'specs', label: 'Especificaciones', icon: '📄', assetType: 'spec', count: grouped.specs.length },
    ], [grouped]);
    
    // Get assets for current tab
    const currentAssets = useMemo(() => {
        switch (activeTab) {
            case 'photos':
                return [...grouped.photos, ...grouped.details];
            case 'generators':
                return grouped.generators;
            case 'specs':
                return grouped.specs;
            default:
                return [];
        }
    }, [activeTab, grouped]);
    
    // Handle asset click
    const handleAssetClick = useCallback((asset: TrojanAsset) => {
        // Find index in current tab's assets
        const index = currentAssets.findIndex(a => a.id === asset.id);
        if (index !== -1) {
            setLightboxIndex(index);
            setLightboxOpen(true);
        }
        
        if (onAssetClick) {
            onAssetClick(asset);
        }
    }, [currentAssets, onAssetClick]);
    
    // Lightbox navigation
    const handleLightboxNext = useCallback(() => {
        setLightboxIndex(prev => Math.min(prev + 1, currentAssets.length - 1));
    }, [currentAssets.length]);
    
    const handleLightboxPrev = useCallback(() => {
        setLightboxIndex(prev => Math.max(prev - 1, 0));
    }, []);
    
    const handleLightboxClose = useCallback(() => {
        setLightboxOpen(false);
    }, []);
    
    // Handle tab change
    const handleTabChange = useCallback((tab: AssetTab) => {
        setActiveTab(tab);
        logInfo(`Tab changed to ${tab}`, {
            estimationId,
            conceptCode,
        });
    }, [estimationId, conceptCode]);
    
    // Render closed state
    if (!isOpen) {
        return (
            <button
                className="asset-panel__toggle"
                onClick={onClose}
                title="Abrir panel de assets"
                aria-label="Abrir panel de assets"
            >
                📎
            </button>
        );
    }
    
    // Render placeholder when no concept selected
    if (!conceptCode) {
        return (
            <aside className="asset-panel asset-panel--open">
                <div className="asset-panel__header">
                    <h3 className="asset-panel__title">
                        <span className="asset-panel__title-icon">📎</span>
                        Assets
                    </h3>
                    <button
                        className="asset-panel__close"
                        onClick={onClose}
                        aria-label="Cerrar panel"
                    >
                        ✕
                    </button>
                </div>
                <div className="asset-panel__content">
                    <EmptyState
                        message="Selecciona un concepto del árbol para ver sus assets"
                        icon="🌳"
                    />
                </div>
            </aside>
        );
    }
    
    return (
        <>
            <aside className="asset-panel asset-panel--open">
                {/* Header */}
                <div className="asset-panel__header">
                    <h3 className="asset-panel__title">
                        <span className="asset-panel__title-icon">📎</span>
                        <span className="asset-panel__title-code" title={conceptCode}>
                            {conceptCode}
                        </span>
                    </h3>
                    <button
                        className="asset-panel__close"
                        onClick={onClose}
                        aria-label="Cerrar panel"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Tabs */}
                <div className="asset-panel__tabs" role="tablist">
                    {tabs.map(tab => (
                        <TabButton
                            key={tab.id}
                            config={tab}
                            isActive={activeTab === tab.id}
                            onClick={() => handleTabChange(tab.id)}
                        />
                    ))}
                </div>
                
                {/* Content */}
                <div className="asset-panel__content">
                    {/* Loading State */}
                    {isLoading && !isRefreshing && (
                        <SkeletonGrid count={6} />
                    )}
                    
                    {/* Error State */}
                    {error && !isLoading && (
                        <div className="asset-panel__error">
                            <span className="asset-panel__error-icon">⚠️</span>
                            <span className="asset-panel__error-message">{error}</span>
                            <button
                                className="asset-panel__retry-btn"
                                onClick={() => refresh()}
                                disabled={isRefreshing}
                            >
                                {isRefreshing ? 'Reintentando...' : 'Reintentar'}
                            </button>
                        </div>
                    )}
                    
                    {/* Empty State */}
                    {!isLoading && !error && currentAssets.length === 0 && (
                        <EmptyState
                            message={`No hay ${
                                activeTab === 'photos' ? 'fotos' :
                                activeTab === 'generators' ? 'generadores' :
                                'especificaciones'
                            } para este concepto`}
                        />
                    )}
                    
                    {/* Asset Grid */}
                    {!isLoading && !error && currentAssets.length > 0 && (
                        <>
                            <div className="asset-panel__grid">
                                {currentAssets.map(asset => (
                                    <AssetThumbnail
                                        key={asset.id}
                                        asset={asset}
                                        size="medium"
                                        onClick={handleAssetClick}
                                    />
                                ))}
                            </div>
                            
                            {/* Load More */}
                            {pagination?.hasMore && (
                                <button
                                    className="asset-panel__load-more"
                                    onClick={loadMore}
                                    disabled={isLoadingMore}
                                >
                                    {isLoadingMore ? (
                                        <>
                                            <span className="asset-panel__spinner" />
                                            Cargando...
                                        </>
                                    ) : (
                                        `+ Cargar más (${pagination.total - currentAssets.length} restantes)`
                                    )}
                                </button>
                            )}
                        </>
                    )}
                </div>
                
                {/* Footer */}
                <div className="asset-panel__footer">
                    {pagination && (
                        <span className="asset-panel__summary">
                            {grouped.photos.length + grouped.details.length} fotos
                            {grouped.generators.length > 0 && `, ${grouped.generators.length} generadores`}
                            {grouped.specs.length > 0 && `, ${grouped.specs.length} especificaciones`}
                        </span>
                    )}
                    {isRefreshing && (
                        <span className="asset-panel__refreshing">
                            <span className="asset-panel__spinner asset-panel__spinner--small" />
                            Actualizando...
                        </span>
                    )}
                </div>
            </aside>
            
            {/* Lightbox */}
            {lightboxOpen && (
                <AssetLightbox
                    assets={currentAssets}
                    currentIndex={lightboxIndex}
                    onClose={handleLightboxClose}
                    onNext={handleLightboxNext}
                    onPrev={handleLightboxPrev}
                />
            )}
        </>
    );
};

// Display name for debugging
TrojanAssetPanel.displayName = 'TrojanAssetPanel';

export default TrojanAssetPanel;

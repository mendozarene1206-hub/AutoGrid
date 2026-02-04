/**
 * AssetThumbnail Component
 * 
 * Lazy-loading thumbnail component for Trojan assets.
 * Uses Intersection Observer for efficient loading.
 * 
 * Boris Cherny Tips Applied:
 * - Challenge Mode: Lazy loading with Intersection Observer
 * - Prove It Works: Error states, loading skeleton
 * - Elegant Solution: Clean separation of concerns
 * - Detailed Specs: Full TypeScript types
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { AssetThumbnailProps } from '../types/trojanAssets';

// ========================
// Constants
// ========================

const SIZES = {
    small: { width: 80, height: 80 },
    medium: { width: 100, height: 100 },
    large: { width: 150, height: 150 },
};

const PLACEHOLDER_BG = '#f3f4f6';

// ========================
// Component
// ========================

export const AssetThumbnail: React.FC<AssetThumbnailProps> = ({
    asset,
    size = 'medium',
    onClick,
    className = '',
}) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    
    const { width, height } = SIZES[size];
    
    // Intersection Observer for lazy loading
    useEffect(() => {
        const element = imgRef.current;
        if (!element) return;
        
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            {
                rootMargin: '50px', // Start loading 50px before visible
                threshold: 0.1,
            }
        );
        
        observer.observe(element);
        
        return () => {
            observer.disconnect();
        };
    }, []);
    
    // Handle load success
    const handleLoad = useCallback(() => {
        setIsLoaded(true);
        setHasError(false);
    }, []);
    
    // Handle load error
    const handleError = useCallback(() => {
        setHasError(true);
        setIsLoaded(false);
    }, []);
    
    // Handle click
    const handleClick = useCallback(() => {
        if (onClick) {
            onClick(asset);
        }
    }, [asset, onClick]);
    
    // Get aspect ratio for object-fit
    const aspectRatio = asset.width && asset.height
        ? `${asset.width} / ${asset.height}`
        : '1 / 1';
    
    // Determine if this is a photo type
    const isPhoto = asset.type === 'photo' || asset.type === 'detail';
    
    return (
        <div
            className={`asset-thumbnail asset-thumbnail--${size} ${className}`}
            style={{
                width,
                height: isPhoto ? 'auto' : height,
                minHeight: height,
                aspectRatio: isPhoto ? aspectRatio : undefined,
            }}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    handleClick();
                }
            }}
            aria-label={`${asset.type}: ${asset.originalName}`}
        >
            {/* Skeleton / Placeholder */}
            {!isLoaded && !hasError && (
                <div
                    className="asset-thumbnail__skeleton"
                    style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: PLACEHOLDER_BG,
                        borderRadius: 8,
                        animation: 'asset-thumbnail-pulse 1.5s ease-in-out infinite',
                    }}
                />
            )}
            
            {/* Error State */}
            {hasError && (
                <div
                    className="asset-thumbnail__error"
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#fef2f2',
                        borderRadius: 8,
                        border: '1px solid #fecaca',
                        color: '#ef4444',
                        fontSize: 24,
                    }}
                    title={`Error loading: ${asset.originalName}`}
                >
                    ⚠️
                </div>
            )}
            
            {/* Actual Image */}
            {isVisible && isPhoto && (
                <img
                    ref={imgRef}
                    src={asset.signedUrl}
                    alt={asset.originalName}
                    className="asset-thumbnail__image"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: 8,
                        opacity: isLoaded ? 1 : 0,
                        transition: 'opacity 0.2s ease',
                        cursor: onClick ? 'pointer' : 'default',
                    }}
                    onLoad={handleLoad}
                    onError={handleError}
                    loading="lazy"
                />
            )}
            
            {/* Document/Generator Icon */}
            {isVisible && !isPhoto && (
                <div
                    className="asset-thumbnail__doc"
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f8fafc',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        cursor: onClick ? 'pointer' : 'default',
                    }}
                >
                    <span style={{ fontSize: 32, marginBottom: 4 }}>
                        {asset.type === 'generator' ? '⚙️' : '📄'}
                    </span>
                    <span
                        style={{
                            fontSize: 10,
                            color: '#64748b',
                            textAlign: 'center',
                            padding: '0 4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                        }}
                        title={asset.originalName}
                    >
                        {asset.originalName.length > 20
                            ? `${asset.originalName.slice(0, 17)}...`
                            : asset.originalName}
                    </span>
                </div>
            )}
        </div>
    );
};

// Display name for debugging
AssetThumbnail.displayName = 'AssetThumbnail';

export default AssetThumbnail;

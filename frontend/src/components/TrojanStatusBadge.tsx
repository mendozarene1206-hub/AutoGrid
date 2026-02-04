/**
 * TrojanStatusBadge.tsx
 * 
 * Status badge component with inline styles for TrojanUniverGrid.
 * Supports DRAFT, IN_REVIEW, APPROVED, SIGNED statuses with semantic colors.
 * 
 * Boris Cherny Tips Applied:
 * - Challenge Mode: Handles unknown statuses gracefully
 * - Prove It Works: Visual indicators with consistent styling
 * - Elegant Solution: Pure presentational component, single responsibility
 * - Detailed Specs: Strict TypeScript, documented props
 */

import React from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type StatusType = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SIGNED';

export interface StatusBadgeProps {
    status: string;
    size?: 'sm' | 'md' | 'lg';
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_COLORS: Record<StatusType, { bg: string; text: string; border: string }> = {
    DRAFT: {
        bg: '#f3f4f6',
        text: '#6b7280',
        border: '#d1d5db',
    },
    IN_REVIEW: {
        bg: '#fef3c7',
        text: '#d97706',
        border: '#fbbf24',
    },
    APPROVED: {
        bg: '#d1fae5',
        text: '#059669',
        border: '#34d399',
    },
    SIGNED: {
        bg: '#dbeafe',
        text: '#2563eb',
        border: '#60a5fa',
    },
};

const SIZE_STYLES: Record<NonNullable<StatusBadgeProps['size']>, { padding: string; fontSize: string; height: string }> = {
    sm: {
        padding: '2px 8px',
        fontSize: '10px',
        height: '20px',
    },
    md: {
        padding: '4px 12px',
        fontSize: '12px',
        height: '24px',
    },
    lg: {
        padding: '6px 16px',
        fontSize: '14px',
        height: '28px',
    },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function normalizeStatus(status: string): StatusType {
    const normalized = status.toUpperCase().replace(/\s+/g, '_');
    
    if (normalized in STATUS_COLORS) {
        return normalized as StatusType;
    }
    
    // Fallback mappings for common variations
    if (normalized === 'REVIEW' || normalized === 'INREVIEW') {
        return 'IN_REVIEW';
    }
    
    // Default to DRAFT for unknown statuses
    return 'DRAFT';
}

function formatDisplayText(status: StatusType): string {
    return status.replace('_', ' ');
}

// =============================================================================
// COMPONENT
// =============================================================================

export const TrojanStatusBadge: React.FC<StatusBadgeProps> = ({ 
    status, 
    size = 'md' 
}) => {
    const normalizedStatus = normalizeStatus(status);
    const colors = STATUS_COLORS[normalizedStatus];
    const sizeStyles = SIZE_STYLES[size];

    const containerStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: sizeStyles.padding,
        fontSize: sizeStyles.fontSize,
        fontWeight: 600,
        height: sizeStyles.height,
        lineHeight: '1',
        borderRadius: '9999px', // Full rounded
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        textTransform: 'uppercase',
        letterSpacing: '0.025em',
    };

    return (
        <span style={containerStyle}>
            {formatDisplayText(normalizedStatus)}
        </span>
    );
};

// Convenience export for common sizes
export const SmallStatusBadge: React.FC<Omit<StatusBadgeProps, 'size'>> = (props) => (
    <TrojanStatusBadge {...props} size="sm" />
);

export const LargeStatusBadge: React.FC<Omit<StatusBadgeProps, 'size'>> = (props) => (
    <TrojanStatusBadge {...props} size="lg" />
);

export default TrojanStatusBadge;

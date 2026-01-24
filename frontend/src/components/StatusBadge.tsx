/**
 * StatusBadge.tsx
 * 
 * Status pill with semantic colors.
 * DRAFT (gray), LOCKING (amber), IN_REVIEW (blue), APPROVED (green), REJECTED (red)
 */

import React from 'react';

interface StatusBadgeProps {
    status: string;
}

const statusStyles: Record<string, string> = {
    'draft': 'badge-draft',
    'locking': 'badge-locking',
    'in_review': 'badge-review',
    'approved': 'badge-approved',
    'rejected': 'badge-rejected',
    'signed': 'badge-approved',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const normalizedStatus = status?.toLowerCase() || 'draft';
    const styleClass = statusStyles[normalizedStatus] || 'badge-draft';
    const displayText = normalizedStatus.replace('_', ' ').toUpperCase();

    return (
        <div className={`status-badge ${styleClass}`}>
            {displayText}
        </div>
    );
};

export default StatusBadge;

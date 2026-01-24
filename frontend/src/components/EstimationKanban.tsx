/**
 * EstimationKanban.tsx
 * 
 * Kanban board for tracking estimation workflow.
 * Columns: TODO (not submitted), REVIEW (being reviewed), AUTHORIZED (completed)
 */

import React from 'react';

interface Estimation {
    id: string;
    projectName?: string;
    contractorName?: string;
    totalAmount?: number;
    status: string | null;
    updatedAt?: string;
}

interface EstimationKanbanProps {
    estimations: Estimation[];
    onCardClick?: (estimation: Estimation) => void;
}

type KanbanColumn = 'todo' | 'review' | 'authorized';

const columnConfig: Record<KanbanColumn, { title: string; statuses: (string | null)[] }> = {
    todo: {
        title: 'TODO',
        statuses: [null, 'pending', 'draft']
    },
    review: {
        title: 'REVIEW',
        statuses: ['in_review', 'locking']
    },
    authorized: {
        title: 'AUTHORIZED',
        statuses: ['approved', 'completed', 'signed']
    }
};

export const EstimationKanban: React.FC<EstimationKanbanProps> = ({
    estimations,
    onCardClick
}) => {
    const getEstimationsForColumn = (column: KanbanColumn): Estimation[] => {
        const { statuses } = columnConfig[column];
        return estimations.filter(e => statuses.includes(e.status));
    };

    const formatAmount = (amount?: number): string => {
        if (!amount) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const getInitials = (name?: string): string => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const renderColumn = (column: KanbanColumn) => {
        const items = getEstimationsForColumn(column);
        const { title } = columnConfig[column];

        return (
            <div key={column} className={`kanban-column ${column}`}>
                <div className="kanban-column-header">
                    <span className="column-title">{title}</span>
                    <span className="column-count">{items.length}</span>
                </div>
                <div className="kanban-column-body">
                    {items.length === 0 ? (
                        <div className="kanban-empty">
                            <span>📭</span>
                            <p>No estimations</p>
                        </div>
                    ) : (
                        items.map(item => (
                            <div
                                key={item.id}
                                className="kanban-card"
                                onClick={() => onCardClick?.(item)}
                            >
                                <div className="kanban-card-code">
                                    EST-{item.id.slice(0, 8).toUpperCase()}
                                </div>
                                <div className="kanban-card-title">
                                    {item.projectName || 'Unnamed Project'}
                                </div>
                                <div className="kanban-card-footer">
                                    <span className="kanban-card-amount">
                                        {formatAmount(item.totalAmount)}
                                    </span>
                                    <div className="kanban-card-avatars">
                                        <div className="kanban-avatar">
                                            {getInitials(item.contractorName)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="kanban-container">
            {(['todo', 'review', 'authorized'] as KanbanColumn[]).map(renderColumn)}
        </div>
    );
};

export default EstimationKanban;

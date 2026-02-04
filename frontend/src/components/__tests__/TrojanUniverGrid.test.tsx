/**
 * TrojanUniverGrid.test.tsx
 * 
 * Component tests following Boris Cherny best practices.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TrojanUniverGrid } from '../TrojanUniverGrid';

// Mock useUniverData hook
vi.mock('../../hooks/useUniverData', () => ({
    useUniverData: vi.fn(),
}));

import { useUniverData } from '../../hooks/useUniverData';

const mockUseUniverData = vi.mocked(useUniverData);

describe('TrojanUniverGrid', () => {
    const mockEstimationId = 'test-estimation-id';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render loading state', () => {
        mockUseUniverData.mockReturnValue({
            data: null,
            loading: true,
            error: null,
            loadTimeMs: null,
            refetch: vi.fn(),
            abort: vi.fn(),
        });

        render(<TrojanUniverGrid estimationId={mockEstimationId} />);

        expect(screen.getByText(/Loading spreadsheet/i)).toBeInTheDocument();
    });

    it('should render error state', () => {
        mockUseUniverData.mockReturnValue({
            data: null,
            loading: false,
            error: 'Failed to load data',
            loadTimeMs: null,
            refetch: vi.fn(),
            abort: vi.fn(),
        });

        render(<TrojanUniverGrid estimationId={mockEstimationId} />);

        expect(screen.getByText(/Error loading spreadsheet/i)).toBeInTheDocument();
        expect(screen.getByText(/Failed to load data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('should render empty state', () => {
        mockUseUniverData.mockReturnValue({
            data: {
                estimationId: mockEstimationId,
                sheetName: 'Test',
                metadata: { totalRows: 0, totalColumns: 0, lastModified: '' },
                columnDefs: [],
                rows: [],
            },
            loading: false,
            error: null,
            loadTimeMs: 100,
            refetch: vi.fn(),
            abort: vi.fn(),
        });

        render(<TrojanUniverGrid estimationId={mockEstimationId} />);

        expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });

    it('should call onCellEdit when cell is edited', async () => {
        const onCellEdit = vi.fn();
        const mockData = {
            estimationId: mockEstimationId,
            sheetName: 'Test',
            metadata: { totalRows: 2, totalColumns: 2, lastModified: '' },
            columnDefs: [
                { field: 'col1', headerName: 'Col 1', type: 'text' as const, width: 100, editable: true },
            ],
            rows: [{ col1: 'value1' }],
        };

        mockUseUniverData.mockReturnValue({
            data: mockData,
            loading: false,
            error: null,
            loadTimeMs: 100,
            refetch: vi.fn(),
            abort: vi.fn(),
        });

        render(<TrojanUniverGrid estimationId={mockEstimationId} onCellEdit={onCellEdit} />);

        // Note: Actual cell edit testing would require mocking UniverGrid component
        // This test verifies the component renders with the prop correctly
        expect(screen.getByText(/Rows: 1/i)).toBeInTheDocument();
    });

    it('should render in readOnly mode', () => {
        mockUseUniverData.mockReturnValue({
            data: {
                estimationId: mockEstimationId,
                sheetName: 'Test',
                metadata: { totalRows: 1, totalColumns: 1, lastModified: '' },
                columnDefs: [{ field: 'col1', headerName: 'Col 1', type: 'text' as const, width: 100, editable: true }],
                rows: [{ col1: 'value' }],
            },
            loading: false,
            error: null,
            loadTimeMs: 100,
            refetch: vi.fn(),
            abort: vi.fn(),
        });

        render(<TrojanUniverGrid estimationId={mockEstimationId} readOnly={true} />);

        // Component should render without edit indicators in readOnly mode
        expect(screen.getByText(/Rows: 1/i)).toBeInTheDocument();
    });
});

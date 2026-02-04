/**
 * useUniverData.test.ts
 * 
 * Tests for useUniverData hook with retry logic.
 * Following Boris Cherny: "Prove It Works"
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUniverData } from '../useUniverData';

// Mock fetchWithRetry
vi.mock('../../lib/fetchWithRetry', () => ({
    fetchJsonWithRetry: vi.fn(),
}));

import { fetchJsonWithRetry } from '../../lib/fetchWithRetry';

const mockFetchJsonWithRetry = vi.mocked(fetchJsonWithRetry);

describe('useUniverData', () => {
    const mockEstimationId = 'test-estimation-id';
    const mockData = {
        success: true,
        data: {
            estimationId: mockEstimationId,
            sheetName: 'Test Sheet',
            metadata: {
                totalRows: 10,
                totalColumns: 5,
                lastModified: '2026-01-01T00:00:00Z',
            },
            columnDefs: [
                { field: 'col1', headerName: 'Column 1', type: 'text', width: 100, editable: true },
            ],
            rows: [{ col1: 'value1', _conceptCode: '1.1' }],
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should start with initial state', () => {
        const { result } = renderHook(() => useUniverData(mockEstimationId));

        expect(result.current.data).toBeNull();
        expect(result.current.loading).toBe(true); // Starts loading immediately
        expect(result.current.error).toBeNull();
        expect(result.current.loadTimeMs).toBeNull();
    });

    it('should return null data when estimationId is null', () => {
        const { result } = renderHook(() => useUniverData(null));

        expect(result.current.data).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('should fetch data successfully', async () => {
        mockFetchJsonWithRetry.mockResolvedValueOnce({
            data: mockData,
            attempts: 1,
            totalDelayMs: 0,
        });

        const { result } = renderHook(() => useUniverData(mockEstimationId));

        // Wait for loading to complete
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.data).toEqual(mockData.data);
        expect(result.current.error).toBeNull();
        expect(result.current.loadTimeMs).toBeGreaterThanOrEqual(0);
        expect(mockFetchJsonWithRetry).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch error', async () => {
        mockFetchJsonWithRetry.mockRejectedValueOnce(new Error('Network error'));

        const { result } = renderHook(() => useUniverData(mockEstimationId));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.data).toBeNull();
        expect(result.current.error).toBe('Network error');
    });

    it('should handle API error response', async () => {
        mockFetchJsonWithRetry.mockResolvedValueOnce({
            data: {
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Estimation not found',
                    timestamp: '2026-01-01T00:00:00Z',
                    requestId: 'req-123',
                },
            },
            attempts: 1,
            totalDelayMs: 0,
        });

        const { result } = renderHook(() => useUniverData(mockEstimationId));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toContain('NOT_FOUND');
        expect(result.current.error).toContain('Estimation not found');
    });

    it('should refetch data when called', async () => {
        mockFetchJsonWithRetry
            .mockResolvedValueOnce({
                data: mockData,
                attempts: 1,
                totalDelayMs: 0,
            })
            .mockResolvedValueOnce({
                data: { ...mockData, data: { ...mockData.data, sheetName: 'Updated Sheet' } },
                attempts: 1,
                totalDelayMs: 0,
            });

        const { result } = renderHook(() => useUniverData(mockEstimationId));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.data?.sheetName).toBe('Test Sheet');

        // Refetch
        await result.current.refetch();

        await waitFor(() => expect(result.current.data?.sheetName).toBe('Updated Sheet'));
        expect(mockFetchJsonWithRetry).toHaveBeenCalledTimes(2);
    });

    it('should track retry attempts in logs', async () => {
        mockFetchJsonWithRetry.mockResolvedValueOnce({
            data: mockData,
            attempts: 3, // Success after 3 attempts
            totalDelayMs: 3000,
        });

        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        const { result } = renderHook(() => useUniverData(mockEstimationId));

        await waitFor(() => expect(result.current.loading).toBe(false));

        // Verify retry was logged
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('[useUniverData]'),
            expect.anything()
        );

        consoleSpy.mockRestore();
    });
});

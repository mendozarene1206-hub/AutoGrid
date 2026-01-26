/**
 * useGridKeyboardShortcuts.test.ts
 * 
 * Unit tests for keyboard shortcuts hook and WBS detection utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGridKeyboardShortcuts, detectWBSLevel, parseCellReference } from './useGridKeyboardShortcuts';

describe('useGridKeyboardShortcuts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize with showHelp as false', () => {
        const { result } = renderHook(() =>
            useGridKeyboardShortcuts({ univerAPI: null, enabled: true })
        );

        expect(result.current.showHelp).toBe(false);
    });

    it('should provide a list of shortcuts', () => {
        const { result } = renderHook(() =>
            useGridKeyboardShortcuts({ univerAPI: null, enabled: true })
        );

        expect(result.current.shortcuts.length).toBeGreaterThan(0);
        expect(result.current.shortcuts[0]).toHaveProperty('key');
        expect(result.current.shortcuts[0]).toHaveProperty('description');
        expect(result.current.shortcuts[0]).toHaveProperty('action');
    });

    it('should toggle showHelp when setShowHelp is called', () => {
        const { result } = renderHook(() =>
            useGridKeyboardShortcuts({ univerAPI: null, enabled: true })
        );

        act(() => {
            result.current.setShowHelp(true);
        });

        expect(result.current.showHelp).toBe(true);

        act(() => {
            result.current.setShowHelp(false);
        });

        expect(result.current.showHelp).toBe(false);
    });
});

describe('detectWBSLevel', () => {
    it('should return 0 for single-digit WBS codes', () => {
        expect(detectWBSLevel('1')).toBe(0);
        expect(detectWBSLevel('1.')).toBe(0);
        expect(detectWBSLevel('5')).toBe(0);
    });

    it('should return 1 for two-level WBS codes', () => {
        expect(detectWBSLevel('1.1')).toBe(1);
        expect(detectWBSLevel('1.1.')).toBe(1);
        expect(detectWBSLevel('2.5')).toBe(1);
    });

    it('should return 2 for three-level WBS codes', () => {
        expect(detectWBSLevel('1.1.1')).toBe(2);
        expect(detectWBSLevel('1.1.1.')).toBe(2);
        expect(detectWBSLevel('3.2.1')).toBe(2);
    });

    it('should return 3 for four-level WBS codes', () => {
        expect(detectWBSLevel('1.1.1.1')).toBe(3);
        expect(detectWBSLevel('1.1.1.1.')).toBe(3);
    });

    it('should handle letter-based WBS codes', () => {
        expect(detectWBSLevel('A')).toBe(0);
        expect(detectWBSLevel('A.')).toBe(0);
        expect(detectWBSLevel('A.1')).toBe(1);
        expect(detectWBSLevel('A.1.2')).toBe(2);
    });

    it('should return -1 for non-WBS content', () => {
        expect(detectWBSLevel('Foundation Work')).toBe(-1);
        expect(detectWBSLevel('')).toBe(-1);
        expect(detectWBSLevel('12345')).toBe(0); // This could be a WBS code
        expect(detectWBSLevel('ABC')).toBe(-1);
    });

    it('should handle null/undefined gracefully', () => {
        expect(detectWBSLevel(null as any)).toBe(-1);
        expect(detectWBSLevel(undefined as any)).toBe(-1);
    });
});

describe('parseCellReference', () => {
    it('should parse simple cell references', () => {
        expect(parseCellReference('A1')).toEqual({ row: 0, col: 0 });
        expect(parseCellReference('B2')).toEqual({ row: 1, col: 1 });
        expect(parseCellReference('Z10')).toEqual({ row: 9, col: 25 });
    });

    it('should parse multi-letter column references', () => {
        expect(parseCellReference('AA1')).toEqual({ row: 0, col: 26 });
        expect(parseCellReference('AB1')).toEqual({ row: 0, col: 27 });
        expect(parseCellReference('AZ1')).toEqual({ row: 0, col: 51 });
    });

    it('should be case-insensitive', () => {
        expect(parseCellReference('a1')).toEqual({ row: 0, col: 0 });
        expect(parseCellReference('b2')).toEqual({ row: 1, col: 1 });
    });

    it('should return null for invalid references', () => {
        expect(parseCellReference('')).toBeNull();
        expect(parseCellReference('1A')).toBeNull();
        expect(parseCellReference('A')).toBeNull();
        expect(parseCellReference('123')).toBeNull();
    });
});

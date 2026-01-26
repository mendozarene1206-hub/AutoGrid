/**
 * useGridKeyboardShortcuts.ts
 * 
 * Custom hook for Excel-like keyboard navigation and shortcuts.
 * Provides power-user functionality for construction estimators.
 */

import { useEffect, useCallback, useState } from 'react';

export interface ShortcutConfig {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    action: () => void;
    description: string;
}

interface UseGridKeyboardShortcutsOptions {
    univerAPI: any;
    enabled?: boolean;
}

interface UseGridKeyboardShortcutsReturn {
    shortcuts: ShortcutConfig[];
    showHelp: boolean;
    setShowHelp: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Hook to manage keyboard shortcuts for the grid
 */
export function useGridKeyboardShortcuts({
    univerAPI,
    enabled = true
}: UseGridKeyboardShortcutsOptions): UseGridKeyboardShortcutsReturn {
    const [showHelp, setShowHelp] = useState(false);

    // Define available shortcuts
    const shortcuts: ShortcutConfig[] = [
        {
            key: '/',
            ctrl: true,
            description: 'Show keyboard shortcuts',
            action: () => setShowHelp(prev => !prev)
        },
        {
            key: 'g',
            ctrl: true,
            description: 'Go to cell',
            action: () => {
                const cellRef = prompt('Ir a celda (ej: A1, B25):');
                if (cellRef && univerAPI) {
                    try {
                        const workbook = univerAPI.getActiveWorkbook();
                        const sheet = workbook?.getActiveSheet();
                        if (sheet) {
                            // Parse cell reference (e.g., "A1" -> {row: 0, col: 0})
                            const match = cellRef.toUpperCase().match(/^([A-Z]+)(\d+)$/);
                            if (match) {
                                const col = match[1].split('').reduce((acc, char) =>
                                    acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
                                const row = parseInt(match[2]) - 1;
                                // Navigate to cell
                                sheet.setActiveCell(row, col);
                            }
                        }
                    } catch (e) {
                        console.warn('[Shortcuts] Error navigating to cell:', e);
                    }
                }
            }
        },
        {
            key: 'l',
            ctrl: true,
            shift: true,
            description: 'Toggle filter',
            action: () => {
                if (univerAPI) {
                    try {
                        // Univer filter toggle command
                        univerAPI.executeCommand('sheet.command.toggle-filter');
                    } catch (e) {
                        console.warn('[Shortcuts] Filter toggle not available:', e);
                    }
                }
            }
        },
        {
            key: 'f',
            ctrl: true,
            description: 'Find & Replace',
            action: () => {
                if (univerAPI) {
                    try {
                        univerAPI.executeCommand('sheet.command.open-find-dialog');
                    } catch (e) {
                        console.warn('[Shortcuts] Find dialog not available:', e);
                    }
                }
            }
        },
        {
            key: 's',
            ctrl: true,
            description: 'Save (auto-saved)',
            action: () => {
                console.log('[Shortcuts] Save triggered - AutoGrid auto-saves');
                // Could trigger a visual feedback here
            }
        },
        {
            key: 'z',
            ctrl: true,
            description: 'Undo',
            action: () => {
                if (univerAPI) {
                    try {
                        univerAPI.executeCommand('core.command.undo');
                    } catch (e) {
                        console.warn('[Shortcuts] Undo not available:', e);
                    }
                }
            }
        },
        {
            key: 'y',
            ctrl: true,
            description: 'Redo',
            action: () => {
                if (univerAPI) {
                    try {
                        univerAPI.executeCommand('core.command.redo');
                    } catch (e) {
                        console.warn('[Shortcuts] Redo not available:', e);
                    }
                }
            }
        },
        {
            key: '+',
            ctrl: true,
            description: 'Insert row below',
            action: () => {
                if (univerAPI) {
                    try {
                        univerAPI.executeCommand('sheet.command.insert-row-after');
                    } catch (e) {
                        console.warn('[Shortcuts] Insert row not available:', e);
                    }
                }
            }
        },
        {
            key: '-',
            ctrl: true,
            description: 'Delete current row',
            action: () => {
                if (univerAPI) {
                    try {
                        univerAPI.executeCommand('sheet.command.delete-row');
                    } catch (e) {
                        console.warn('[Shortcuts] Delete row not available:', e);
                    }
                }
            }
        }
    ];

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!enabled) return;

        // Don't intercept if user is typing in an input field (except grid cells)
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            // Allow shortcuts in Univer's cell editor
            if (!target.closest('.univer-editor-container')) {
                return;
            }
        }

        for (const shortcut of shortcuts) {
            const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : true;
            const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
            const altMatch = shortcut.alt ? event.altKey : !event.altKey;
            const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

            if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
                // Only process shortcuts that require modifiers
                if (shortcut.ctrl || shortcut.shift || shortcut.alt) {
                    event.preventDefault();
                    event.stopPropagation();
                    shortcut.action();
                    return;
                }
            }
        }
    }, [enabled, shortcuts, univerAPI]);

    useEffect(() => {
        if (enabled) {
            document.addEventListener('keydown', handleKeyDown, true);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [enabled, handleKeyDown]);

    return {
        shortcuts,
        showHelp,
        setShowHelp
    };
}

/**
 * WBS Detection Utility
 * Auto-detects WBS hierarchy level from cell content patterns
 */
export function detectWBSLevel(content: string): number {
    if (!content || typeof content !== 'string') return -1;

    const trimmed = content.trim();

    // Pattern: "1" or "1." - Level 0 (main category)
    if (/^\d+\.?$/.test(trimmed)) return 0;

    // Pattern: "1.1" or "1.1." - Level 1
    if (/^\d+\.\d+\.?$/.test(trimmed)) return 1;

    // Pattern: "1.1.1" or "1.1.1." - Level 2
    if (/^\d+\.\d+\.\d+\.?$/.test(trimmed)) return 2;

    // Pattern: "1.1.1.1" - Level 3
    if (/^\d+\.\d+\.\d+\.\d+\.?$/.test(trimmed)) return 3;

    // Alternative patterns: "A.", "A.1", etc.
    if (/^[A-Z]\.?$/.test(trimmed)) return 0;
    if (/^[A-Z]\.\d+\.?$/.test(trimmed)) return 1;
    if (/^[A-Z]\.\d+\.\d+\.?$/.test(trimmed)) return 2;

    return -1; // Not a WBS code
}

/**
 * Parse cell reference string to row/col indices
 */
export function parseCellReference(ref: string): { row: number; col: number } | null {
    const match = ref.toUpperCase().match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;

    const col = match[1].split('').reduce((acc, char) =>
        acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
    const row = parseInt(match[2]) - 1;

    return { row, col };
}

export default useGridKeyboardShortcuts;

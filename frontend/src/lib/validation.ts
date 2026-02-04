/**
 * validation.ts
 * 
 * Runtime validation for API responses.
 * Type-safe validation without external dependencies.
 */

import type { UniverData } from '../hooks/useUniverData';
import type { TrojanTreeNode } from '../types/trojanTree';
import type { TrojanAsset } from '../types/trojanAssets';

// Validation result type
export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// Type guards
function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
}

function isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
}

// Validators

/**
 * Validates UniverData response from API.
 */
export function validateUniverData(data: unknown): ValidationResult<UniverData> {
    if (!isObject(data)) {
        return { success: false, error: 'Expected object' };
    }

    // Check required fields
    if (!isString(data.estimationId)) {
        return { success: false, error: 'Missing or invalid estimationId' };
    }

    if (!isString(data.sheetName)) {
        return { success: false, error: 'Missing or invalid sheetName' };
    }

    if (!isObject(data.metadata)) {
        return { success: false, error: 'Missing or invalid metadata' };
    }

    if (!isNumber(data.metadata.totalRows)) {
        return { success: false, error: 'Missing or invalid metadata.totalRows' };
    }

    if (!isArray(data.columnDefs)) {
        return { success: false, error: 'Missing or invalid columnDefs' };
    }

    if (!isArray(data.rows)) {
        return { success: false, error: 'Missing or invalid rows' };
    }

    // Validate columnDefs structure
    for (const col of data.columnDefs) {
        if (!isObject(col)) {
            return { success: false, error: 'Invalid column definition' };
        }
        if (!isString(col.field)) {
            return { success: false, error: 'Missing column field' };
        }
    }

    return { success: true, data: data as UniverData };
}

/**
 * Validates TrojanTreeNode array.
 */
export function validateTreeNodes(data: unknown): ValidationResult<TrojanTreeNode[]> {
    if (!isArray(data)) {
        return { success: false, error: 'Expected array' };
    }

    for (const node of data) {
        if (!isObject(node)) {
            return { success: false, error: 'Invalid node: expected object' };
        }

        if (!isString(node.id)) {
            return { success: false, error: 'Missing node id' };
        }

        if (!isString(node.code)) {
            return { success: false, error: 'Missing node code' };
        }

        if (!isString(node.name)) {
            return { success: false, error: 'Missing node name' };
        }

        if (!isArray(node.hierarchyPath)) {
            return { success: false, error: 'Missing node hierarchyPath' };
        }

        if (!isNumber(node.level)) {
            return { success: false, error: 'Missing node level' };
        }

        if (node.type !== 'category' && node.type !== 'concept') {
            return { success: false, error: 'Invalid node type' };
        }

        if (!isBoolean(node.isLeaf)) {
            return { success: false, error: 'Missing node isLeaf' };
        }
    }

    return { success: true, data: data as TrojanTreeNode[] };
}

/**
 * Validates TrojanAsset array.
 */
export function validateAssets(data: unknown): ValidationResult<TrojanAsset[]> {
    if (!isArray(data)) {
        return { success: false, error: 'Expected array' };
    }

    for (const asset of data) {
        if (!isObject(asset)) {
            return { success: false, error: 'Invalid asset: expected object' };
        }

        if (!isString(asset.id)) {
            return { success: false, error: 'Missing asset id' };
        }

        if (!isString(asset.conceptCode)) {
            return { success: false, error: 'Missing asset conceptCode' };
        }

        if (!['photo', 'generator', 'spec', 'detail'].includes(asset.type as string)) {
            return { success: false, error: 'Invalid asset type' };
        }

        if (!isString(asset.signedUrl)) {
            return { success: false, error: 'Missing asset signedUrl' };
        }
    }

    return { success: true, data: data as TrojanAsset[] };
}

/**
 * Safe JSON parse with validation.
 */
export function safeJsonParse<T>(
    json: string,
    validator: (data: unknown) => ValidationResult<T>
): ValidationResult<T> {
    try {
        const parsed = JSON.parse(json);
        return validator(parsed);
    } catch (e) {
        return { success: false, error: 'Invalid JSON' };
    }
}

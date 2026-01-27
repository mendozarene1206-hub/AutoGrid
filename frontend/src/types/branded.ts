/**
 * Branded Types for AutoGrid Domain Primitives
 * 
 * These types prevent mixing up similar primitive values
 * (e.g., accidentally passing a UserId where a SpreadsheetId is expected)
 */

// Brand utility type
type Brand<K, T> = K & { __brand: T };

// ========================
// ID Types
// ========================

/** Unique identifier for a spreadsheet */
export type SpreadsheetId = Brand<string, 'SpreadsheetId'>;

/** Unique identifier for a user */
export type UserId = Brand<string, 'UserId'>;

/** Unique identifier for a catalog concept */
export type ConceptCode = Brand<string, 'ConceptCode'>;

/** Unique identifier for a signature */
export type SignatureId = Brand<string, 'SignatureId'>;

/** SHA-256 hash string */
export type SHA256Hash = Brand<string, 'SHA256Hash'>;

// ========================
// Financial Types
// ========================

/** Mexican Peso amount (always in cents to avoid floating point issues) */
export type MXNCents = Brand<number, 'MXNCents'>;

/** Unit price from catalog */
export type UnitPrice = Brand<number, 'UnitPrice'>;

/** Quantity/volume */
export type Quantity = Brand<number, 'Quantity'>;

// ========================
// Type Guards / Constructors
// ========================

export function asSpreadsheetId(id: string): SpreadsheetId {
    if (!id || typeof id !== 'string') {
        throw new Error('Invalid SpreadsheetId');
    }
    return id as SpreadsheetId;
}

export function asUserId(id: string): UserId {
    if (!id || typeof id !== 'string') {
        throw new Error('Invalid UserId');
    }
    return id as UserId;
}

export function asConceptCode(code: string): ConceptCode {
    // Concept codes follow pattern like "5.2.4.1"
    if (!code || !/^[\d.]+$/.test(code)) {
        throw new Error(`Invalid ConceptCode: ${code}`);
    }
    return code as ConceptCode;
}

export function asMXNCents(amount: number): MXNCents {
    if (!Number.isInteger(amount)) {
        throw new Error('MXNCents must be an integer');
    }
    return amount as MXNCents;
}

// ========================
// Utility Functions
// ========================

/** Convert MXN pesos to cents */
export function pesosToCents(pesos: number): MXNCents {
    return Math.round(pesos * 100) as MXNCents;
}

/** Convert cents to MXN pesos */
export function centsToPesos(cents: MXNCents): number {
    return cents / 100;
}

/** Format cents as MXN currency string */
export function formatMXN(cents: MXNCents): string {
    const pesos = cents / 100;
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
    }).format(pesos);
}

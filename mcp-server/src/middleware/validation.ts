import { z } from "zod";
import { Request, Response, NextFunction } from "express";

/**
 * Zod validation middleware factory
 * Creates middleware that validates request body against a Zod schema
 */
export function validateRequest<T>(schema: z.ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const result = schema.safeParse(req.body);
            if (!result.success) {
                res.status(400).json({
                    error: "Validation failed",
                    details: result.error.issues.map((e: z.ZodIssue) => ({
                        field: e.path.join("."),
                        message: e.message,
                    })),
                });
                return;
            }
            req.body = result.data;
            next();
        } catch (error) {
            res.status(400).json({ error: "Invalid request body" });
        }
    };
}

// ========================
// Request Schemas
// ========================

/**
 * Audit request validation schema
 */
export const auditRequestSchema = z.object({
    sheetContext: z.record(z.string(), z.unknown()),
    userMessage: z
        .string()
        .max(10000, "Message too long (max 10000 characters)")
        .optional(),
});

/**
 * Login request schema
 */
export const loginRequestSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Spreadsheet update schema (safe_update_cells)
 */
export const cellChangeSchema = z.object({
    row: z.number().int().min(0),
    col: z.number().int().min(0),
    value: z.string(),
    style: z.record(z.string(), z.unknown()).optional(),
    comment: z.string().max(500).optional(),
});

export const updateCellsSchema = z.object({
    spreadsheet_id: z.string().uuid("Invalid spreadsheet ID"),
    sheet_name: z.string().min(1, "Sheet name required"),
    override_formula_shield: z.boolean().optional().default(false),
    changes: z.array(cellChangeSchema).min(1, "At least one change required"),
});

/**
 * Workflow action schema
 */
export const workflowActionSchema = z.object({
    spreadsheet_id: z.string().uuid("Invalid spreadsheet ID"),
    action: z.enum(["request_review", "approve", "reject"]),
});

/**
 * Catalog query schema
 */
export const catalogQuerySchema = z.object({
    code: z.string().min(1, "Concept code required"),
});

export const batchCatalogQuerySchema = z.object({
    codes: z.array(z.string()).min(1, "At least one code required").max(50, "Maximum 50 codes"),
});

/**
 * Math evaluation schema
 */
export const mathEvaluateSchema = z.object({
    expression: z
        .string()
        .min(1, "Expression required")
        .max(500, "Expression too long")
        .refine(
            (val) => !/[;&|`$]/.test(val),
            "Expression contains forbidden characters"
        ),
    context: z.string().max(200).optional(),
});

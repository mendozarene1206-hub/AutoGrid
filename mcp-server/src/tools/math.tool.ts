import { evaluate } from "mathjs";

export interface MathResult {
    expression: string;
    result: number | string;
    formatted: string;
}

export interface MathError {
    error: string;
}

export interface ToolResponse {
    content: Array<{ type: string; text: string }>;
}

/**
 * Safely evaluate a mathematical expression
 * Uses mathjs for evaluation with sanitization
 */
export async function handleMathEvaluate(
    args: { expression: string; context?: string }
): Promise<ToolResponse> {
    const { expression, context } = args;

    try {
        // Basic sanitization - remove equals signs and dangerous characters
        const sanitized = expression
            .replace(/=/g, "")
            .replace(/[;&|`$]/g, ""); // Remove shell-dangerous chars

        const result = evaluate(sanitized);

        console.log(`[Math] ${context || "Calculation"}: ${expression} = ${result}`);

        const response: MathResult = {
            expression,
            result: typeof result === "number" ? result : result.toString(),
            formatted:
                typeof result === "number"
                    ? new Intl.NumberFormat("es-MX", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                    }).format(result)
                    : result.toString(),
        };

        return {
            content: [{ type: "text", text: JSON.stringify(response) }],
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const response: MathError = { error: `Invalid expression: ${errorMessage}` };

        return {
            content: [{ type: "text", text: JSON.stringify(response) }],
        };
    }
}

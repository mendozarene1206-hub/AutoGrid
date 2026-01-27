import crypto from "crypto";

interface LLMLogEntry {
    requestId: string;
    timestamp: string;
    model: string;
    userId?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    latencyMs?: number;
    costUsd?: number;
    status: "started" | "completed" | "failed";
    error?: string;
}

// Cost per 1M tokens (approximate for Gemini)
const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
    "gemini-2.0-flash-lite-preview-02-05": { input: 0.075, output: 0.3 },
    "gemini-1.5-flash": { input: 0.35, output: 1.05 },
    "gemini-1.5-pro": { input: 1.25, output: 5.0 },
    default: { input: 0.1, output: 0.4 },
};

/**
 * LLM Request/Response Logger for observability
 */
export class LLMLogger {
    private activeRequests: Map<string, { startTime: number; model: string }> = new Map();

    /**
     * Generate a unique request ID
     */
    generateRequestId(): string {
        return crypto.randomUUID();
    }

    /**
     * Log the start of an LLM request
     */
    logRequestStart(requestId: string, data: { model: string; userId?: string }): void {
        const entry: LLMLogEntry = {
            requestId,
            timestamp: new Date().toISOString(),
            model: data.model,
            userId: data.userId,
            status: "started",
        };

        this.activeRequests.set(requestId, {
            startTime: Date.now(),
            model: data.model,
        });

        console.log(`[LLM_REQUEST] ${JSON.stringify(entry)}`);
    }

    /**
     * Log the completion of an LLM request
     */
    logRequestComplete(
        requestId: string,
        data: {
            promptTokens?: number;
            completionTokens?: number;
            totalTokens?: number;
        }
    ): void {
        const startData = this.activeRequests.get(requestId);
        const latencyMs = startData ? Date.now() - startData.startTime : 0;
        const model = startData?.model || "unknown";

        const costUsd = this.calculateCost(
            model,
            data.promptTokens || 0,
            data.completionTokens || 0
        );

        const entry: LLMLogEntry = {
            requestId,
            timestamp: new Date().toISOString(),
            model,
            promptTokens: data.promptTokens,
            completionTokens: data.completionTokens,
            totalTokens: data.totalTokens,
            latencyMs,
            costUsd,
            status: "completed",
        };

        console.log(`[LLM_RESPONSE] ${JSON.stringify(entry)}`);
        this.activeRequests.delete(requestId);
    }

    /**
     * Log a failed LLM request
     */
    logRequestFailed(requestId: string, error: string): void {
        const startData = this.activeRequests.get(requestId);
        const latencyMs = startData ? Date.now() - startData.startTime : 0;
        const model = startData?.model || "unknown";

        const entry: LLMLogEntry = {
            requestId,
            timestamp: new Date().toISOString(),
            model,
            latencyMs,
            status: "failed",
            error,
        };

        console.error(`[LLM_ERROR] ${JSON.stringify(entry)}`);
        this.activeRequests.delete(requestId);
    }

    /**
     * Calculate approximate cost in USD
     */
    private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
        const costs = TOKEN_COSTS[model] || TOKEN_COSTS.default;
        const inputCost = (inputTokens / 1_000_000) * costs.input;
        const outputCost = (outputTokens / 1_000_000) * costs.output;
        return Math.round((inputCost + outputCost) * 10000) / 10000; // 4 decimal places
    }
}

// Singleton instance
export const llmLogger = new LLMLogger();

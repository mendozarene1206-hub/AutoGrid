/**
 * fetchWithRetry.ts
 * 
 * Utility for fetching with automatic retry and exponential backoff.
 * Follows Boris Cherny best practices: "Challenge Mode" for network resilience.
 */

export interface RetryConfig {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries?: number;
    /** Base delay in milliseconds (default: 1000) */
    baseDelayMs?: number;
    /** Multiplier for exponential backoff (default: 2) */
    backoffMultiplier?: number;
    /** HTTP status codes that should trigger a retry (default: [408, 429, 500, 502, 503, 504]) */
    retryableStatusCodes?: number[];
    /** Whether to retry on network errors (default: true) */
    retryNetworkErrors?: boolean;
}

export interface FetchWithRetryResult {
    response: Response;
    attempts: number;
    totalDelayMs: number;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
    maxRetries: 3,
    baseDelayMs: 1000,
    backoffMultiplier: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    retryNetworkErrors: true,
};

/**
 * Determines if an error/response should trigger a retry.
 */
function shouldRetry(
    error: unknown,
    response: Response | null,
    config: Required<RetryConfig>
): boolean {
    // Network errors (no response)
    if (response === null) {
        return config.retryNetworkErrors;
    }

    // Check status code
    return config.retryableStatusCodes.includes(response.status);
}

/**
 * Calculates delay for exponential backoff with jitter.
 */
function calculateDelay(attempt: number, baseDelay: number, multiplier: number): number {
    const exponentialDelay = baseDelay * Math.pow(multiplier, attempt);
    // Add jitter (±25%) to prevent thundering herd
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.floor(exponentialDelay + jitter);
}

/**
 * Sleep utility that respects AbortController.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new Error('Request aborted'));
            return;
        }

        const timeout = setTimeout(resolve, ms);

        signal?.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Request aborted'));
        }, { once: true });
    });
}

/**
 * Fetch with automatic retry and exponential backoff.
 * 
 * @param url - URL to fetch
 * @param options - Fetch options (including AbortController signal)
 * @param retryConfig - Retry configuration
 * @returns Fetch result with metadata
 * @throws Last error encountered after all retries exhausted
 * 
 * @example
 * ```typescript
 * const { response, attempts } = await fetchWithRetry('/api/data', {
 *   signal: abortController.signal
 * }, { maxRetries: 3 });
 * ```
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retryConfig: RetryConfig = {}
): Promise<FetchWithRetryResult> {
    const config = { ...DEFAULT_CONFIG, ...retryConfig };
    const signal = options.signal;

    let lastError: unknown;
    let lastResponse: Response | null = null;
    let totalDelayMs = 0;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
            // Check if aborted before attempting
            if (signal?.aborted) {
                throw new Error('Request aborted');
            }

            const response = await fetch(url, options);

            // Success or non-retryable error
            if (response.ok || !shouldRetry(null, response, config)) {
                return {
                    response,
                    attempts: attempt + 1,
                    totalDelayMs,
                };
            }

            // Retryable HTTP error
            lastResponse = response;
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);

        } catch (error) {
            // Network error or abort
            lastError = error;

            // Don't retry if aborted
            if (error instanceof Error && error.message === 'Request aborted') {
                throw error;
            }

            // Check if we should retry this error
            if (!shouldRetry(error, null, config)) {
                throw error;
            }
        }

        // If this was the last attempt, throw the error
        if (attempt === config.maxRetries) {
            break;
        }

        // Calculate and apply delay
        const delayMs = calculateDelay(attempt, config.baseDelayMs, config.backoffMultiplier);
        totalDelayMs += delayMs;

        console.warn(`[fetchWithRetry] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`);
        await sleep(delayMs, signal);
    }

    // All retries exhausted
    throw lastError;
}

/**
 * Convenience function for JSON API requests with retry.
 */
export async function fetchJsonWithRetry<T>(
    url: string,
    options: RequestInit = {},
    retryConfig: RetryConfig = {}
): Promise<{ data: T; attempts: number; totalDelayMs: number }> {
    const { response, attempts, totalDelayMs } = await fetchWithRetry(url, options, retryConfig);
    
    const data = await response.json() as T;
    
    return {
        data,
        attempts,
        totalDelayMs,
    };
}

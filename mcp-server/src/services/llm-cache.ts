import crypto from "crypto";

interface CacheEntry {
    response: string;
    timestamp: number;
    expiresAt: number;
}

/**
 * Simple in-memory LLM response cache
 * Only caches deterministic (temperature=0) requests
 */
export class LLMCache {
    private cache: Map<string, CacheEntry> = new Map();
    private defaultTTL: number;
    private maxSize: number;

    constructor(options?: { ttlSeconds?: number; maxSize?: number }) {
        this.defaultTTL = (options?.ttlSeconds || 3600) * 1000; // Default 1 hour
        this.maxSize = options?.maxSize || 1000;
    }

    /**
     * Generate a cache key from request parameters
     */
    private generateKey(prompt: string, model: string, options?: object): string {
        const content = JSON.stringify({ prompt, model, ...options });
        return crypto.createHash("sha256").update(content).digest("hex");
    }

    /**
     * Get cached response if available
     */
    get(prompt: string, model: string, options?: object): string | null {
        const key = this.generateKey(prompt, model, options);
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        console.log(`[LLM_CACHE] Hit for model: ${model}`);
        return entry.response;
    }

    /**
     * Store response in cache
     * Only cache if temperature is 0 (deterministic)
     */
    set(
        prompt: string,
        model: string,
        response: string,
        options?: { temperature?: number; ttlMs?: number }
    ): void {
        // Only cache deterministic responses
        if (options?.temperature !== 0) {
            return;
        }

        // Enforce max size (LRU-like: remove oldest entries)
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }

        const key = this.generateKey(prompt, model, options);
        const ttl = options?.ttlMs || this.defaultTTL;

        this.cache.set(key, {
            response,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttl,
        });

        console.log(`[LLM_CACHE] Stored for model: ${model}`);
    }

    /**
     * Clear all cached entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats(): { size: number; maxSize: number } {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
        };
    }
}

// Singleton instance
export const llmCache = new LLMCache({ ttlSeconds: 3600, maxSize: 500 });

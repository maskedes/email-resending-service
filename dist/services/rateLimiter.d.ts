/**
 * Per-API-key send rate limiter — in-memory.
 *
 * Uses a fixed 1-second window keyed by `apiKeyId:{epochSecond}`.
 * Each send INCRs the counter; when it exceeds the configured max the
 * send is rejected with HTTP 429.
 *
 * Deliberately NOT backed by Redis. The original implementation burned two
 * Redis commands (INCR + EXPIRE) per send against the Upstash free tier's
 * 500k-commands/month cap — helping exhaust the quota and 429 every worker
 * in the process. A single-process fixed window is the correct fit for the
 * one-instance WispByte deployment and costs zero Redis commands.
 */
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    /** Seconds until the current window resets (minimum 1). */
    retryAfterSeconds: number;
}
export declare function checkRateLimit(apiKeyId: string, maxPerSecond: number): Promise<RateLimitResult>;
//# sourceMappingURL=rateLimiter.d.ts.map
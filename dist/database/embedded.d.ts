export interface EmbeddedPgConnection {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}
export interface EmbeddedRedisConnection {
    host: string;
    port: number;
    username?: string;
    password?: string;
    /** True when the connection must be made over TLS (e.g. a rediss:// URL). */
    tls?: boolean;
}
export interface EmbeddedDatastores {
    pg: EmbeddedPgConnection;
    redis: EmbeddedRedisConnection;
}
/**
 * Boots embedded PostgreSQL and Redis when no real services are configured.
 * Uses dynamic import() because embedded-postgres ships as ESM.
 */
export declare function ensureEmbeddedDatastores(): Promise<void>;
export declare function getEmbeddedDatastores(): EmbeddedDatastores | null;
/** Resolve the active PostgreSQL connection config (embedded or external). */
export declare function resolvePgConfig(): EmbeddedPgConnection;
/** Resolve the active Redis connection config (embedded or external). */
export declare function resolveRedisConfig(): EmbeddedRedisConnection;
export declare function parseRedisUrl(rawUrl: string): EmbeddedRedisConnection | null;
/**
 * Minimal RESP probe: AUTH (if credentials present) then PING, reading raw
 * bytes. Any -ERR reply (e.g. Upstash's "max requests limit exceeded") or a
 * timeout/connection failure means the server is NOT usable right now.
 */
export declare function probeRedisUrl(rawUrl: string, timeoutMs?: number): Promise<{
    ok: boolean;
    error?: string;
}>;
/**
 * Boot-time Redis selection. Probes the primary REDIS_URL; when it is
 * unreachable or quota-maxed, tries REDIS_FALLBACK_URL. The chosen connection
 * is cached for the lifetime of the process (BullMQ cannot hot-swap its
 * connection, so switching means a restart — which is exactly what boot does).
 *
 * If both fail, falls back to the primary anyway so behavior degrades to
 * "queue-unavailable 503s" instead of a startup crash.
 */
export declare function selectRedisConnection(): Promise<EmbeddedRedisConnection>;
//# sourceMappingURL=embedded.d.ts.map
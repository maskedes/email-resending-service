export declare const config: {
    env: string;
    port: number;
    host: string;
    /** True when no real PostgreSQL is configured — we boot an embedded instance. */
    useEmbedded: boolean;
    pg: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
        embeddedPort: number;
        dataDir: string;
    };
    redis: {
        url: string;
        fallbackUrl: string;
        host: string;
        port: number;
        password: string;
        tls: boolean;
    };
    brevo: {
        apiKey: string;
    };
    defaultFrom: {
        email: string;
        name: string;
    };
    /**
     * When true (default), every send uses the platform From address above and
     * ignores any custom `from` email callers pass (their display name is kept).
     * This guarantees the sender is on a domain verified with the email provider
     * (Brevo), so user mail is accepted instead of rejected as "sender invalid".
     * Set ENFORCE_PLATFORM_FROM=false to allow per-caller From addresses
     * (each must then be verified with the provider independently).
     */
    enforcePlatformFrom: boolean;
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    /** Per-API-key email send rate limit (emails allowed per second). */
    emailRateLimit: {
        perSecond: number;
    };
    smsRateLimit: {
        perSecond: number;
    };
    smsGateway: {
        /** HMAC secret used to sign gateway tokens (change in production!). */
        tokenSecret: string;
        /** How long a gateway poll holds before returning empty (ms). */
        pollTimeoutMs: number;
        /** Consider gateway offline after this much silence (ms). */
        offlineAfterMs: number;
        /** Header the Android app sends with its gateway token. */
        header: string;
    };
    apiKeyHeader: string;
    /** Inbound email ingestion (per-key "Allow incoming email" + "Forwarding"). */
    inbound: {
        /** Shared secret the inbound mail provider must send. Empty = endpoint disabled. */
        secret: string;
        /** Header carrying the shared secret. */
        header: string;
        /** Maximum accepted body size for an inbound message (bytes). */
        maxBytes: number;
        /**
         * MX host the domain-verification MX check expects mail to route through
         * (e.g. "mx.mailenvoy.qd.je"). Empty = the MX check is skipped.
         */
        mxHost: string;
    };
    /** Optional shared secret that Cloudflare edge Worker sends to verify proxied traffic. */
    edgeProxySecret: string;
    dashboard: {
        username: string;
        password: string;
        sessionSecret: string;
        sessionTtlMs: number;
        cookieName: string;
        serviceSecret: string;
    };
};
//# sourceMappingURL=index.d.ts.map
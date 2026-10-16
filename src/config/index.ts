import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const hasExternalPg = !!(process.env.PGHOST && process.env.PGPORT);
const useEmbedded = process.env.USE_EMBEDDED === 'true' || !hasExternalPg;

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || 'localhost',

  /** True when no real PostgreSQL is configured — we boot an embedded instance. */
  useEmbedded,

  pg: {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'postgres',
    // Embedded development PostgreSQL instance
    embeddedPort: parseInt(process.env.EMBEDDED_PG_PORT || '5433', 10),
    dataDir: process.env.EMBEDDED_PG_DATA || path.join(process.cwd(), 'data', 'pgdata'),
  },

  redis: {
    // Full connection URL wins over host/port. Supports rediss:// with auth
    // (e.g. Upstash, Redis Cloud) — the queues parse it for host/port/password/TLS.
    url: process.env.REDIS_URL || '',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    tls: process.env.REDIS_TLS === 'true',
  },

  brevo: {
    // Brevo transactional email over HTTPS (WispByte blocks SMTP ports).
    // Get a key at: Brevo dashboard → SMTP & API → API Keys.
    apiKey: process.env.BREVO_API_KEY || '',
  },

  defaultFrom: {
    // Prod: noreply@onboard.qd.je is the default for users who haven't configured their own domain.
    // When a user verifies lumina.qd.je / custom domain, use that instead (EMAIL_DELIVERY_SETUP.md).
    email: process.env.DEFAULT_FROM_EMAIL || 'noreply@onboard.qd.je',
    name: process.env.DEFAULT_FROM_NAME || 'E-NVOY',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  /** Per-API-key email send rate limit (emails allowed per second). */
  emailRateLimit: {
    perSecond: parseInt(process.env.EMAIL_RATE_LIMIT_PER_SECOND || '3', 10),
  },

  smsRateLimit: {
    perSecond: parseInt(process.env.SMS_RATE_LIMIT_PER_SECOND || '2', 10),
  },

  smsGateway: {
    /** HMAC secret used to sign gateway tokens (change in production!). */
    tokenSecret: process.env.SMS_GATEWAY_TOKEN_SECRET || 'fms-dev-gateway-token-secret-change-me',
    /** How long a gateway poll holds before returning empty (ms). */
    pollTimeoutMs: parseInt(process.env.SMS_GATEWAY_POLL_TIMEOUT_MS || '25000', 10),
    /** Consider gateway offline after this much silence (ms). */
    offlineAfterMs: parseInt(process.env.SMS_GATEWAY_OFFLINE_AFTER_MS || '90000', 10),
    /** Header the Android app sends with its gateway token. */
    header: process.env.SMS_GATEWAY_HEADER || 'x-gateway-token',
  },

  apiKeyHeader: process.env.API_KEY_HEADER || 'x-api-key',

  /** Inbound email ingestion (per-key "Allow incoming email" + "Forwarding"). */
  inbound: {
    /** Shared secret the inbound mail provider must send. Empty = endpoint disabled. */
    secret: process.env.INBOUND_EMAIL_SECRET || '',
    /** Header carrying the shared secret. */
    header: process.env.INBOUND_EMAIL_HEADER || 'x-inbound-secret',
    /** Maximum accepted body size for an inbound message (bytes). */
    maxBytes: parseInt(process.env.INBOUND_EMAIL_MAX_BYTES || String(1024 * 1024), 10),
  },

  /** Optional shared secret that Cloudflare edge Worker sends to verify proxied traffic. */
  edgeProxySecret: process.env.EDGE_PROXY_SECRET || '',

  dashboard: {
    username: process.env.DASHBOARD_USERNAME || 'admin',
    password: process.env.DASHBOARD_PASSWORD || 'changeme',
    // Secret used to sign the dashboard session cookie
    sessionSecret: process.env.DASHBOARD_SESSION_SECRET || 'fms-dev-session-secret-change-me',
    // How long a dashboard login stays valid (default 24h)
    sessionTtlMs: parseInt(process.env.DASHBOARD_SESSION_TTL_MS || '86400000', 10),
    cookieName: 'fms_dashboard',
    // Shared secret between the Next.js dashboard and Express so the proxy can
    // authenticate without the browser cookie (used with Supabase auth).
    serviceSecret: process.env.DASHBOARD_SERVICE_SECRET || 'fms-dev-service-secret-change-me',
  },
};

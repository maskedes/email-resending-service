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
    url: process.env.REDIS_URL || '',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },

  defaultFrom: {
    email: process.env.DEFAULT_FROM_EMAIL || 'noreply@example.com',
    name: process.env.DEFAULT_FROM_NAME || 'FreeMailSend',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  apiKeyHeader: process.env.API_KEY_HEADER || 'x-api-key',
};

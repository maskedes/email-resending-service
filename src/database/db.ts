import { Pool } from 'pg';
import { ensureEmbeddedDatastores, resolvePgConfig } from './embedded';

let pool: Pool | null = null;

/**
 * Initialises the PostgreSQL connection (embedded if no external PG is
 * configured) and runs the schema migrations.
 */
export async function initDatabase(): Promise<void> {
  await ensureEmbeddedDatastores();
  const pg = resolvePgConfig();

  pool = new Pool({
    host: pg.host,
    port: pg.port,
    user: pg.user,
    password: pg.password,
    database: pg.database,
  });

  await pool.query('SELECT 1');
  await runMigrations(pool);
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialised. Call initDatabase() first.');
  }
  return pool;
}

/** Simple typed helper that runs a query and returns only the rows. */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}

/** Runs a single-row query and returns the first row or undefined. */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      is_active BOOLEAN DEFAULT TRUE,
      total_emails_sent INTEGER DEFAULT 0,
      last_used_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS emails (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      api_key_id UUID NOT NULL REFERENCES api_keys(id),
      from_email TEXT NOT NULL,
      from_name TEXT,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      html TEXT,
      text TEXT,
      status TEXT DEFAULT 'queued',
      created_at TIMESTAMPTZ DEFAULT now(),
      sent_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      error_message TEXT,
      metadata JSONB,
      scheduled_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS email_events (
      id BIGSERIAL PRIMARY KEY,
      email_id UUID NOT NULL REFERENCES emails(id),
      event TEXT NOT NULL,
      timestamp TIMESTAMPTZ DEFAULT now(),
      details TEXT
    );

    CREATE TABLE IF NOT EXISTS webhooks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      api_key_id UUID NOT NULL REFERENCES api_keys(id),
      url TEXT NOT NULL,
      events TEXT DEFAULT 'sent,delivered,bounced',
      is_active BOOLEAN DEFAULT TRUE,
      secret TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS domains (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      api_key_id UUID NOT NULL REFERENCES api_keys(id),
      name TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'pending',
      dkim_private_key TEXT,
      dkim_public_key TEXT,
      spf_record TEXT,
      dkim_record_name TEXT,
      dkim_record_value TEXT,
      dmarc_record TEXT,
      verified_at TIMESTAMPTZ,
      spf_verified BOOLEAN DEFAULT FALSE,
      dkim_verified BOOLEAN DEFAULT FALSE,
      dmarc_verified BOOLEAN DEFAULT FALSE,
      last_checked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      api_key_id UUID NOT NULL REFERENCES api_keys(id),
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      html TEXT,
      text TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_emails_api_key ON emails(api_key_id);
    CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);
    CREATE INDEX IF NOT EXISTS idx_emails_created_at ON emails(created_at);
    CREATE INDEX IF NOT EXISTS idx_email_events_email_id ON email_events(email_id);
    CREATE INDEX IF NOT EXISTS idx_webhooks_api_key ON webhooks(api_key_id);
    CREATE INDEX IF NOT EXISTS idx_domains_api_key ON domains(api_key_id);
    CREATE INDEX IF NOT EXISTS idx_templates_api_key ON templates(api_key_id);
  `);

  // ── Domains verification columns (added for real DNS checking) ──
  await pool.query(`
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS spf_verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS dkim_verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS dmarc_verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;
  `);
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

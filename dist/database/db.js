"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.getPool = getPool;
exports.query = query;
exports.queryOne = queryOne;
exports.closeDatabase = closeDatabase;
const pg_1 = require("pg");
const embedded_1 = require("./embedded");
let pool = null;
/**
 * Initialises the PostgreSQL connection (embedded if no external PG is
 * configured) and runs the schema migrations.
 */
async function initDatabase() {
    try {
        await (0, embedded_1.ensureEmbeddedDatastores)();
        const pg = (0, embedded_1.resolvePgConfig)();
        pool = new pg_1.Pool({
            host: pg.host,
            port: pg.port,
            user: pg.user,
            password: pg.password,
            database: pg.database,
        });
        await pool.query('SELECT 1');
        await runMigrations(pool);
    }
    catch (err) {
        // Some managed containers (e.g. Pterodactyl yolks running as an unknown
        // uid on a read-only /etc) cannot boot the embedded PostgreSQL at all.
        // When Supabase is configured the core pipeline (api keys, emails,
        // profiles, queue via REDIS_URL) runs without local PG — degrade to a
        // Supabase-only mode instead of refusing to start. Features backed by
        // the local pool (site links, SMS gateway tracking) will report errors
        // per-request on such hosts.
        if (!process.env.SUPABASE_URL)
            throw err;
        console.error('[db] local PostgreSQL unavailable — continuing in Supabase-only mode:', err.message);
        pool = null;
    }
}
function getPool() {
    if (!pool) {
        throw new Error('Database not initialised. Call initDatabase() first.');
    }
    return pool;
}
/** Simple typed helper that runs a query and returns only the rows. */
async function query(text, params) {
    const result = await getPool().query(text, params);
    return result.rows;
}
/** Runs a single-row query and returns the first row or undefined. */
async function queryOne(text, params) {
    const rows = await query(text, params);
    return rows[0];
}
async function runMigrations(pool) {
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
      last_used_at TIMESTAMPTZ,
      allow_sms BOOLEAN DEFAULT FALSE,
      allow_incoming_email BOOLEAN DEFAULT FALSE,
      forward_to TEXT,
      is_admin BOOLEAN DEFAULT FALSE
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
      name TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL,
      events TEXT DEFAULT 'sent,delivered,bounced',
      is_active BOOLEAN DEFAULT TRUE,
      secret TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      last_triggered_at TIMESTAMPTZ
    );

    -- Add new columns for existing installs (idempotent).
    ALTER TABLE IF EXISTS webhooks ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
    ALTER TABLE IF EXISTS webhooks ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
      api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
      event TEXT NOT NULL,
      attempt INT NOT NULL DEFAULT 1,
      outcome TEXT NOT NULL,
      http_status INT,
      error TEXT,
      delivered_at TIMESTAMPTZ,
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
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_key ON webhook_deliveries(api_key_id, created_at DESC);
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
    // ── api_keys user ownership (links to Supabase auth.users) ──
    await pool.query(`
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS user_id UUID;
  `);
    await pool.query(`
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
  `);
    await pool.query(`
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS allow_sms BOOLEAN DEFAULT FALSE;
  `);
    await pool.query(`
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS allow_incoming_email BOOLEAN DEFAULT FALSE;
  `);
    await pool.query(`
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS forward_to TEXT;
  `);
    await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
  `);
    // ── SMS gateway + messages (Android phone as sender) ──
    await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_gateways (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
      name TEXT NOT NULL DEFAULT '',
      phone_number TEXT,
      gateway_token_hash TEXT NOT NULL UNIQUE,
      is_online BOOLEAN DEFAULT FALSE,
      last_seen_at TIMESTAMPTZ,
      last_heartbeat_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS sms_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      api_key_id UUID NOT NULL REFERENCES api_keys(id),
      gateway_id UUID REFERENCES sms_gateways(id) ON DELETE SET NULL,
      to_phone TEXT NOT NULL,
      from_phone TEXT,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      parts INTEGER DEFAULT 1,
      error_message TEXT,
      metadata JSONB,
      scheduled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      sent_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS sms_events (
      id BIGSERIAL PRIMARY KEY,
      sms_id UUID NOT NULL REFERENCES sms_messages(id) ON DELETE CASCADE,
      event TEXT NOT NULL,
      timestamp TIMESTAMPTZ DEFAULT now(),
      details TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sms_messages_api_key ON sms_messages(api_key_id);
    CREATE INDEX IF NOT EXISTS idx_sms_messages_status ON sms_messages(status);
    CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_sms_events_sms_id ON sms_events(sms_id);
    CREATE INDEX IF NOT EXISTS idx_sms_gateways_api_key ON sms_gateways(api_key_id);

    CREATE TABLE IF NOT EXISTS sites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      api_key_id UUID NOT NULL REFERENCES api_keys(id),
      domain TEXT NOT NULL DEFAULT 'onboard.qd.je',
      subdomain TEXT,
      title TEXT,
      html TEXT NOT NULL DEFAULT '<h1>Hello</h1>',
      is_published BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(domain, subdomain)
    );

    -- Short-domain for links: default en.12, customer can override to onboard.qd.je etc.
    CREATE TABLE IF NOT EXISTS links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      api_key_id UUID NOT NULL REFERENCES api_keys(id),
      site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
      domain TEXT NOT NULL DEFAULT 'en.12',
      slug TEXT NOT NULL,
      target_url TEXT NOT NULL,
      long_url TEXT,
      clicks INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(domain, slug)
    );

    CREATE TABLE IF NOT EXISTS link_logs (
      id BIGSERIAL PRIMARY KEY,
      link_id UUID NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      api_key_id UUID NOT NULL REFERENCES api_keys(id),
      long_url TEXT NOT NULL,
      short_url TEXT NOT NULL,
      event TEXT NOT NULL DEFAULT 'create',
      ip TEXT,
      ua TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS link_triggers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      api_key_id UUID NOT NULL REFERENCES api_keys(id),
      link_id UUID REFERENCES links(id) ON DELETE CASCADE,
      event TEXT NOT NULL DEFAULT 'click',
      target_url TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_sites_api_key ON sites(api_key_id);
    CREATE INDEX IF NOT EXISTS idx_links_api_key ON links(api_key_id);
    CREATE INDEX IF NOT EXISTS idx_links_domain_slug ON links(domain, slug);
    CREATE INDEX IF NOT EXISTS idx_link_logs_api_key ON link_logs(api_key_id);
    CREATE INDEX IF NOT EXISTS idx_link_logs_link ON link_logs(link_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_link_triggers_api_key ON link_triggers(api_key_id);
  `);
}
async function closeDatabase() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
//# sourceMappingURL=db.js.map
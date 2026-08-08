-- E-NVOY email service schema
-- Migration: 20260807000000_initial_schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── API Keys ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT TRUE,
  total_emails_sent INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ
);

-- ── Emails ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id),
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

-- ── Email Events ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_events (
  id BIGSERIAL PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.emails(id),
  event TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  details TEXT
);

-- ── Webhooks ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id),
  url TEXT NOT NULL,
  events TEXT DEFAULT 'sent,delivered,bounced',
  is_active BOOLEAN DEFAULT TRUE,
  secret TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Domains ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id),
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

-- ── Templates ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT,
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_emails_api_key ON public.emails(api_key_id);
CREATE INDEX IF NOT EXISTS idx_emails_status ON public.emails(status);
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON public.emails(created_at);
CREATE INDEX IF NOT EXISTS idx_email_events_email_id ON public.email_events(email_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_api_key ON public.webhooks(api_key_id);
CREATE INDEX IF NOT EXISTS idx_domains_api_key ON public.domains(api_key_id);
CREATE INDEX IF NOT EXISTS idx_templates_api_key ON public.templates(api_key_id);

-- ── Row Level Security ─────────────────────────────────────────────────────
-- RLS is enabled by default on Supabase tables. These policies allow the
-- authenticated (service_role bypasses RLS) and anon to work through the API.

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Authenticated users get full access (adjust as needed for multi-tenant).
CREATE POLICY "api_keys_all" ON public.api_keys FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "emails_all" ON public.emails FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "email_events_all" ON public.email_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "webhooks_all" ON public.webhooks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "domains_all" ON public.domains FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "templates_all" ON public.templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

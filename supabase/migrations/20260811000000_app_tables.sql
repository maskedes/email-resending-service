-- E-NVOY email service — app tables in Supabase
-- Migration: 20260811000000_app_tables
--
-- Moves api_keys, emails, email_events, domains, webhooks, and templates
-- into Supabase so the dashboard reads directly and the backend writes via
-- the service_role key.  Each table has per-user RLS so users only see
-- their own data.

-- ── Helper: updated_at trigger ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── API Keys ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT TRUE,
  total_emails_sent INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS trg_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER trg_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON public.api_keys(key);

-- RLS: users see only their own keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select_own" ON public.api_keys
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "api_keys_insert_own" ON public.api_keys
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "api_keys_update_own" ON public.api_keys
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "api_keys_delete_own" ON public.api_keys
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Service role can do anything (backend writes via service_role key)
CREATE POLICY "api_keys_service_all" ON public.api_keys
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Emails ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_emails_api_key ON public.emails(api_key_id);
CREATE INDEX IF NOT EXISTS idx_emails_status ON public.emails(status);
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON public.emails(created_at DESC);

ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- Users see emails sent via their own API keys
CREATE POLICY "emails_select_own" ON public.emails
  FOR SELECT TO authenticated
  USING (
    api_key_id IN (
      SELECT id FROM public.api_keys WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "emails_insert_own" ON public.emails
  FOR INSERT TO authenticated
  WITH CHECK (
    api_key_id IN (
      SELECT id FROM public.api_keys WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "emails_service_all" ON public.emails
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Email Events ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_events (
  id BIGSERIAL PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  details TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_events_email_id ON public.email_events(email_id);
CREATE INDEX IF NOT EXISTS idx_email_events_timestamp ON public.email_events(timestamp DESC);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_events_select_own" ON public.email_events
  FOR SELECT TO authenticated
  USING (
    email_id IN (
      SELECT e.id FROM public.emails e
      JOIN public.api_keys ak ON ak.id = e.api_key_id
      WHERE ak.user_id = auth.uid()
    )
  );

CREATE POLICY "email_events_service_all" ON public.email_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Domains ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_domains_api_key ON public.domains(api_key_id);

ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "domains_select_own" ON public.domains
  FOR SELECT TO authenticated
  USING (
    api_key_id IN (
      SELECT id FROM public.api_keys WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "domains_service_all" ON public.domains
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Webhooks ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT DEFAULT 'sent,delivered,bounced',
  is_active BOOLEAN DEFAULT TRUE,
  secret TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_api_key ON public.webhooks(api_key_id);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhooks_select_own" ON public.webhooks
  FOR SELECT TO authenticated
  USING (
    api_key_id IN (
      SELECT id FROM public.api_keys WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "webhooks_service_all" ON public.webhooks
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Templates ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT,
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_api_key ON public.templates(api_key_id);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_select_own" ON public.templates
  FOR SELECT TO authenticated
  USING (
    api_key_id IN (
      SELECT id FROM public.api_keys WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "templates_service_all" ON public.templates
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- E-NVOY email service — SMS via Android phone gateway
-- Migration: 20261017000000_sms_tables
--
-- The backend service layer (src/services/smsService.ts, smsGatewayService.ts)
-- reads/writes these via Supabase, but no migration ever created them — they
-- only existed in the embedded-Postgres bootstrap (src/database/db.ts). On a
-- real Supabase project the SMS tables were simply missing, so sending and
-- gateway registration failed. This creates them in the public schema with the
-- same RLS + service-role policy shape as the other app tables.

-- ── Gateways: a registered Android phone that delivers queued SMS ────────────
CREATE TABLE IF NOT EXISTS public.sms_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT '',
  phone_number TEXT,
  -- SHA-256 of the one-time gateway token; the raw token is never stored.
  gateway_token_hash TEXT NOT NULL UNIQUE,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sms_gateways_api_key ON public.sms_gateways(api_key_id);

-- ── Messages: queued by the API/dashboard, claimed and sent by a phone ───────
CREATE TABLE IF NOT EXISTS public.sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id),
  gateway_id UUID REFERENCES public.sms_gateways(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_sms_messages_api_key ON public.sms_messages(api_key_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_status ON public.sms_messages(status);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON public.sms_messages(created_at);

-- ── Events: lifecycle timeline for each message ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.sms_events (
  id BIGSERIAL PRIMARY KEY,
  sms_id UUID NOT NULL REFERENCES public.sms_messages(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  details TEXT
);
CREATE INDEX IF NOT EXISTS idx_sms_events_sms_id ON public.sms_events(sms_id);

-- ── RLS: owners manage their own rows; service role (backend) bypasses ───────
ALTER TABLE public.sms_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_events ENABLE ROW LEVEL SECURITY;

-- sms_gateways
CREATE POLICY "sms_gateways_select_own" ON public.sms_gateways
  FOR SELECT TO authenticated
  USING (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
CREATE POLICY "sms_gateways_insert_own" ON public.sms_gateways
  FOR INSERT TO authenticated
  WITH CHECK (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
CREATE POLICY "sms_gateways_update_own" ON public.sms_gateways
  FOR UPDATE TO authenticated
  USING (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()))
  WITH CHECK (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
CREATE POLICY "sms_gateways_delete_own" ON public.sms_gateways
  FOR DELETE TO authenticated
  USING (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
CREATE POLICY "sms_gateways_service_all" ON public.sms_gateways
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- sms_messages
CREATE POLICY "sms_messages_select_own" ON public.sms_messages
  FOR SELECT TO authenticated
  USING (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
CREATE POLICY "sms_messages_insert_own" ON public.sms_messages
  FOR INSERT TO authenticated
  WITH CHECK (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
CREATE POLICY "sms_messages_update_own" ON public.sms_messages
  FOR UPDATE TO authenticated
  USING (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()))
  WITH CHECK (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
CREATE POLICY "sms_messages_service_all" ON public.sms_messages
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- sms_events
CREATE POLICY "sms_events_select_own" ON public.sms_events
  FOR SELECT TO authenticated
  USING (sms_id IN (
    SELECT id FROM public.sms_messages
    WHERE api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid())
  ));
CREATE POLICY "sms_events_insert_own" ON public.sms_events
  FOR INSERT TO authenticated
  WITH CHECK (sms_id IN (
    SELECT id FROM public.sms_messages
    WHERE api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid())
  ));
CREATE POLICY "sms_events_service_all" ON public.sms_events
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

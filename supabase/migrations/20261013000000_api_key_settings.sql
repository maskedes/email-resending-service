-- E-NVOY email service — per-API-key general settings + team access
-- Migration: 20261013000000_api_key_settings
--
-- Adds a "General settings" block to each API key:
--   * allow_sms            — permit this key to send SMS
--   * allow_incoming_email — permit this key to receive inbound email
--   * forward_to           — address inbound email is forwarded to
--
-- Plus an `api_key_members` table so owners can add teammates to a key and
-- grant one of them admin rights over it.

-- ── API key settings columns ───────────────────────────────────────────────
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS allow_sms BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allow_incoming_email BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS forward_to TEXT;

-- ── updated_at column ──────────────────────────────────────────────────────
-- api_keys already carries a BEFORE UPDATE trigger (trg_api_keys_updated_at)
-- whose function assigns NEW.updated_at, but the column was never declared.
-- Without it every UPDATE (these settings, or the existing soft-revoke) fails
-- with: record "new" has no field "updated_at".
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ── API key team members ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_key_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (api_key_id, email)
);

CREATE INDEX IF NOT EXISTS idx_api_key_members_api_key ON public.api_key_members(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_members_email ON public.api_key_members(email);

ALTER TABLE public.api_key_members ENABLE ROW LEVEL SECURITY;

-- Owners can fully manage the members of their own keys.
CREATE POLICY "api_key_members_select_own" ON public.api_key_members
  FOR SELECT TO authenticated
  USING (
    api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid())
  );

CREATE POLICY "api_key_members_insert_own" ON public.api_key_members
  FOR INSERT TO authenticated
  WITH CHECK (
    api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid())
  );

CREATE POLICY "api_key_members_update_own" ON public.api_key_members
  FOR UPDATE TO authenticated
  USING (
    api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid())
  )
  WITH CHECK (
    api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid())
  );

CREATE POLICY "api_key_members_delete_own" ON public.api_key_members
  FOR DELETE TO authenticated
  USING (
    api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid())
  );

-- Service role can do anything (backend reads/writes via service_role key).
CREATE POLICY "api_key_members_service_all" ON public.api_key_members
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

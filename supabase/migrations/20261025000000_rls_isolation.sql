-- E-NVOY email service — RLS user isolation hardening
-- Migration: 20261025000000_rls_isolation
--
-- Problem (verified live 2026-10-25): the initial schema (20260807000000) created
-- broad FOR ALL ... USING (true) policies for authenticated users on api_keys,
-- emails, email_events, webhooks, domains and templates. Later migrations added
-- tight per-user policies but never dropped the broad ones — in Postgres all
-- permissive policies on a command are OR'd, so ANY authenticated user could
-- read/modify EVERY user's rows directly through the Supabase REST API.
-- A throwaway signup read other users' emails and bcrypt API-key hashes.
--
-- Fix:
--   1. Drop every broad identity-less policy.
--   2. Guarantee strict owner-only policies on every app table (idempotent).
--   3. Prevent owners from transferring rows to another owner (WITH CHECK).
--   4. Profiles: username editable, id/email immutable.
--
-- The dashboard never talks to Supabase with user JWTs for app data (service
-- role, verified session server-side), so this hardens the raw API surface
-- without changing any dashboard behavior.

-- ── 1. Drop the broad "all authenticated users can do everything" policies ──
DROP POLICY IF EXISTS "api_keys_all"    ON public.api_keys;
DROP POLICY IF EXISTS "emails_all"      ON public.emails;
DROP POLICY IF EXISTS "email_events_all" ON public.email_events;
DROP POLICY IF EXISTS "webhooks_all"    ON public.webhooks;
DROP POLICY IF EXISTS "domains_all"     ON public.domains;
DROP POLICY IF EXISTS "templates_all"   ON public.templates;

-- ── 2. Ensure owner-only policies exist ─────────────────────────────────────
-- api_keys: the auth.uid() must equal user_id, on INSERT too (can't claim
-- another user's key) and UPDATE (can't transfer the key away).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'api_keys' AND policyname = 'api_keys_select_own') THEN
    CREATE POLICY "api_keys_select_own" ON public.api_keys
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'api_keys' AND policyname = 'api_keys_insert_own') THEN
    CREATE POLICY "api_keys_insert_own" ON public.api_keys
      FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'api_keys' AND policyname = 'api_keys_update_own') THEN
    CREATE POLICY "api_keys_update_own" ON public.api_keys
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'api_keys' AND policyname = 'api_keys_delete_own') THEN
    CREATE POLICY "api_keys_delete_own" ON public.api_keys
      FOR DELETE TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'api_keys' AND policyname = 'api_keys_service_all') THEN
    CREATE POLICY "api_keys_service_all" ON public.api_keys
      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- Child tables: ownership flows through api_key_id (or emails for events).
-- Pattern: <cmd> allowed only when the row (new row for WITH CHECK) points at
-- one of the caller's own API keys.

DO $$
DECLARE
  tbl TEXT;
  own_using TEXT;
BEGIN
  -- emails, sites, links, link_logs, link_triggers, webhooks, domains, templates
  FOREACH tbl IN ARRAY ARRAY['emails', 'sites', 'links', 'link_logs', 'link_triggers', 'webhooks', 'domains', 'templates']
  LOOP
    own_using := format(
      'api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid())'
    );

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl AND policyname = tbl || '_select_own') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)', tbl || '_select_own', tbl, own_using);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl AND policyname = tbl || '_insert_own') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)', tbl || '_insert_own', tbl, own_using);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl AND policyname = tbl || '_update_own') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', tbl || '_update_own', tbl, own_using, own_using);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl AND policyname = tbl || '_delete_own') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)', tbl || '_delete_own', tbl, own_using);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl AND policyname = tbl || '_service_all') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')', tbl || '_service_all', tbl);
    END IF;
  END LOOP;

  -- email_events: ownership via the parent email's key.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_events' AND policyname = 'email_events_select_own') THEN
    CREATE POLICY "email_events_select_own" ON public.email_events
      FOR SELECT TO authenticated
      USING (
        email_id IN (
          SELECT e.id FROM public.emails e
          JOIN public.api_keys k ON e.api_key_id = k.id
          WHERE k.user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_events' AND policyname = 'email_events_insert_own') THEN
    CREATE POLICY "email_events_insert_own" ON public.email_events
      FOR INSERT TO authenticated
      WITH CHECK (
        email_id IN (
          SELECT e.id FROM public.emails e
          JOIN public.api_keys k ON e.api_key_id = k.id
          WHERE k.user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_events' AND policyname = 'email_events_service_all') THEN
    CREATE POLICY "email_events_service_all" ON public.email_events
      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ── 3. Profiles: username changeable; id and email immutable ────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key
  ON public.profiles (LOWER(username))
  WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'profiles.id cannot be changed';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'profiles.email cannot be changed — email is managed by Supabase Auth';
  END IF;
  IF NEW.username IS DISTINCT FROM OLD.username AND NEW.username IS NOT NULL AND LOWER(NEW.username) <> LOWER(OLD.username) THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id <> OLD.id AND LOWER(p.username) = LOWER(NEW.username)
    ) THEN
      RAISE EXCEPTION 'That username is already taken';
    END IF;
    -- Guard against SQL/meta characters in usernames.
    IF NEW.username !~ '^[A-Za-z0-9_-]{2,32}$' THEN
      RAISE EXCEPTION 'Username can use only letters, numbers, underscores and hyphens (2-32 chars)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_fields ON public.profiles;
CREATE TRIGGER trg_profiles_protect_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_fields();

-- Hard rule: a user can never grab someone else's profile row.
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── 4. Notes ────────────────────────────────────────────────────────────────
-- * Subdomains/domains stay globally unique (sites_domain_subdomain_key), so a
--   live address can only ever be used by the person who owns its API key.
-- * The service role keeps full access (used by dashboard API + workers).
-- * Anon role keeps read-only public tables (published sites are served by the
--   backend with the service role, so no anon policy needed).

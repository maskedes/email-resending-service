-- E-NVOY email service — Postgres functions
-- Migration: 20260807000001_functions

-- pgcrypto provides crypt()/gen_salt() (bcrypt) and gen_random_uuid().
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── generate_api_key() ──────────────────────────────────────────────────────
-- Generates a secure random API key in the form: fms_<48 random alphanumeric chars>
-- Returns the raw key. Caller is responsible for hashing before storing
-- (or use create_api_key() which hashes for you).
CREATE OR REPLACE FUNCTION public.generate_api_key(prefix text DEFAULT 'fms_')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  chars constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result text := prefix;
  i int;
BEGIN
  FOR i IN 1..48 LOOP
    result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ── create_api_key(name, email) ─────────────────────────────────────────────
-- Inserts an API key with a generated random key. The raw key is returned so it
-- can be shown to the user exactly once. Use pgcrypto for the hash.
CREATE OR REPLACE FUNCTION public.create_api_key(p_name text, p_email text)
RETURNS TABLE (id uuid, raw_key text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id uuid := gen_random_uuid();
  raw text := public.generate_api_key();
BEGIN
  INSERT INTO public.api_keys (id, key, name, email, is_active, total_emails_sent)
  VALUES (new_id, extensions.crypt(raw, extensions.gen_salt('bf', 10)), p_name, p_email, TRUE, 0);
  RETURN QUERY SELECT new_id, raw, now();
END;
$$;

-- ── increment_email_count() ─────────────────────────────────────────────────
-- Trigger function: bumps api_keys.total_emails_sent whenever a row is inserted
-- into emails (sent from any API path). Also sets the api_key last_used_at.
CREATE OR REPLACE FUNCTION public.increment_email_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.api_keys
     SET total_emails_sent = total_emails_sent + 1,
         last_used_at = now()
   WHERE id = NEW.api_key_id;
  RETURN NEW;
END;
$$;

-- Attach the trigger to the emails table.
DROP TRIGGER IF EXISTS trg_emails_increment_count ON public.emails;
CREATE TRIGGER trg_emails_increment_count
  AFTER INSERT ON public.emails
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_email_count();

-- ── log_email_event(email_id, event, details) ───────────────────────────────
-- Records a lifecycle event (sent, delivered, bounced, failed, etc.) for an email.
CREATE OR REPLACE FUNCTION public.log_email_event(
  p_email_id uuid,
  p_event text,
  p_details text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id bigint;
BEGIN
  INSERT INTO public.email_events (email_id, event, timestamp, details)
  VALUES (p_email_id, p_event, now(), p_details)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- ── notify_email_event() ─────────────────────────────────────────────────────
-- Trigger: emits a Postgres NOTIFY on the 'email_events' channel whenever an
-- event row is inserted. Edge functions / workers can LISTEN for realtime.
CREATE OR REPLACE FUNCTION public.notify_email_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify(
    'email_events',
    json_build_object(
      'event_id', NEW.id,
      'email_id', NEW.email_id,
      'event', NEW.event,
      'timestamp', NEW.timestamp
    )::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_events_notify ON public.email_events;
CREATE TRIGGER trg_email_events_notify
  AFTER INSERT ON public.email_events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_email_event();

-- ── list_email_stats() ──────────────────────────────────────────────────────
-- Aggregate counts by status for the dashboard overview (Total/Delivered/Failed/Queued).
CREATE OR REPLACE FUNCTION public.list_email_stats()
RETURNS TABLE (total bigint, delivered bigint, failed bigint, queued bigint, sent bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    count(*)::bigint AS total,
    count(*) FILTER (WHERE status IN ('delivered'))::bigint AS delivered,
    count(*) FILTER (WHERE status IN ('failed', 'bounced', 'rejected'))::bigint AS failed,
    count(*) FILTER (WHERE status IN ('queued', 'scheduled'))::bigint AS queued,
    count(*) FILTER (WHERE status = 'sent')::bigint AS sent
  FROM public.emails;
$$;

-- ── validate_api_key(p_raw_key) ─────────────────────────────────────────────
-- Looks up an active API key whose bcrypt hash matches the raw key provided by
-- a caller (used by the send-email edge function). The Node app hashes with
-- bcrypt (cost 10); pgcrypto's crypt()/gen_salt('bf') is bcrypt-compatible, so
-- keys created by create_api_key() validate here too.
CREATE OR REPLACE FUNCTION public.validate_api_key(p_raw_key text)
RETURNS TABLE (id uuid, is_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT a.id, a.is_active
  FROM public.api_keys a
  WHERE a.is_active = TRUE
    AND a.key = extensions.crypt(p_raw_key, a.key)
  LIMIT 1;
$$;

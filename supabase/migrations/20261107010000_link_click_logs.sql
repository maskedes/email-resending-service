-- Link click logs — every redirect writes a row (event='click') with a
-- privacy-masked IP and user agent, so the dashboard Links screen can show
-- real per-click activity instead of just a counter.
-- Creation rows keep event='create'; legacy rows get 'create' via DEFAULT.

ALTER TABLE public.link_logs ADD COLUMN IF NOT EXISTS event TEXT NOT NULL DEFAULT 'create';
ALTER TABLE public.link_logs ADD COLUMN IF NOT EXISTS ip TEXT;
ALTER TABLE public.link_logs ADD COLUMN IF NOT EXISTS ua TEXT;

-- Per-link lookups for the preview panel.
CREATE INDEX IF NOT EXISTS idx_link_logs_link ON public.link_logs(link_id, created_at DESC);

COMMENT ON COLUMN public.link_logs.event IS 'create = link was shortened; click = redirect served (analytics, eventually consistent)';

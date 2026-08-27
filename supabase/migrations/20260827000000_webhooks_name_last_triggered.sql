-- E-NVOY — add name + last_triggered_at to the webhooks table.
-- Idempotent so it is safe to re-run.
ALTER TABLE public.webhooks ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.webhooks ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMPTZ;

-- Webhook delivery attempts log (owner-scoped via api_key_id)
-- One row per attempt: success, retry-pending or permanently-failed.

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  attempt INT NOT NULL DEFAULT 1,
  outcome TEXT NOT NULL,
  -- outcome: 'delivered' | 'pending_retry' | 'dead'
  http_status INT,
  error TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_key ON webhook_deliveries(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_pending
  ON webhook_deliveries(created_at) WHERE outcome = 'pending_retry';

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- No user-facing policies on purpose: rows are written/read only by the
-- Express service role (webhooks run async, before/after the user session
-- context exists). Dashboard exposes them through /api/webhooks/[id]/deliveries
-- which joins via the owner's api_keys — never expose raw rows to the client.

COMMENT ON TABLE webhook_deliveries IS 'Per-attempt webhook delivery log (delivered / pending_retry / dead)';

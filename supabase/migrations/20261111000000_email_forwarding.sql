-- Domain email forwarding (DNSimple-style):
-- mail for any address at a verified domain is received by the inbound
-- provider and POSTed to /api/inbound/email, which resolves a forwarding rule
-- (exact alias first, then the domain catch-all '*') and re-sends the message
-- to the rule's destination through the normal send pipeline.

CREATE TABLE IF NOT EXISTS forwarding_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  -- Domain the rule applies to; must be a domain owned (and verified) by the key.
  domain TEXT NOT NULL,
  -- Local part to match ("sales" for sales@example.com) or '*' for catch-all.
  alias TEXT NOT NULL DEFAULT '*',
  -- Where the mail is re-sent.
  destination TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One rule per (domain, alias, destination): prevents duplicate forwards.
CREATE UNIQUE INDEX IF NOT EXISTS idx_forwarding_rules_unique
  ON forwarding_rules(lower(domain), lower(alias), lower(destination));
-- Inbound lookups: exact alias match, then catch-all, scoped per key.
CREATE INDEX IF NOT EXISTS idx_forwarding_rules_lookup
  ON forwarding_rules(lower(domain), lower(alias), is_active);
CREATE INDEX IF NOT EXISTS idx_forwarding_rules_key
  ON forwarding_rules(api_key_id, created_at DESC);

ALTER TABLE forwarding_rules ENABLE ROW LEVEL SECURITY;

-- No user-facing policies on purpose: rules are read/written only by the
-- Express service role through /api/forwarding (authMiddleware scopes every
-- query by the authenticated api_key_id). Mail ingestion never exposes raw rows.

COMMENT ON TABLE forwarding_rules IS 'Domain email forwarding: alias or catch-all (*) on a verified domain -> destination address';
COMMENT ON COLUMN forwarding_rules.alias IS 'Local part to match (case-insensitive) or * for the domain catch-all';

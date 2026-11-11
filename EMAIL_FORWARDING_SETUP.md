# E-NVOY Email Forwarding (domain alias + catch-all)

DNSimple-style email forwarding, implemented on the E-NVOY backend:
receive mail for **any address at a verified domain** and automatically
re-send it to a destination inbox — no mail server for the end user to run.

## Why (use cases)
- **Professional addresses** — `info@yourdomain.com`, `support@yourdomain.com` without hosting a full mail server.
- **Centralized management** — forward many aliases to one real inbox.
- **Flexibility** — change the destination any time; senders never notice.
- **Catch-all** — `anything@yourdomain.com` still lands, even with no specific rule.

## How a message flows

```
sender ──▶ MX (inbound provider) ──▶ POST /api/inbound/email ──▶ rule lookup ──▶ normal send pipeline ──▶ destination inbox
                                     (x-inbound-secret)          1. exact alias
                                                                 2. domain catch-all '*'
                                                                 3. legacy per-key forward_to
```

Match order (same semantics as DNSimple):
1. **Exact alias rule** — `sales@example.com` → destination of that rule.
2. **Domain catch-all** — the domain's `*` rule catches anything that had no exact rule.
3. **Legacy fallback** — an API key whose `email` equals the recipient, forwarding to its `forward_to` (unchanged behavior).

Loop protection is built in: messages already sent from the platform From
address are dropped (`reason: loop_guard`), and a rule pointing at its own
recipient is skipped (`reason: self_destination`).

## DNS records the domain owner adds (at their DNS provider)

Like DNSimple, reception needs two things at the zone root:

| Type  | Host | Value | Purpose |
|-------|------|-------|---------|
| **MX** | `@` (or subdomain) | `INBOUND_MX_HOST` (priority 10) | Routes inbound mail to the receiving provider |
| **TXT** (SPF) | `@` | merge the provider's include into the existing `v=spf1 ... ~all` | Keeps the zone's SPF valid when the provider also sends |

The **MX check** appears automatically in domain verification
(`POST /api/domains/:id/verify`) once `INBOUND_MX_HOST` is set on the server.
Without it the check is skipped, exactly like the inbound endpoint itself.

## Server configuration (env)

| Variable | Required | Meaning |
|----------|----------|---------|
| `INBOUND_EMAIL_SECRET` | yes (else inbound returns 503) | Shared secret the inbound provider sends in `x-inbound-secret` |
| `INBOUND_EMAIL_HEADER` | no | Header name carrying the secret (default `x-inbound-secret`) |
| `INBOUND_EMAIL_MAX_BYTES` | no | Max inbound body size (default 1 MB) |
| `INBOUND_MX_HOST` | no | MX host the domain-verification check expects (e.g. `mx.mailenvoy.qd.je`) |

## API

All rule routes require the API key header (`x-api-key`) and are scoped to it.

```
GET    /api/forwarding                 → { data: [rules] }
POST   /api/forwarding                 → { rule }
       body: { domain, alias, destination }
       alias: local part ("sales") or "*" (catch-all)
DELETE /api/forwarding/:id             → { message }
```

Rules can only be created for domains **owned and verified** by the same key.
Duplicate (domain, alias, destination) rules are rejected with 409.

Inbound ingestion stays as before:

```
POST /api/inbound/email
Header: x-inbound-secret: <INBOUND_EMAIL_SECRET>
Body:   { to, from, subject?, text?, html? }
```

Response on a rule hit:

```json
{ "accepted": true, "forwarded": true,
  "matched": { "domain": "example.com", "alias": "sales", "catch_all": false },
  "forward_to": "you@inbox.com", "forward_id": "…" }
```

## Domain transfers — what breaks, what doesn't

Domains being transferred between registrars keep working **if the name
servers stay unchanged**: DNS resolution and email forwarding are not
interrupted by the transfer itself (typically 1–7 days).

- **Registrar lock / registry lock** prevent unauthorized transfers; after a
  registrant-info change the domain is transfer-locked for 60 days (ICANN).
  These locks do not affect forwarding.
- **What does need attention:** if a transfer moves DNS to new name servers,
  the MX, SPF, and DKIM records must be re-added at the new DNS host —
  forwarding stops silently until they are. Re-run domain verification
  (`POST /api/domains/:id/verify`) after any transfer; the NS and MX checks
  will catch a missing or changed DNS setup.
- Transfers usually add one year to the registration period.

- Transfers usually add one year to the registration period.

## Domain expiration — the silent stop

Registrations are time-limited; when one lapses, the domain is disabled at
the **registry level** — DNS stops resolving, so websites, mail reception and
forwarding all stop silently until renewed.

- **Grace period** (length varies by TLD, not guaranteed): domain is
  disabled but still renewable at the registrar at no extra cost. This is
  the window to recover an accidentally-expired domain (missed reminder,
  payment issue). Renewals always extend from the current expiry, so
  renewing early never loses time.
- **Redemption period** (after the registrar deletes at the registry): only
  the previous registrant can recover, only through the previous registrar,
  for a restoration fee (higher than renewal). No transfers, no new
  registrations.
- **Pending delete** (5 days after redemption): unrecoverable by anyone.
  Once deleted, the name is first-come-first-served — the previous owner has
  no guarantee of getting it back.
- **ccTLDs (.uk, .io, .sh, .de …) are not ICANN-governed**: each country
  registry sets its own (sometimes zero-length) grace and redemption periods;
  some TLDs are auto-renew-only or deleted immediately. A registry may also
  delete early (e.g. .DE without holder verification).

Operational takeaway: an expired domain looks identical to a broken zone —
both fail the DOMAIN/NS checks. Renewals are the only fix during grace;
after redemption, only the old registrar can restore it.

## Database

Migration: `supabase/migrations/20261111000000_email_forwarding.sql`
(table `forwarding_rules`, unique index on (domain, alias, destination),
lookup index, RLS enabled with service-role-only access — the Express layer
scopes every query by the authenticated key).

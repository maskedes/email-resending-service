# E-NVOY URL Shortener — Design & Hardening Plan

> Grounded in the current implementation in `src/services/siteLinkService.ts`,
> `src/routes/siteLinkRoutes.ts`, and the linked click analytics.
> Scope: make the existing feature production-quality without building a
> separate service. Stretch goals (abuse feeds, geo-tiering) are out of scope
> until traffic demands them.

## 1. What exists today (the baseline)

| Concern | Implementation | Verdict |
| --- | --- | --- |
| Creation API | `POST /api/links` — API-key authed, optional vanity `slug` (`slugify()`), auto slug via `uuidv4().slice(0,8)` fallback | ⚠️ vanity collisions return raw DB errors |
| Short domain | Defaults to `en.12` — **placeholder, no DNS** | ❌ broken |
| Redirect | `GET /s/:domain/:slug` → `res.redirect(302, target)` + fire-and-forget click counter + triggers | ✅ keep 302 (marketing click-through needs accuracy) |
| Storage | Supabase `links` (domain, slug, clicks) | ✅ |
| Click analytics | `link_logs` (created_at, ip, ua?) + `incrementLinkClick()` | ✅ sufficient for now |
| Expiry | none | Optional (article: skip until asked) |
| Caching | none — every redirect hits Supabase | ⚠️ fix when volume asks |

## 2. Hardening steps (in order)

### Step 1 — Pick a real short domain (P0)
Use `go.mailenvoy.qd.je` (or `lnk.mailenvoy.qd.je` — cigarettes style).
- Add wildcard/CNAME in DigitalPlat zone pointing at WispByte `78.154.103.19`.
- Vhost/proxy on the backend so `/s/<slug>` (single splat) resolves — extend
  `publicSiteLinkRouter` with `/:slug` mounted at subdomain level via a dedicated
  listener or reverse proxy mapping.
- Remove `en.12` as a runtime default — configuration-driven (`SHORT_LINK_DOMAIN` env).
- Redirect behavior: keep **302** (analytics-safe, allows changing target).

### Step 2 — Vanity slug disambiguation (P0) — **DONE**
- `POST /api/links` with explicit `slug`: existing `(domain, slug)` →
  **`409 { error: { type: 'alias_conflict' } }`** (detects PG 23505, no more raw DB errors).
- Auto-generated slugs: high-entropy **base62 codes** (random bytes → base62),
  ~6 chars (62^6 ≈ 57B space), 5 collision retries widening to 8 chars.
  PG `UNIQUE(domain, slug)` is the arbiter.
  **Why not counter-based:** sequential IDs are enumerable (`short-1`, `short-2`…)
  — unacceptable for private links; and single-node deployment makes a
  coordinated counter/Snowflake service pure coordination overhead.
  Base62 randomness solves both uniqueness-risk and guessability at once.**

### Step 3 — URL canonicalization + safety (P1) — **DONE**
- Normalize on write (`canonicalizeUrl()`): lowercase scheme/host,
  strip default ports (`:80`/`:443`), collapse repeated slashes, strip trailing slash
  (except bare `/`), reject credentialed URLs, and **only `http`/`https`** —
  `javascript:`, `data:`, `file:`, `mailto:` are refused.
- Dedup: one link per `(api_key_id, canonical target_url)` — creating the same
  target twice returns the **existing** short URL (no slug waste, analytics stay unified).

### Step 4 — Redirect cache (P2, when volume > ~100 rps or latency matters) — **not yet (correct call)**
- Read path is the hot path — redirect must be O(1).
- Redis cache: `link:<domain>:<slug> → target_url` with TTL 10 min (LRU style),
  populate on miss, invalidate on `PATCH /links/:id` (none exists yet; add it).
- Click counter goes to a Redis INCR, flushed to Supabase asynchronously in
  batches (every 5s, no per-request DB hit).
- Graceful degradation is already true: cache-down → DB fallback, slightly
  slower but still correct. Async analytics (click logs, click triggers) are
  already fire-and-forget off the redirect path.

### Step 5 — Read replica + future abuse prevention (P3, not yet)
- Phishing / malware redirect-destination scan at creation time.
- Geo-aware redirects, open-redirect metrics, QR generation.
- Hourly redirect-count reporting per link for tenant-level analytics.

## 3. Non-goals (don't build yet)
- Multi-tenant hierarchy beyond api_key scoping.
- Read replicas / DynamoDB / Cassandra — far away from 4k rps.
- Custom TTL per link, QR codes, branded preview pages.

## 4. Capacity sanity check
100M new URLs/mo ≈ 40 writes/sec; reads at 100:1 ≈ 4k rps avg, 40k rps peak.
Current Supabase+PG path handles that fine; cache push is only needed past ~100 rps.

## 5. Immediate action items
1. Decide short domain (`go.mailenvoy.qd.je` / `lnk.mailenvoy.qd.je` or `e.mailenvoy.qd.je`)
2. Deploy WispByte + Vercel first (current prod artifacts are ahead of the server)
3. Then execute Steps 1–3 (small, self-contained PRs)

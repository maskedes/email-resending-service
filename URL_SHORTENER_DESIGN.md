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
  Base62 randomness solves both uniqueness-risk and guessability at once.

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

### Step 5 — Abuse & security guards (P1) — **DONE**
Article's "what prevents someone from using your service to distribute malware?"
answered in code (`src/services/urlSafety.ts`, wired into `createLink`):

| Measure | Threat | Implementation |
| --- | --- | --- |
| URL validation | Malformed/invalid/schemed targets | `canonicalizeUrl()` — only http/https, no user-info, canonical form |
| Local/private-host rejection | Internal-address phishing / SSRF-alikes | `isLocalOrPrivateHost()` — localhost, 127/8, RFC1918, link-local, .local/.internal |
| Reputation check | Known malware/phishing URLs | Optional **Google Safe Browsing v4** (`SAFE_BROWSING_API_KEY`, 2s timeout, **fail-open**) |
| Create-path rate limit | Spam, ID-space flooding, DoS | Per-API-key fixed window, **5 links/sec** → `429` + `Retry-After` (separate budget from sends) |
| Unpredictable codes | Enumeration of private links | Random base62 IDs (Step 2) |
| Alias abuse | Impersonation / routing hijack | `validateVanitySlug()` — reserved slugs (`api`, `s`, `admin`, `login`…) + impersonation patterns rejected |
| Vanity conflicts | Two users, same alias | `409 alias_conflict` (Step 2) |

Trust & safety teams / daily scans of millions of URLs (Bitly-style) stay a
non-goal until volume justifies them.

### Step 6 — Read replica + future abuse prevention (P3, not yet)
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
1. Decide short domain (`go.mailenvoy.qd.je` recommended), point DNS at WispByte, set `SHORT_LINK_DOMAIN`
2. Deploy WispByte + Vercel first (current prod artifacts are ahead of the server)
3. Steps 2 & 3 of the hardening plan are **DONE** (base62 slug IDs, 409 conflicts, canonicalization, per-key dedupe)

## 6. Consistency & idempotency notes (article sync)
- **Redirect correctness is strong-consistency**: `(domain, slug) → target_url`
  is write-never-changed-after-create (no edit endpoint exists), so every read
  resolves identically. Keep it that way unless a `PATCH /links/:id` is added —
  if it ever is, add cache invalidation at the same time (Step 4).
- **Click counts are eventually consistent by construction**: `clicks` is
  fire-and-forget incremented off the redirect path; being off by a handful is
  acceptable analytics behavior, exactly as designed.
- **Create is idempotent via dedupe**: retrying `POST /api/links` with the same
  canonical target for the same API key returns the existing link instead of a
  duplicate row — no slug waste, safe client retries.
- **Hot/cold tiering**: intentionally not implemented. Access patterns are
  power-law-shaped but the dataset is tiny; prioritize the hot path (a real
  short domain + healthy 302) before any storage-tier thinking.

## 7. Summary — the tradeoffs we actually made
Deliberate, defensible choices (not defaults, not interview theater):
1. **Redirect performance dominates**: 302 kept (analytics fidelity) — the
   correct trade for a marketing/analytics shortener; 301 would trade
   accuracy for load reduction we don't need yet.
2. **Uniqueness without coordination**: random base62 IDs arbitrated by the
   DB unique index — no counter service, no Snowflake, and non-enumerable
   (solves the predictability tradeoff for free).
3. **Consistency where it matters**: the mapping is write-once → strong
   consistency for free; click counters are eventual (auxiliary).
4. **Graceful degradation everywhere**: analytics/triggers fire-and-forget;
   Safe Browsing fails open; limiter is in-process with no Redis dependency.
5. **Feature surface stays honest**: no QR, geo-routing, A/B, or consent
   banners until there's a reason — but the architecture (async tap points on
   create/redirect) leaves room for every one of them.

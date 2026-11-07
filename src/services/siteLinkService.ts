import { randomBytes, randomUUID as uuidv4 } from 'node:crypto';
import { getPool } from '../database/db';
import { getSupabase } from '../database/supabase';
import { rejectUnsafeUrl, validateVanitySlug } from './urlSafety';
import { checkRateLimit } from './rateLimiter';

export interface SiteRow { id: string; api_key_id: string; domain: string; subdomain: string | null; title: string | null; html: string; is_published: boolean; created_at: string; updated_at: string }
export interface LinkRow { id: string; api_key_id: string; site_id: string | null; domain: string; slug: string; target_url: string; clicks: number; is_active: boolean; created_at: string }

const SHORT_DOMAIN_DEFAULT = 'en.12';
export function shortUrl(domain: string, slug: string): string { return `https://${domain}/${slug}`; }

function slugify(s: string): string { return s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || uuidv4().slice(0, 8); }

/** Thrown when a vanity slug already exists for the domain — routes map this to HTTP 409. */
export class AliasConflictError extends Error {
  code = 'alias_conflict';
  constructor(domain: string, slug: string) {
    super(`The short path ${domain}/${slug} is already taken. Choose a different slug.`);
  }
}

/** Thrown when the target URL cannot be safely shortened. */
export class ValidationError extends Error {
  code = 'validation_error';
  constructor(message: string) { super(message); }
}

/** Thrown when the API key exceeds its link-creation budget → HTTP 429. */
export class RateLimitedError extends Error {
  code = 'rate_limit_exceeded';
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super(`Too many links created. Try again in ${retryAfterSeconds}s.`);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// ── URL canonicalization (normalized targets → no duplicate slugs, no dangerous schemes) ──

/**
 * Canonicalizes a long URL per the URL-shortener design doc:
 * - only http/https schemes (rejects javascript:, data:, file:, mailto:)
 * - lowercased scheme/host (URL does this) + default ports stripped
 * - repeated slashes collapsed, trailing slash removed (except bare "/")
 * Returns null when the URL is invalid or uses a disallowed scheme.
 */
export function canonicalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (u.username || u.password) return null; // never store credentialed URLs
  if ((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) {
    u.port = '';
    u.host = u.host.replace(/:(80|443)$/, '');
  }
  u.pathname = u.pathname.replace(/\/{2,}/g, '/');
  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, '') || '/';
  return u.toString();
}

// ── ID generation: high-entropy base62 codes with collision retry ──
// (random 8 bytes → base62, ~62^11 space at 11 chars — far beyond collision
// risk at this scale; PG's UNIQUE(domain, slug) is the arbiter. A coordinated
// counter/Snowflake service is intentionally NOT used: single-node deployment,
// no exogenous-ID requirement, added coordination = added failure modes.)

const B62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function randomBase62(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += B62_ALPHABET[bytes[i] % 62];
  return out;
}

const MAX_SLUG_RETRIES = 5;

/** Returns the short domain as configured (env override, else the legacy default). */
export function defaultShortDomain(): string {
  return (process.env.SHORT_LINK_DOMAIN || '').trim() || SHORT_DOMAIN_DEFAULT;
}

export async function createSite(apiKeyId: string, input: { domain?: string; subdomain?: string; title?: string; html: string }): Promise<SiteRow> {
  const sb = getSupabase();
  const id = uuidv4();
  const domain = (input.domain || 'onboard.qd.je').trim();
  const { data, error } = await sb.from('sites').insert({
    id, api_key_id: apiKeyId, domain, subdomain: input.subdomain?.trim() || null, title: input.title || null, html: input.html, is_published: true,
  }).select().single();
  if (error) throw new Error(error.message);
  return data as SiteRow;
}
export async function listSites(apiKeyId: string): Promise<SiteRow[]> {
  const sb = getSupabase(); const { data } = await sb.from('sites').select('*').eq('api_key_id', apiKeyId).order('created_at', { ascending: false });
  return (data || []) as SiteRow[];
}
export async function getSite(id: string): Promise<SiteRow | null> {
  const sb = getSupabase(); const { data } = await sb.from('sites').select('*').eq('id', id).single();
  return (data as SiteRow) || null;
}
export async function updateSite(id: string, patch: Partial<Pick<SiteRow, 'html' | 'title' | 'is_published'>>): Promise<SiteRow | null> {
  const sb = getSupabase(); const { data, error } = await sb.from('sites').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw new Error(error.message); return data as SiteRow;
}
export async function deleteSite(id: string): Promise<void> { const sb = getSupabase(); await sb.from('sites').delete().eq('id', id); }

export async function createLink(apiKeyId: string, input: { domain?: string; slug?: string; target_url: string; site_id?: string }): Promise<LinkRow> {
  const sb = getSupabase(); const id = uuidv4();
  const domain = (input.domain || defaultShortDomain()).trim() || defaultShortDomain();

  // Abuse guard (edge-of-write): reject the request early when the key is
  // flooding the create endpoint (5 links/sec per key — sends keep their own budget).
  const rl = await checkRateLimit(`links:${apiKeyId}`, 5);
  if (!rl.allowed) {
    throw new RateLimitedError(rl.retryAfterSeconds);
  }

  // Canonicalize the target; reject dangerous/invalid URLs outright.
  const canonical = canonicalizeUrl(input.target_url);
  if (!canonical) {
    throw new ValidationError('target_url must be a valid absolute http(s) URL');
  }

  // Safety: no internal-address redirects, and (when configured) no known-bad destinations.
  const unsafeReason = await rejectUnsafeUrl(canonical);
  if (unsafeReason) {
    throw new ValidationError(unsafeReason);
  }

  // Vanity-slug guard: reserved routing paths and impersonation-style slugs.
  if (input.slug && input.slug.trim()) {
    const reservedReason = validateVanitySlug(input.slug.trim());
    if (reservedReason) {
      throw new ValidationError(reservedReason);
    }
  }

  // Dedupe: identical targets for the same key reuse the existing short link
  // (avoids wasting slugs + splits analytics over duplicate entries).
  const { data: existing } = await sb.from('links').select('*').eq('api_key_id', apiKeyId).eq('target_url', canonical).limit(1);
  if (existing && (existing as LinkRow[]).length > 0) {
    return existing[0] as LinkRow;
  }

  // Vanity slug → conflict must surface as a clean 409 (handled by route).
  // Auto slug → high-entropy base62 with collision retry.
  const isVanity = Boolean(input.slug && input.slug.trim());
  const attempts = isVanity ? 0 : MAX_SLUG_RETRIES;
  let slug = isVanity ? slugify(input.slug!) : randomBase62(6);
  let insertError: unknown = null;

  for (let i = 0; ; i++) {
    const { data, error } = await sb.from('links').insert({ id, api_key_id: apiKeyId, domain, slug, target_url: canonical, long_url: canonical, site_id: input.site_id || null }).select().single();
    if (!error) {
      const link = data as LinkRow;
      // Append to long log + fire triggers (same api_key) — non-blocking
      const short = shortUrl(domain, slug);
      sb.from('link_logs').insert({ link_id: link.id, api_key_id: apiKeyId, long_url: canonical, short_url: short }).then(() => {});
      // Triggers: if customer configured webhooks for this link, dispatch (fire-and-forget)
      sb.from('link_triggers').select('*').eq('api_key_id', apiKeyId).eq('is_active', true).then(async ({ data: triggers }: { data: { target_url: string }[] | null }) => {
        for (const t of triggers || []) {
          try { await fetch(t.target_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'link.created', link: { id: link.id, short_url: short, long_url: canonical, domain, slug } }) }); } catch {}
        }
      });
      return link;
    }
    insertError = error;
    if (isVanity) break; // UNIQUE(domain, slug) violation → 409
    // Auto slug: widen the code if we somehow hit a collision, then retry.
    slug = randomBase62(i < attempts - 1 ? 6 : 8);
    if (i >= attempts - 1) break;
  }

  const message = insertError instanceof Error ? insertError.message : String(insertError);
  if (/duplicate|unique/i.test(message)) {
    throw new AliasConflictError(domain, slug); // vanity taken (or vanishingly rare auto-collision loss)
  }
  throw new Error(message);
}
export async function listLinks(apiKeyId: string): Promise<LinkRow[]> {
  const sb = getSupabase(); const { data } = await sb.from('links').select('*').eq('api_key_id', apiKeyId).order('created_at', { ascending: false });
  return (data || []) as LinkRow[];
}
export async function getLinkByDomainSlug(domain: string, slug: string): Promise<LinkRow | null> {
  const sb = getSupabase(); const { data } = await sb.from('links').select('*').eq('domain', domain).eq('slug', slug).single();
  return (data as LinkRow) || null;
}
export async function incrementLinkClick(id: string): Promise<void> {
  const sb = getSupabase(); const { data } = await sb.from('links').select('clicks').eq('id', id).single();
  if (data) await sb.from('links').update({ clicks: (data as { clicks: number }).clicks + 1 }).eq('id', id);
}

/**
 * Fire all active `click` triggers for a link (fire-and-forget caller).
 *
 * The route previously only counted clicks — triggers registered via
 * POST /api/sites-links/triggers with event `click` were never dispatched.
 * Triggers with a NULL link_id apply to every link of the same API key;
 * triggers bound to a specific link fire only for that link.
 */
export async function dispatchClickTriggers(link: LinkRow): Promise<void> {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT event, target_url FROM link_triggers WHERE api_key_id=$1 AND is_active AND (link_id IS NULL OR link_id=$2)',
    [link.api_key_id, link.id],
  );
  const payload = JSON.stringify({
    event: 'link.clicked',
    link: { id: link.id, domain: link.domain, slug: link.slug, target_url: link.target_url, clicks: link.clicks + 1 },
  });
  for (const t of rows as { event: string; target_url: string }[]) {
    try {
      await fetch(t.target_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
    } catch {
      // Trigger delivery is best-effort; never fail the redirect.
    }
  }
}
export async function deleteLink(id: string): Promise<void> { const sb = getSupabase(); await sb.from('links').delete().eq('id', id); }
export async function resolveSite(domain: string, subdomain?: string | null): Promise<SiteRow | null> {
  const sb = getSupabase();
  if (subdomain) {
    const { data } = await sb.from('sites').select('*').eq('domain', domain).eq('subdomain', subdomain).eq('is_published', true).single();
    if (data) return data as SiteRow;
  }
  const { data } = await sb.from('sites').select('*').eq('domain', domain).is('subdomain', null).eq('is_published', true).single();
  return (data as SiteRow) || null;
}

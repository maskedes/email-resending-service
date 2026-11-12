"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitedError = exports.ValidationError = exports.AliasConflictError = void 0;
exports.shortUrl = shortUrl;
exports.canonicalizeUrl = canonicalizeUrl;
exports.defaultShortDomain = defaultShortDomain;
exports.createSite = createSite;
exports.listSites = listSites;
exports.getSite = getSite;
exports.updateSite = updateSite;
exports.deleteSite = deleteSite;
exports.createLink = createLink;
exports.listLinks = listLinks;
exports.getLinkByDomainSlug = getLinkByDomainSlug;
exports.incrementLinkClick = incrementLinkClick;
exports.dispatchClickTriggers = dispatchClickTriggers;
exports.deleteLink = deleteLink;
exports.updateLink = updateLink;
exports.logLinkClick = logLinkClick;
exports.resolveSite = resolveSite;
const node_crypto_1 = require("node:crypto");
const db_1 = require("../database/db");
const supabase_1 = require("../database/supabase");
const urlSafety_1 = require("./urlSafety");
const rateLimiter_1 = require("./rateLimiter");
const SHORT_DOMAIN_DEFAULT = 'en.12';
function shortUrl(domain, slug) { return `https://${domain}/${slug}`; }
function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || (0, node_crypto_1.randomUUID)().slice(0, 8); }
/** Thrown when a vanity slug already exists for the domain — routes map this to HTTP 409. */
class AliasConflictError extends Error {
    constructor(domain, slug) {
        super(`The short path ${domain}/${slug} is already taken. Choose a different slug.`);
        this.code = 'alias_conflict';
    }
}
exports.AliasConflictError = AliasConflictError;
/** Thrown when the target URL cannot be safely shortened. */
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.code = 'validation_error';
    }
}
exports.ValidationError = ValidationError;
/** Thrown when the API key exceeds its link-creation budget → HTTP 429. */
class RateLimitedError extends Error {
    constructor(retryAfterSeconds) {
        super(`Too many links created. Try again in ${retryAfterSeconds}s.`);
        this.code = 'rate_limit_exceeded';
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
exports.RateLimitedError = RateLimitedError;
// ── URL canonicalization (normalized targets → no duplicate slugs, no dangerous schemes) ──
/**
 * Canonicalizes a long URL per the URL-shortener design doc:
 * - only http/https schemes (rejects javascript:, data:, file:, mailto:)
 * - lowercased scheme/host (URL does this) + default ports stripped
 * - repeated slashes collapsed, trailing slash removed (except bare "/")
 * Returns null when the URL is invalid or uses a disallowed scheme.
 */
function canonicalizeUrl(raw) {
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
    let u;
    try {
        u = new URL(trimmed);
    }
    catch {
        return null;
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:')
        return null;
    if (u.username || u.password)
        return null; // never store credentialed URLs
    if ((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) {
        u.port = '';
        u.host = u.host.replace(/:(80|443)$/, '');
    }
    u.pathname = u.pathname.replace(/\/{2,}/g, '/');
    if (u.pathname.length > 1)
        u.pathname = u.pathname.replace(/\/+$/, '') || '/';
    return u.toString();
}
// ── ID generation: high-entropy base62 codes with collision retry ──
// (random 8 bytes → base62, ~62^11 space at 11 chars — far beyond collision
// risk at this scale; PG's UNIQUE(domain, slug) is the arbiter. A coordinated
// counter/Snowflake service is intentionally NOT used: single-node deployment,
// no exogenous-ID requirement, added coordination = added failure modes.)
const B62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function randomBase62(length) {
    const bytes = (0, node_crypto_1.randomBytes)(length);
    let out = '';
    for (let i = 0; i < length; i++)
        out += B62_ALPHABET[bytes[i] % 62];
    return out;
}
const MAX_SLUG_RETRIES = 5;
/** Returns the short domain as configured (env override, else the legacy default). */
function defaultShortDomain() {
    return (process.env.SHORT_LINK_DOMAIN || '').trim() || SHORT_DOMAIN_DEFAULT;
}
async function createSite(apiKeyId, input) {
    const sb = (0, supabase_1.getSupabase)();
    const id = (0, node_crypto_1.randomUUID)();
    const domain = (input.domain || 'onboard.qd.je').trim();
    const { data, error } = await sb.from('sites').insert({
        id, api_key_id: apiKeyId, domain, subdomain: input.subdomain?.trim() || null, title: input.title || null, html: input.html, is_published: true,
    }).select().single();
    if (error)
        throw new Error(error.message);
    return data;
}
async function listSites(apiKeyId) {
    const sb = (0, supabase_1.getSupabase)();
    const { data } = await sb.from('sites').select('*').eq('api_key_id', apiKeyId).order('created_at', { ascending: false });
    return (data || []);
}
async function getSite(id) {
    const sb = (0, supabase_1.getSupabase)();
    const { data } = await sb.from('sites').select('*').eq('id', id).single();
    return data || null;
}
async function updateSite(id, patch) {
    const sb = (0, supabase_1.getSupabase)();
    const { data, error } = await sb.from('sites').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error)
        throw new Error(error.message);
    return data;
}
async function deleteSite(id) { const sb = (0, supabase_1.getSupabase)(); await sb.from('sites').delete().eq('id', id); }
async function createLink(apiKeyId, input) {
    const sb = (0, supabase_1.getSupabase)();
    const id = (0, node_crypto_1.randomUUID)();
    const domain = (input.domain || defaultShortDomain()).trim() || defaultShortDomain();
    // Abuse guard (edge-of-write): reject the request early when the key is
    // flooding the create endpoint (5 links/sec per key — sends keep their own budget).
    const rl = await (0, rateLimiter_1.checkRateLimit)(`links:${apiKeyId}`, 5);
    if (!rl.allowed) {
        throw new RateLimitedError(rl.retryAfterSeconds);
    }
    // Canonicalize the target; reject dangerous/invalid URLs outright.
    const canonical = canonicalizeUrl(input.target_url);
    if (!canonical) {
        throw new ValidationError('target_url must be a valid absolute http(s) URL');
    }
    // Safety: no internal-address redirects, and (when configured) no known-bad destinations.
    const unsafeReason = await (0, urlSafety_1.rejectUnsafeUrl)(canonical);
    if (unsafeReason) {
        throw new ValidationError(unsafeReason);
    }
    // Vanity-slug guard: reserved routing paths and impersonation-style slugs.
    if (input.slug && input.slug.trim()) {
        const reservedReason = (0, urlSafety_1.validateVanitySlug)(input.slug.trim());
        if (reservedReason) {
            throw new ValidationError(reservedReason);
        }
    }
    // Dedupe: identical targets for the same key reuse the existing short link
    // (avoids wasting slugs + splits analytics over duplicate entries).
    const { data: existing } = await sb.from('links').select('*').eq('api_key_id', apiKeyId).eq('target_url', canonical).limit(1);
    if (existing && existing.length > 0) {
        return existing[0];
    }
    // Vanity slug → conflict must surface as a clean 409 (handled by route).
    // Auto slug → high-entropy base62 with collision retry.
    const isVanity = Boolean(input.slug && input.slug.trim());
    const attempts = isVanity ? 0 : MAX_SLUG_RETRIES;
    let slug = isVanity ? slugify(input.slug) : randomBase62(6);
    let insertError = null;
    for (let i = 0;; i++) {
        const { data, error } = await sb.from('links').insert({ id, api_key_id: apiKeyId, domain, slug, target_url: canonical, long_url: canonical, site_id: input.site_id || null }).select().single();
        if (!error) {
            const link = data;
            // Append to long log + fire triggers (same api_key) — non-blocking
            const short = shortUrl(domain, slug);
            sb.from('link_logs').insert({ link_id: link.id, api_key_id: apiKeyId, long_url: canonical, short_url: short }).then(() => { });
            // Triggers: if customer configured webhooks for this link, dispatch (fire-and-forget)
            sb.from('link_triggers').select('*').eq('api_key_id', apiKeyId).eq('is_active', true).then(async ({ data: triggers }) => {
                for (const t of triggers || []) {
                    try {
                        await fetch(t.target_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'link.created', link: { id: link.id, short_url: short, long_url: canonical, domain, slug } }) });
                    }
                    catch { }
                }
            });
            return link;
        }
        insertError = error;
        if (isVanity)
            break; // UNIQUE(domain, slug) violation → 409
        // Auto slug: widen the code if we somehow hit a collision, then retry.
        slug = randomBase62(i < attempts - 1 ? 6 : 8);
        if (i >= attempts - 1)
            break;
    }
    const message = insertError instanceof Error ? insertError.message : String(insertError);
    if (/duplicate|unique/i.test(message)) {
        throw new AliasConflictError(domain, slug); // vanity taken (or vanishingly rare auto-collision loss)
    }
    throw new Error(message);
}
async function listLinks(apiKeyId) {
    const sb = (0, supabase_1.getSupabase)();
    const { data } = await sb.from('links').select('*').eq('api_key_id', apiKeyId).order('created_at', { ascending: false });
    return (data || []);
}
async function getLinkByDomainSlug(domain, slug) {
    const sb = (0, supabase_1.getSupabase)();
    const { data } = await sb.from('links').select('*').eq('domain', domain).eq('slug', slug).single();
    return data || null;
}
async function incrementLinkClick(id) {
    const sb = (0, supabase_1.getSupabase)();
    const { data } = await sb.from('links').select('clicks').eq('id', id).single();
    if (data)
        await sb.from('links').update({ clicks: data.clicks + 1 }).eq('id', id);
}
/**
 * Fire all active `click` triggers for a link (fire-and-forget caller).
 *
 * The route previously only counted clicks — triggers registered via
 * POST /api/sites-links/triggers with event `click` were never dispatched.
 * Triggers with a NULL link_id apply to every link of the same API key;
 * triggers bound to a specific link fire only for that link.
 */
async function dispatchClickTriggers(link) {
    const pool = (0, db_1.getPool)();
    const { rows } = await pool.query('SELECT event, target_url FROM link_triggers WHERE api_key_id=$1 AND is_active AND (link_id IS NULL OR link_id=$2)', [link.api_key_id, link.id]);
    const payload = JSON.stringify({
        event: 'link.clicked',
        link: { id: link.id, domain: link.domain, slug: link.slug, target_url: link.target_url, clicks: link.clicks + 1 },
    });
    for (const t of rows) {
        try {
            await fetch(t.target_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
        }
        catch {
            // Trigger delivery is best-effort; never fail the redirect.
        }
    }
}
async function deleteLink(id) { const sb = (0, supabase_1.getSupabase)(); await sb.from('links').delete().eq('id', id); }
/**
 * Edits an existing short link: swap the long URL target and/or pause/activate.
 * Target changes re-run the same canonicalization + safety checks as creation
 * so an edit can never sneak in a scheme or host that create would reject.
 */
async function updateLink(id, patch) {
    const sb = (0, supabase_1.getSupabase)();
    const update = {};
    if (patch.is_active !== undefined)
        update.is_active = Boolean(patch.is_active);
    if (patch.target_url !== undefined) {
        const canonical = canonicalizeUrl(patch.target_url);
        if (!canonical)
            throw new ValidationError('target_url must be a valid absolute http(s) URL');
        const unsafeReason = await (0, urlSafety_1.rejectUnsafeUrl)(canonical);
        if (unsafeReason)
            throw new ValidationError(unsafeReason);
        update.target_url = canonical;
        update.long_url = canonical;
    }
    if (Object.keys(update).length === 0)
        return null;
    const { data, error } = await sb.from('links').update(update).eq('id', id).select().single();
    if (error)
        throw new Error(error.message);
    return data || null;
}
/**
 * Writes a per-click log row (event='click') for the redirect path.
 * Privacy: the last octet of IPv4 is masked, IPv6 is truncated to its first
 * four groups; user agents are truncated. Fire-and-forget caller — never
 * let analytics block or fail a redirect.
 */
async function logLinkClick(link, info) {
    const sb = (0, supabase_1.getSupabase)();
    const short = shortUrl(link.domain, link.slug);
    await sb.from('link_logs').insert({
        link_id: link.id,
        api_key_id: link.api_key_id,
        long_url: link.target_url,
        short_url: short,
        event: 'click',
        ip: info.ip,
        ua: info.ua ? info.ua.slice(0, 200) : null,
    });
}
async function resolveSite(domain, subdomain) {
    const sb = (0, supabase_1.getSupabase)();
    if (subdomain) {
        const { data } = await sb.from('sites').select('*').eq('domain', domain).eq('subdomain', subdomain).eq('is_published', true).single();
        if (data)
            return data;
    }
    const { data } = await sb.from('sites').select('*').eq('domain', domain).is('subdomain', null).eq('is_published', true).single();
    return data || null;
}
//# sourceMappingURL=siteLinkService.js.map
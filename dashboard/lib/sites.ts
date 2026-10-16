import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The domain users build their sites on. A user picks a subdomain and the site
 * is published at `<subdomain>.<SITE_DOMAIN>` — Cloudflare Pages / Vercel style.
 *
 * Override with SITE_DOMAIN (server) or NEXT_PUBLIC_SITE_DOMAIN (client).
 */
export const SITE_DOMAIN =
  process.env.SITE_DOMAIN || process.env.NEXT_PUBLIC_SITE_DOMAIN || 'onboard.qd.je';

/** Subdomains we never let users claim (infrastructure / common names). */
const RESERVED_SUBDOMAINS = new Set([
  'www', 'api', 'app', 'admin', 'dashboard', 'mail', 'smtp', 'imap', 'pop', 'pop3',
  'ftp', 'cdn', 'static', 'assets', 'ns', 'ns1', 'ns2', 'mx', 'dev', 'staging',
  'status', 'docs', 'blog', 'support', 'help', 'login', 'auth', 'account',
]);

const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Validates a subdomain, returning an error message or null when valid. */
export function validateSubdomain(raw: string): string | null {
  const sub = (raw || '').trim().toLowerCase();
  if (!sub) return 'Choose a subdomain for your site.';
  if (sub.length > 63) return 'Subdomain is too long (max 63 characters).';
  if (!SUBDOMAIN_RE.test(sub)) {
    return 'Use only lowercase letters, numbers and hyphens (cannot start or end with a hyphen).';
  }
  if (RESERVED_SUBDOMAINS.has(sub)) return `"${sub}" is reserved. Pick another name.`;
  return null;
}

/** Turns arbitrary text into a URL-safe slug. */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || Math.random().toString(36).slice(2, 10)
  );
}

/**
 * Sites/links are owned by an API key. The dashboard user may own several, so
 * we attach new records to their oldest active key (stable "primary" owner).
 * Returns null when the user has no key yet.
 */
export async function getOwnerApiKeyId(
  sb: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await sb
    .from('api_keys')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1);
  return data?.[0]?.id ?? null;
}

/** All API key ids owned by a user — used to scope list/update/delete queries. */
export async function getUserApiKeyIds(
  sb: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data } = await sb.from('api_keys').select('id').eq('user_id', userId);
  return (data || []).map((r: { id: string }) => r.id);
}

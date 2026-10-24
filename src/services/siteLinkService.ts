import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/db';
import { getSupabase } from '../database/supabase';

export interface SiteRow { id: string; api_key_id: string; domain: string; subdomain: string | null; title: string | null; html: string; is_published: boolean; created_at: string; updated_at: string }
export interface LinkRow { id: string; api_key_id: string; site_id: string | null; domain: string; slug: string; target_url: string; clicks: number; is_active: boolean; created_at: string }

const SHORT_DOMAIN_DEFAULT = 'en.12';
export function shortUrl(domain: string, slug: string): string { return `https://${domain}/${slug}`; }

function slugify(s: string): string { return s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || uuidv4().slice(0, 8); }

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
  const domain = (input.domain || SHORT_DOMAIN_DEFAULT).trim() || SHORT_DOMAIN_DEFAULT;
  const slug = slugify(input.slug || input.target_url.split('/').pop() || id.slice(0, 6));
  const longUrl = input.target_url;
  const { data, error } = await sb.from('links').insert({ id, api_key_id: apiKeyId, domain, slug, target_url: input.target_url, long_url: longUrl, site_id: input.site_id || null }).select().single();
  if (error) throw new Error(error.message);
  const link = data as LinkRow;
  // Append to long log + fire triggers (same api_key) — non-blocking
  const short = shortUrl(domain, slug);
  sb.from('link_logs').insert({ link_id: link.id, api_key_id: apiKeyId, long_url: longUrl, short_url: short }).then(() => {});
  // Triggers: if customer configured webhooks for this link, dispatch (fire-and-forget)
  sb.from('link_triggers').select('*').eq('api_key_id', apiKeyId).eq('is_active', true).then(async ({ data: triggers }: { data: { target_url: string }[] | null }) => {
    for (const t of triggers || []) {
      try { await fetch(t.target_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'link.created', link: { id: link.id, short_url: short, long_url: longUrl, domain, slug } }) }); } catch {}
    }
  });
  return link;
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

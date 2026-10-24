import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { createSite, listSites, getSite, updateSite, deleteSite, createLink, listLinks, getLinkByDomainSlug, incrementLinkClick, dispatchClickTriggers, deleteLink, resolveSite } from '../services/siteLinkService.js';
import { getPool } from '../database/db';

const router = Router();

// ── Authenticated CRUD ──
router.use(authMiddleware);

router.post('/sites', async (req: AuthRequest, res: Response): Promise<void> => {
  const { domain, subdomain, title, html } = req.body as { domain?: string; subdomain?: string; title?: string; html?: string };
  if (!html) { res.status(400).json({ error: { type: 'validation_error', message: 'html required' } }); return; }
  // subdomain optional — plain domain site (onboard.qd.je) when omitted, no sub required
  try { const site = await createSite(req.apiKey!.id, { domain, subdomain, title, html }); res.status(201).json(site); } catch (e: unknown) { const msg = e instanceof Error ? e.message : 'failed'; res.status(400).json({ error: { type: 'validation_error', message: msg } }); }
});
router.get('/sites', async (req: AuthRequest, res: Response): Promise<void> => { res.json({ data: await listSites(req.apiKey!.id) }); });
router.get('/sites/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const site = await getSite(req.params.id); if (!site || site.api_key_id !== req.apiKey!.id) { res.status(404).json({ error: { type: 'not_found' } }); return; } res.json(site);
});
router.patch('/sites/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const site = await getSite(req.params.id); if (!site || site.api_key_id !== req.apiKey!.id) { res.status(404).json({ error: { type: 'not_found' } }); return; }
  const patch: Record<string, unknown> = {}; if (req.body.html !== undefined) patch.html = String(req.body.html); if (req.body.title !== undefined) patch.title = req.body.title; if (req.body.is_published !== undefined) patch.is_published = Boolean(req.body.is_published);
  res.json(await updateSite(req.params.id, patch));
});
router.delete('/sites/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const site = await getSite(req.params.id); if (!site || site.api_key_id !== req.apiKey!.id) { res.status(404).json({ error: { type: 'not_found' } }); return; }
  await deleteSite(req.params.id); res.json({ message: 'deleted' });
});

router.post('/links', async (req: AuthRequest, res: Response): Promise<void> => {
  const { domain, slug, target_url, site_id } = req.body as { domain?: string; slug?: string; target_url?: string; site_id?: string };
  if (!target_url) { res.status(400).json({ error: { type: 'validation_error', message: 'target_url (long URL) required' } }); return; }
  // domain defaults to en.12 (short domain), slug auto-generated if empty — same api_key handles logs & triggers
  try { const link = await createLink(req.apiKey!.id, { domain, slug, target_url, site_id }); res.status(201).json(link); } catch (e: unknown) { const msg = e instanceof Error ? e.message : 'failed'; res.status(400).json({ error: { type: 'validation_error', message: msg } }); }
});
router.get('/links', async (req: AuthRequest, res: Response): Promise<void> => { res.json({ data: await listLinks(req.apiKey!.id) }); });
router.delete('/links/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const pool = getPool(); const { rows } = await pool.query('SELECT api_key_id FROM links WHERE id=$1', [req.params.id]);
  if (!rows.length || rows[0].api_key_id !== req.apiKey!.id) { res.status(404).json({ error: { type: 'not_found' } }); return; }
  await deleteLink(req.params.id); res.json({ message: 'deleted' });
});

// ── Public resolvers (no auth) — mounted separately in index.ts under /s and /* ──
export const publicSiteLinkRouter = Router();
router.get('/links/logs', async (req: AuthRequest, res: Response): Promise<void> => {
  const pool = getPool(); const { rows } = await pool.query('SELECT * FROM link_logs WHERE api_key_id=$1 ORDER BY created_at DESC LIMIT 100', [req.apiKey!.id]);
  res.json({ data: rows });
});
router.get('/triggers', async (req: AuthRequest, res: Response): Promise<void> => {
  const pool = getPool(); const { rows } = await pool.query('SELECT * FROM link_triggers WHERE api_key_id=$1 ORDER BY created_at DESC', [req.apiKey!.id]);
  res.json({ data: rows });
});
router.post('/triggers', async (req: AuthRequest, res: Response): Promise<void> => {
  const { link_id, event, target_url } = req.body as { link_id?: string; event?: string; target_url?: string };
  if (!target_url) { res.status(400).json({ error: { type: 'validation_error', message: 'target_url required' } }); return; }
  const { v4: uuidv4 } = await import('uuid');
  const pool = getPool(); const id = uuidv4();
  const { rows } = await pool.query('INSERT INTO link_triggers (id, api_key_id, link_id, event, target_url) VALUES ($1,$2,$3,$4,$5) RETURNING *', [id, req.apiKey!.id, link_id || null, event || 'click', target_url]);
  res.status(201).json(rows[0]);
});

publicSiteLinkRouter.get('/s/:domain/:slug', async (req: Request, res: Response): Promise<void> => {
  const link = await getLinkByDomainSlug(req.params.domain, req.params.slug);
  if (!link || !link.is_active) { res.status(404).send('Not found'); return; }
  incrementLinkClick(link.id).catch(() => {});
  dispatchClickTriggers(link).catch(() => {});
  res.redirect(302, link.target_url);
});
publicSiteLinkRouter.get('/site/:domain/:subdomain?', async (req: Request, res: Response): Promise<void> => {
  const site = await resolveSite(req.params.domain, req.params.subdomain || null);
  if (!site) { res.status(404).send('Site not found'); return; }
  res.set('Content-Type', 'text/html').send(site.html);
});

export default router;

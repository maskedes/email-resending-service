"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicSiteLinkRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const siteLinkService_js_1 = require("../services/siteLinkService.js");
const emailService_js_1 = require("../services/emailService.js");
const smsService_js_1 = require("../services/smsService.js");
const db_1 = require("../database/db");
const router = (0, express_1.Router)();
// ── Authenticated CRUD ──
router.use(auth_1.authMiddleware);
router.post('/sites', async (req, res) => {
    const { domain, subdomain, title, html } = req.body;
    if (!html) {
        res.status(400).json({ error: { type: 'validation_error', message: 'html required' } });
        return;
    }
    // subdomain optional — plain domain site (onboard.qd.je) when omitted, no sub required
    try {
        const site = await (0, siteLinkService_js_1.createSite)(req.apiKey.id, { domain, subdomain, title, html });
        res.status(201).json(site);
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : 'failed';
        res.status(400).json({ error: { type: 'validation_error', message: msg } });
    }
});
router.get('/sites', async (req, res) => { res.json({ data: await (0, siteLinkService_js_1.listSites)(req.apiKey.id) }); });
router.get('/sites/:id', async (req, res) => {
    const site = await (0, siteLinkService_js_1.getSite)(req.params.id);
    if (!site || site.api_key_id !== req.apiKey.id) {
        res.status(404).json({ error: { type: 'not_found' } });
        return;
    }
    res.json(site);
});
router.patch('/sites/:id', async (req, res) => {
    const site = await (0, siteLinkService_js_1.getSite)(req.params.id);
    if (!site || site.api_key_id !== req.apiKey.id) {
        res.status(404).json({ error: { type: 'not_found' } });
        return;
    }
    const patch = {};
    if (req.body.html !== undefined)
        patch.html = String(req.body.html);
    if (req.body.title !== undefined)
        patch.title = req.body.title;
    if (req.body.is_published !== undefined)
        patch.is_published = Boolean(req.body.is_published);
    res.json(await (0, siteLinkService_js_1.updateSite)(req.params.id, patch));
});
router.delete('/sites/:id', async (req, res) => {
    const site = await (0, siteLinkService_js_1.getSite)(req.params.id);
    if (!site || site.api_key_id !== req.apiKey.id) {
        res.status(404).json({ error: { type: 'not_found' } });
        return;
    }
    await (0, siteLinkService_js_1.deleteSite)(req.params.id);
    res.json({ message: 'deleted' });
});
router.post('/links', async (req, res) => {
    const { domain, slug, target_url, site_id } = req.body;
    if (!target_url) {
        res.status(400).json({ error: { type: 'validation_error', message: 'target_url (long URL) required' } });
        return;
    }
    // domain defaults to SHORT_LINK_DOMAIN env (legacy: en.12), slug auto-generated if empty — same api_key handles logs & triggers
    try {
        const link = await (0, siteLinkService_js_1.createLink)(req.apiKey.id, { domain, slug, target_url, site_id });
        res.status(201).json(link);
    }
    catch (e) {
        if (e instanceof siteLinkService_js_1.AliasConflictError) {
            res.status(409).json({ error: { type: 'alias_conflict', message: e.message } });
            return;
        }
        if (e instanceof siteLinkService_js_1.RateLimitedError) {
            res.set('Retry-After', String(e.retryAfterSeconds));
            res.status(429).json({ error: { type: 'rate_limit_exceeded', message: e.message } });
            return;
        }
        if (e instanceof siteLinkService_js_1.ValidationError) {
            res.status(400).json({ error: { type: 'validation_error', message: e.message } });
            return;
        }
        const msg = e instanceof Error ? e.message : 'failed';
        res.status(400).json({ error: { type: 'validation_error', message: msg } });
    }
});
router.get('/links', async (req, res) => { res.json({ data: await (0, siteLinkService_js_1.listLinks)(req.apiKey.id) }); });
router.delete('/links/:id', async (req, res) => {
    const pool = (0, db_1.getPool)();
    const { rows } = await pool.query('SELECT api_key_id FROM links WHERE id=$1', [req.params.id]);
    if (!rows.length || rows[0].api_key_id !== req.apiKey.id) {
        res.status(404).json({ error: { type: 'not_found' } });
        return;
    }
    await (0, siteLinkService_js_1.deleteLink)(req.params.id);
    res.json({ message: 'deleted' });
});
// Edit a short link: change the long-URL target and/or pause/activate it.
router.patch('/links/:id', async (req, res) => {
    const pool = (0, db_1.getPool)();
    const { rows } = await pool.query('SELECT api_key_id FROM links WHERE id=$1', [req.params.id]);
    if (!rows.length || rows[0].api_key_id !== req.apiKey.id) {
        res.status(404).json({ error: { type: 'not_found' } });
        return;
    }
    const { target_url, is_active } = req.body;
    if (target_url === undefined && is_active === undefined) {
        res.status(400).json({ error: { type: 'validation_error', message: 'Nothing to update — send target_url and/or is_active.' } });
        return;
    }
    if (is_active !== undefined && typeof is_active !== 'boolean') {
        res.status(400).json({ error: { type: 'validation_error', message: 'is_active must be a boolean.' } });
        return;
    }
    try {
        const link = await (0, siteLinkService_js_1.updateLink)(req.params.id, { target_url, is_active });
        if (!link) {
            res.status(400).json({ error: { type: 'validation_error', message: 'Update produced no changes.' } });
            return;
        }
        res.json(link);
    }
    catch (e) {
        if (e instanceof siteLinkService_js_1.ValidationError) {
            res.status(400).json({ error: { type: 'validation_error', message: e.message } });
            return;
        }
        const msg = e instanceof Error ? e.message : 'failed';
        res.status(400).json({ error: { type: 'validation_error', message: msg } });
    }
});
// ── Test-send a short link via email or SMS (same API key budget) ──
router.post('/links/:id/test-send', async (req, res) => {
    const pool = (0, db_1.getPool)();
    const { rows } = await pool.query('SELECT * FROM links WHERE id=$1 LIMIT 1', [req.params.id]);
    const link = rows.length ? rows[0] : null;
    if (!link || link.api_key_id !== req.apiKey.id) {
        res.status(404).json({ error: { type: 'not_found', message: 'Link not found.' } });
        return;
    }
    const { channel, to, from } = req.body;
    const lr = link;
    const shortUrl = `https://${lr.domain}/${lr.slug}`;
    const targetHost = (() => { try {
        return new URL(lr.target_url).host;
    }
    catch {
        return lr.target_url;
    } })();
    try {
        if (channel === 'sms') {
            if (!to || !(0, smsService_js_1.isValidPhone)(String(to))) {
                res.status(400).json({ error: { type: 'validation_error', message: 'A valid E.164 phone number is required for SMS test-send (e.g. +15551234567).' } });
                return;
            }
            const sms = await (0, smsService_js_1.sendSms)(req.apiKey.id, {
                to: String(to),
                body: `Your link: ${shortUrl} (goes to ${targetHost})`,
                from: from ? String(from) : undefined,
                tags: { kind: 'link-test-send', link_id: lr.id },
            });
            res.status(202).json({ message: 'Test SMS queued for delivery.', sms });
            return;
        }
        if (channel === 'email') {
            if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to))) {
                res.status(400).json({ error: { type: 'validation_error', message: 'A valid email address is required for the email test-send.' } });
                return;
            }
            const email = await (0, emailService_js_1.sendEmail)(req.apiKey.id, {
                to: String(to),
                from: from ? String(from) : undefined,
                subject: `Your short link: ${shortUrl}`,
                text: `Short link: ${shortUrl}\nOpens: ${lr.target_url}\n\nYou are receiving this because a test-send was triggered from the dashboard.`,
                html: `<p>Your short link is ready:</p><p><a href="${shortUrl}" style="font-size:16px;font-weight:bold">${shortUrl}</a></p><p style="color:#666;font-size:12px">Opens: ${lr.target_url}</p>`,
                tags: { kind: 'link-test-send', link_id: lr.id },
            });
            res.status(202).json({ message: 'Test email queued for delivery.', email });
            return;
        }
        res.status(400).json({ error: { type: 'validation_error', message: "channel must be 'email' or 'sms'." } });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : 'Test send failed.';
        res.status(400).json({ error: { type: 'validation_error', message: msg } });
    }
});
// ── Public resolvers (no auth) — mounted separately in index.ts under /s and /* ──
exports.publicSiteLinkRouter = (0, express_1.Router)();
router.get('/links/logs', async (req, res) => {
    const pool = (0, db_1.getPool)();
    const { rows } = await pool.query('SELECT * FROM link_logs WHERE api_key_id=$1 ORDER BY created_at DESC LIMIT 100', [req.apiKey.id]);
    res.json({ data: rows });
});
// Aggregated analytics for the Links screen: totals, clicks/day, most-visited links.
router.get('/links/stats', async (req, res) => {
    const pool = (0, db_1.getPool)();
    const keyId = req.apiKey.id;
    const [totals, perDay, top] = await Promise.all([
        pool.query('SELECT count(*)::int AS total_links, COALESCE(sum(clicks), 0)::int AS total_clicks FROM links WHERE api_key_id=$1', [keyId]),
        pool.query(`SELECT date_trunc('day', created_at)::date::text AS day, count(*)::int AS clicks
       FROM link_logs
       WHERE api_key_id=$1 AND event='click' AND created_at > now() - interval '14 days'
       GROUP BY 1 ORDER BY 1`, [keyId]),
        pool.query('SELECT id, domain, slug, target_url, clicks, is_active FROM links WHERE api_key_id=$1 ORDER BY clicks DESC LIMIT 5', [keyId]),
    ]);
    res.json({
        total_links: totals.rows[0]?.total_links ?? 0,
        total_clicks: totals.rows[0]?.total_clicks ?? 0,
        clicks_per_day: perDay.rows, // [{ day: '2026-11-05', clicks: 12 }, …]
        top_links: top.rows, // most visited first
    });
});
router.get('/triggers', async (req, res) => {
    const pool = (0, db_1.getPool)();
    const { rows } = await pool.query('SELECT * FROM link_triggers WHERE api_key_id=$1 ORDER BY created_at DESC', [req.apiKey.id]);
    res.json({ data: rows });
});
router.post('/triggers', async (req, res) => {
    const { link_id, event, target_url } = req.body;
    if (!target_url) {
        res.status(400).json({ error: { type: 'validation_error', message: 'target_url required' } });
        return;
    }
    const { v4: uuidv4 } = await import('uuid');
    const pool = (0, db_1.getPool)();
    const id = uuidv4();
    const { rows } = await pool.query('INSERT INTO link_triggers (id, api_key_id, link_id, event, target_url) VALUES ($1,$2,$3,$4,$5) RETURNING *', [id, req.apiKey.id, link_id || null, event || 'click', target_url]);
    res.status(201).json(rows[0]);
});
exports.publicSiteLinkRouter.get('/s/:domain/:slug', async (req, res) => {
    const link = await (0, siteLinkService_js_1.getLinkByDomainSlug)(req.params.domain, req.params.slug);
    if (!link || !link.is_active) {
        res.status(404).send('Not found');
        return;
    }
    (0, siteLinkService_js_1.incrementLinkClick)(link.id).catch(() => { });
    // Per-click log rows (masked IP + UA) so the dashboard Links screen shows real activity.
    const xf = req.headers['x-forwarded-for'];
    const rawIp = (Array.isArray(xf) ? xf[0] : xf)?.split(',')[0].trim() || req.socket.remoteAddress || null;
    // WispByte sits behind a proxy: honor the forwarded chain, fall back to the socket.
    const maskIp = (ip) => {
        if (ip.includes(':')) {
            const colonCount = (ip.match(/:/g) || []).length;
            if (colonCount > 4)
                return `${ip.split(':').slice(0, 4).join(':')}::*`;
            return ip;
        }
        const parts = ip.split('.');
        return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.x` : ip;
    };
    const ip = rawIp ? maskIp(rawIp) : null;
    (0, siteLinkService_js_1.logLinkClick)(link, { ip, ua: req.headers['user-agent'] || null }).catch(() => { });
    (0, siteLinkService_js_1.dispatchClickTriggers)(link).catch(() => { });
    res.redirect(302, link.target_url);
});
exports.publicSiteLinkRouter.get('/site/:domain/:subdomain?', async (req, res) => {
    const site = await (0, siteLinkService_js_1.resolveSite)(req.params.domain, req.params.subdomain || null);
    if (!site) {
        res.status(404).send('Site not found');
        return;
    }
    res.set('Content-Type', 'text/html').send(site.html);
});
exports.default = router;
//# sourceMappingURL=siteLinkRoutes.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const apiKeyService_1 = require("../services/apiKeyService");
const supabase_1 = require("../database/supabase");
const config_1 = require("../config");
const auth_1 = require("./auth");
const login_1 = require("./views/login");
const overview_1 = require("./views/overview");
const router = (0, express_1.Router)();
// ---- Auth screen (login) ----
router.get('/login', (_req, res) => {
    if ((0, auth_1.isAuthenticated)(_req)) {
        res.redirect('/');
        return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.send(login_1.LOGIN_HTML);
});
router.post('/login', (req, res) => {
    const { username, password } = req.body || {};
    if (username === config_1.config.dashboard.username && password === config_1.config.dashboard.password) {
        (0, auth_1.setSessionCookie)(res, (0, auth_1.createSessionToken)());
        res.redirect('/');
        return;
    }
    // Re-render login with an error (invalid credentials)
    const html = login_1.LOGIN_HTML.replace('<form method="POST" action="/login">', '<div class="error">Invalid username or password.</div><form method="POST" action="/login">');
    res.status(401).setHeader('Content-Type', 'text/html').send(html);
});
router.get('/logout', (_req, res) => {
    (0, auth_1.clearSessionCookie)(res);
    res.redirect('/login');
});
// ---- Overview dashboard (protected) ----
router.get('/', auth_1.requireDashboardAuth, async (req, res) => {
    const apiKeys = await (0, apiKeyService_1.getAllApiKeys)();
    const sb = (0, supabase_1.getSupabase)();
    const { data: emails } = await sb.from('emails')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
    // `list_email_stats()` returns a TABLE, so Supabase yields a one-row array.
    // (This previously called a non-existent `get_email_stats` RPC, which made
    // the overview silently render zeros.)
    const { data: statsRows } = await sb.rpc('list_email_stats');
    const statsRow = Array.isArray(statsRows) ? statsRows[0] : statsRows;
    const stats = statsRow || { total: 0, delivered: 0, failed: 0, queued: 0, sent: 0 };
    res.setHeader('Content-Type', 'text/html');
    res.send((0, overview_1.renderOverview)({ apiKeys, emails: emails || [], stats }));
});
// ---- Email logs (events) for the Next.js dashboard ----
router.get('/api/logs', auth_1.requireDashboardAuthApi, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const offset = parseInt(req.query.offset) || 0;
        const userId = req.headers['x-dashboard-user-id'];
        const sb = (0, supabase_1.getSupabase)();
        let logs = [];
        if (userId) {
            const userKeys = await (0, apiKeyService_1.getApiKeysByUserId)(userId);
            const apiKeyIds = userKeys.map((k) => k.id);
            if (apiKeyIds.length > 0) {
                // Get emails for these API keys, then events for those emails
                const { data: emails } = await sb.from('emails')
                    .select('id')
                    .in('api_key_id', apiKeyIds);
                if (emails && emails.length > 0) {
                    const emailIds = emails.map((e) => e.id);
                    const { data } = await sb.from('email_events')
                        .select('*, emails!inner(subject, to_email, status)')
                        .in('email_id', emailIds)
                        .order('timestamp', { ascending: false })
                        .range(offset, offset + limit - 1);
                    logs = (data || []).map((ee) => ({
                        id: ee.id,
                        level: ee.event,
                        message: ee.details || ee.event,
                        created_at: ee.timestamp,
                        email_id: ee.email_id,
                        subject: ee.emails?.subject,
                        to_email: ee.emails?.to_email,
                        email_status: ee.emails?.status,
                    }));
                }
            }
        }
        else {
            const { data } = await sb.from('email_events')
                .select('*, emails!inner(subject, to_email, status)')
                .order('timestamp', { ascending: false })
                .range(offset, offset + limit - 1);
            logs = (data || []).map((ee) => ({
                id: ee.id,
                level: ee.event,
                message: ee.details || ee.event,
                created_at: ee.timestamp,
                email_id: ee.email_id,
                subject: ee.emails?.subject,
                to_email: ee.emails?.to_email,
                email_status: ee.emails?.status,
            }));
        }
        res.json({ data: logs });
    }
    catch (err) {
        console.error('Logs fetch error:', err);
        res.status(500).json({ error: { type: 'internal_error', message: 'Failed to load logs.' } });
    }
});
// ---- JSON API for the Next.js dashboard ----
router.get('/api/dashboard/overview', auth_1.requireDashboardAuthApi, async (req, res) => {
    try {
        const userId = req.headers['x-dashboard-user-id'];
        const apiKeys = userId ? await (0, apiKeyService_1.getApiKeysByUserId)(userId) : await (0, apiKeyService_1.getAllApiKeys)();
        const apiKeyIds = apiKeys.map((k) => k.id);
        const sb = (0, supabase_1.getSupabase)();
        let emails = [];
        let stats = { total: 0, sent: 0, failed: 0, queued: 0 };
        if (apiKeyIds.length > 0) {
            const { data: emailRows } = await sb.from('emails')
                .select('*')
                .in('api_key_id', apiKeyIds)
                .order('created_at', { ascending: false })
                .limit(100);
            emails = emailRows || [];
            const { data: allEmails } = await sb.from('emails')
                .select('status')
                .in('api_key_id', apiKeyIds);
            if (allEmails) {
                stats = {
                    total: allEmails.length,
                    sent: allEmails.filter((e) => e.status === 'sent').length,
                    failed: allEmails.filter((e) => e.status === 'failed').length,
                    queued: allEmails.filter((e) => e.status === 'queued').length,
                };
            }
        }
        res.json({
            stats,
            apiKeys: apiKeys.map((k) => ({
                id: k.id,
                name: k.name,
                email: k.email,
                is_active: k.is_active,
                total_emails_sent: k.total_emails_sent,
                created_at: k.created_at,
                last_used_at: k.last_used_at,
            })),
            emails: emails.map((e) => ({
                id: e.id,
                from_email: e.from_email,
                to_email: e.to_email,
                subject: e.subject,
                status: e.status,
                created_at: e.created_at,
            })),
        });
    }
    catch (err) {
        console.error('Dashboard overview error:', err);
        res.status(500).json({ error: { type: 'internal_error', message: 'Failed to load overview.' } });
    }
});
exports.default = router;
//# sourceMappingURL=index.js.map
import { Router, Request, Response } from 'express';
import { getAllApiKeys } from '../services/apiKeyService';
import { query } from '../database/db';
import { config } from '../config';
import {
  requireDashboardAuth,
  requireDashboardAuthApi,
  isAuthenticated,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
} from './auth';
import { LOGIN_HTML } from './views/login';
import { renderOverview } from './views/overview';

const router = Router();

// ---- Auth screen (login) ----
router.get('/login', (_req: Request, res: Response): void => {
  if (isAuthenticated(_req)) {
    res.redirect('/');
    return;
  }
  res.setHeader('Content-Type', 'text/html');
  res.send(LOGIN_HTML);
});

router.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body || {};
  if (username === config.dashboard.username && password === config.dashboard.password) {
    setSessionCookie(res, createSessionToken());
    res.redirect('/');
    return;
  }
  // Re-render login with an error (invalid credentials)
  const html = LOGIN_HTML.replace(
    '<form method="POST" action="/login">',
    '<div class="error">Invalid username or password.</div><form method="POST" action="/login">'
  );
  res.status(401).setHeader('Content-Type', 'text/html').send(html);
});

router.get('/logout', (_req: Request, res: Response): void => {
  clearSessionCookie(res);
  res.redirect('/login');
});

// ---- Overview dashboard (protected) ----
router.get('/', requireDashboardAuth, async (_req: Request, res: Response): Promise<void> => {
  const apiKeys = await getAllApiKeys();

  const emails = await query('SELECT * FROM emails ORDER BY created_at DESC LIMIT 100');

  const statsRow = await query(`
    SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'sent')::int as sent,
      COUNT(*) FILTER (WHERE status = 'failed')::int as failed,
      COUNT(*) FILTER (WHERE status = 'queued')::int as queued
    FROM emails
  `);

  const stats = statsRow[0] || { total: 0, sent: 0, failed: 0, queued: 0 };

  res.setHeader('Content-Type', 'text/html');
  res.send(renderOverview({ apiKeys, emails, stats }));
});

// ---- JSON API for the Next.js dashboard ----
router.get('/api/dashboard/overview', requireDashboardAuthApi, async (_req: Request, res: Response): Promise<void> => {
  try {
    const apiKeys = await getAllApiKeys();
    const emails = await query('SELECT * FROM emails ORDER BY created_at DESC LIMIT 100');
    const statsRow = await query(`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'sent')::int as sent,
        COUNT(*) FILTER (WHERE status = 'failed')::int as failed,
        COUNT(*) FILTER (WHERE status = 'queued')::int as queued
      FROM emails
    `);

    res.json({
      stats: statsRow[0] || { total: 0, sent: 0, failed: 0, queued: 0 },
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
  } catch (err) {
    console.error('Dashboard overview error:', err);
    res.status(500).json({ error: { type: 'internal_error', message: 'Failed to load overview.' } });
  }
});

export default router;

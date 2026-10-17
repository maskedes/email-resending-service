import { Router, Request, Response } from 'express';
import { getAllApiKeys, getApiKeysByUserId } from '../services/apiKeyService';
import { getSupabase } from '../database/supabase';
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
router.get('/', requireDashboardAuth, async (req: Request, res: Response): Promise<void> => {
  const apiKeys = await getAllApiKeys();
  const sb = getSupabase();

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
  res.send(renderOverview({ apiKeys, emails: emails || [], stats }));
});

// ---- Email logs (events) for the Next.js dashboard ----
router.get('/api/logs', requireDashboardAuthApi, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const userId = req.headers['x-dashboard-user-id'] as string | undefined;
    const sb = getSupabase();

    let logs: any[] = [];
    if (userId) {
      const userKeys = await getApiKeysByUserId(userId);
      const apiKeyIds = userKeys.map((k: any) => k.id);
      if (apiKeyIds.length > 0) {
        // Get emails for these API keys, then events for those emails
        const { data: emails } = await sb.from('emails')
          .select('id')
          .in('api_key_id', apiKeyIds);

        if (emails && emails.length > 0) {
          const emailIds = emails.map((e: any) => e.id);
          const { data } = await sb.from('email_events')
            .select('*, emails!inner(subject, to_email, status)')
            .in('email_id', emailIds)
            .order('timestamp', { ascending: false })
            .range(offset, offset + limit - 1);

          logs = (data || []).map((ee: any) => ({
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
    } else {
      const { data } = await sb.from('email_events')
        .select('*, emails!inner(subject, to_email, status)')
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      logs = (data || []).map((ee: any) => ({
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
  } catch (err) {
    console.error('Logs fetch error:', err);
    res.status(500).json({ error: { type: 'internal_error', message: 'Failed to load logs.' } });
  }
});

// ---- JSON API for the Next.js dashboard ----
router.get('/api/dashboard/overview', requireDashboardAuthApi, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-dashboard-user-id'] as string | undefined;
    const apiKeys = userId ? await getApiKeysByUserId(userId) : await getAllApiKeys();
    const apiKeyIds = apiKeys.map((k: any) => k.id);
    const sb = getSupabase();

    let emails: any[] = [];
    let stats: any = { total: 0, sent: 0, failed: 0, queued: 0 };

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
          sent: allEmails.filter((e: any) => e.status === 'sent').length,
          failed: allEmails.filter((e: any) => e.status === 'failed').length,
          queued: allEmails.filter((e: any) => e.status === 'queued').length,
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
  } catch (err) {
    console.error('Dashboard overview error:', err);
    res.status(500).json({ error: { type: 'internal_error', message: 'Failed to load overview.' } });
  }
});

export default router;

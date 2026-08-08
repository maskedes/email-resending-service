import { Router, Request, Response } from 'express';
import {
  createDomain,
  getAllDomains,
  getDomainById,
  verifyDomainDns,
  deleteDomain,
} from '../services/domainService';
import { queryOne } from '../database/db';

const router = Router();

// ── Realtime event bus ──────────────────────────────────────────────────────
// Clients subscribe via GET /api/domains/events (SSE). The verification route
// broadcasts per-domain results so the dashboard updates without polling.
const clients = new Map<string, Response>();

/** Returns the most recently created active API key (used as a dev fallback). */
async function getMostRecentApiKey(): Promise<{ id: string } | undefined> {
  return queryOne<{ id: string }>(
    `SELECT id FROM api_keys WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1`
  );
}

function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients.values()) {
    try {
      res.write(payload);
    } catch {
      /* client disconnected */
    }
  }
}

function pruneClients() {
  for (const [id, res] of clients) {
    if (res.writableEnded || res.destroyed) clients.delete(id);
  }
}

router.get('/events', (req: Request, res: Response): void => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  clients.set(id, res);

  // Heartbeat keeps the connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  res.write(`event: connected\ndata: ${JSON.stringify({ clientId: id })}\n\n`);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(id);
  });

  pruneClients();
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;

  if (!name) {
    res.status(400).json({
      error: { type: 'validation_error', message: 'Domain name is required.' },
    });
    return;
  }

  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  if (!domainRegex.test(name)) {
    res.status(400).json({
      error: { type: 'validation_error', message: 'Please provide a valid domain name (e.g., example.com).' },
    });
    return;
  }

  // If auth hasn't provided a per-user apiKeyId (e.g. dashboard dev mode with
  // auth skipped), fall back to the most recent active API key so the FK
  // constraint is satisfied and the domain is reachable from the dashboard.
  let apiKeyId = (req as any).apiKeyId;
  if (!apiKeyId) {
    const fallback = await getMostRecentApiKey();
    if (fallback) apiKeyId = fallback.id;
  }

  if (!apiKeyId) {
    res.status(400).json({
      error: { type: 'validation_error', message: 'No API key available. Create an API key first.' },
    });
    return;
  }

  try {
    const domain = await createDomain({ apiKeyId, name });

    // Kick off an immediate DNS check so the UI gets real status right away.
    verifyDomainDns(domain.id)
      .then((result) => {
        if (result) broadcast('domain-updated', { id: domain.id, verification: result });
      })
      .catch(() => {
        /* non-fatal; user can re-check */
      });

    res.status(201).json({ domain });
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({ error: { type: 'conflict', message: 'This domain has already been added.' } });
      return;
    }
    res.status(500).json({ error: { type: 'server_error', message: 'Failed to create domain.' } });
  }
});

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const domains = await getAllDomains();
  res.json({ data: domains });
});

router.post('/:id/verify', async (req: Request, res: Response): Promise<void> => {
  const result = await verifyDomainDns(req.params.id);

  if (!result) {
    res.status(404).json({ error: { type: 'not_found', message: 'Domain not found.' } });
    return;
  }

  broadcast('domain-updated', { id: result.domain.id, verification: result });
  res.json({ domain: result.domain, checks: result.checks, overall: result.overall });
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const success = await deleteDomain(req.params.id);

  if (!success) {
    res.status(404).json({ error: { type: 'not_found', message: 'Domain not found.' } });
    return;
  }

  broadcast('domain-deleted', { id: req.params.id });
  res.json({ message: 'Domain deleted successfully.' });
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const domain = await getDomainById(req.params.id);

  if (!domain) {
    res.status(404).json({ error: { type: 'not_found', message: 'Domain not found.' } });
    return;
  }

  res.json({ domain });
});

export default router;
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import {
  listForwardingRules,
  createForwardingRule,
  deleteForwardingRule,
} from '../services/forwardingService';

const router = Router();

// Every rule is owned by an API key; all routes are scoped to the
// authenticated key so one tenant can never read or mutate another's rules.
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const rules = await listForwardingRules(req.apiKey!.id);
  res.json({ data: rules });
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { domain, alias, destination } = req.body || {};

  if (!domain || !alias || !destination) {
    res.status(400).json({
      error: { type: 'validation_error', message: '"domain", "alias" and "destination" are all required.' },
    });
    return;
  }

  try {
    const rule = await createForwardingRule({
      apiKeyId: req.apiKey!.id,
      domain: String(domain),
      alias: String(alias),
      destination: String(destination),
    });
    res.status(201).json({ rule });
  } catch (error: any) {
    if (error.status === 400 || error.status === 403 || error.status === 409) {
      res.status(error.status).json({ error: { type: 'validation_error', message: error.message } });
      return;
    }
    console.error('Error creating forwarding rule:', error);
    res.status(500).json({ error: { type: 'server_error', message: 'Failed to create forwarding rule.' } });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const ok = await deleteForwardingRule(req.params.id, req.apiKey!.id);
  if (!ok) {
    res.status(404).json({ error: { type: 'not_found', message: 'Forwarding rule not found.' } });
    return;
  }
  res.json({ message: 'Forwarding rule deleted.' });
});

export default router;

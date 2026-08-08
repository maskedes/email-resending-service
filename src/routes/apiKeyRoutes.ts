import { Router, Request, Response } from 'express';
import { createApiKey, getAllApiKeys, deactivateApiKey, deleteApiKey } from '../services/apiKeyService';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { name, email } = req.body;

  if (!name || !email) {
    res.status(400).json({
      error: {
        type: 'validation_error',
        message: 'Both "name" and "email" are required.',
      },
    });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({
      error: {
        type: 'validation_error',
        message: 'Please provide a valid email address.',
      },
    });
    return;
  }

  const { apiKey, rawKey } = await createApiKey({ name, email });

  res.status(201).json({
    id: apiKey.id,
    key: rawKey,
    name: apiKey.name,
    email: apiKey.email,
    created_at: apiKey.created_at,
    message: 'API key created successfully. Save this key securely - it will not be shown again.',
  });
});

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const keys = await getAllApiKeys();

  res.json({
    data: keys.map((k) => ({
      id: k.id,
      name: k.name,
      email: k.email,
      is_active: k.is_active,
      total_emails_sent: k.total_emails_sent,
      created_at: k.created_at,
      last_used_at: k.last_used_at,
    })),
  });
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const success = await deactivateApiKey(req.params.id);

  if (!success) {
    res.status(404).json({
      error: {
        type: 'not_found',
        message: 'API key not found.',
      },
    });
    return;
  }

  res.json({
    message: 'API key deactivated successfully.',
  });
});

// Permanently delete an API key (auto-revokes + removes it from the database).
router.delete('/:id/delete', async (req: Request, res: Response): Promise<void> => {
  const success = await deleteApiKey(req.params.id);

  if (!success) {
    res.status(404).json({
      error: {
        type: 'not_found',
        message: 'API key not found.',
      },
    });
    return;
  }

  res.json({
    message: 'API key deleted successfully.',
  });
});

export default router;

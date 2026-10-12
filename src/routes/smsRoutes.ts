import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { sendSms, getSmsById, getSmsByApiKeyId, getSmsEvents, getSmsStats, isValidPhone } from '../services/smsService';
import { checkRateLimit } from '../services/rateLimiter';
import { config } from '../config';

const router = Router();

// Send SMS (queued → gateway phone delivers)
router.post('/send', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { to, body, text, message, from, tags, scheduleInMs, gatewayId } = req.body;
  const msgBody: string | undefined = body || text || message;

  if (!to) {
    res.status(400).json({ error: { type: 'validation_error', message: 'The "to" field (phone number) is required.' } });
    return;
  }
  if (!isValidPhone(String(to))) {
    res.status(400).json({ error: { type: 'validation_error', message: 'Invalid phone number. Use E.164 e.g. +14155552671.' } });
    return;
  }
  if (!msgBody || !String(msgBody).trim()) {
    res.status(400).json({ error: { type: 'validation_error', message: 'Message body is required (field: body or text).' } });
    return;
  }
  if (String(msgBody).length > 1600) {
    res.status(400).json({ error: { type: 'validation_error', message: 'Message too long (max 1600 chars).' } });
    return;
  }

  const limit = config.smsRateLimit.perSecond;
  const rl = await checkRateLimit(`sms:${req.apiKey!.id}`, limit);
  res.set('X-RateLimit-Limit', String(limit));
  res.set('X-RateLimit-Remaining', String(rl.remaining));
  if (!rl.allowed) {
    res.status(429).json({ error: { type: 'rate_limit_exceeded', message: `SMS rate limit: ${limit}/sec per API key. Try again in ${Math.ceil(rl.retryAfterSeconds)}s.` } });
    return;
  }

  const sms = await sendSms(req.apiKey!.id, { to: String(to), body: String(msgBody), from: from ? String(from) : undefined, tags, scheduleInMs, gatewayId });
  res.status(200).json({ id: sms.id, to: sms.to_phone, body: sms.body, status: sms.status, parts: sms.parts, created_at: sms.created_at });
});

// List
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 100);
  const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);
  const list = await getSmsByApiKeyId(req.apiKey!.id, limit, offset);
  res.json({
    data: list.map((s) => ({ id: s.id, to: s.to_phone, body: s.body, status: s.status, parts: s.parts, created_at: s.created_at, sent_at: s.sent_at, delivered_at: s.delivered_at })),
    pagination: { limit, offset },
  });
});

router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const stats = await getSmsStats(req.apiKey!.id);
  res.json(stats);
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const sms = await getSmsById(req.params.id);
  if (!sms || sms.api_key_id !== req.apiKey!.id) {
    res.status(404).json({ error: { type: 'not_found', message: 'SMS not found.' } });
    return;
  }
  const events = await getSmsEvents(sms.id);
  res.json({ id: sms.id, to: sms.to_phone, from: sms.from_phone, body: sms.body, status: sms.status, parts: sms.parts, error_message: sms.error_message, created_at: sms.created_at, sent_at: sms.sent_at, delivered_at: sms.delivered_at, events });
});

export default router;

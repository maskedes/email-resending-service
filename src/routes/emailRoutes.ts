import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { sendEmail, getEmailById, getEmailsByApiKeyId, getEmailEvents, getEmailStats, SendEmailInput } from '../services/emailService';

const router = Router();

router.post('/send', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { from, to, subject, html, text, reply_to, tags, scheduleInMs } = req.body;

    if (!to) {
      res.status(400).json({
        error: { type: 'validation_error', message: 'The "to" field is required.' },
      });
      return;
    }

    if (!subject) {
      res.status(400).json({
        error: { type: 'validation_error', message: 'The "subject" field is required.' },
      });
      return;
    }

    if (!html && !text) {
      res.status(400).json({
        error: { type: 'validation_error', message: 'Either "html" or "text" content is required.' },
      });
      return;
    }

    const input: SendEmailInput = { from, to, subject, html, text, reply_to, tags, scheduleInMs };
    const email = await sendEmail(req.apiKey!.id, input);

    res.status(200).json({
      id: email.id,
      from: email.from_email,
      to: email.to_email,
      subject: email.subject,
      status: email.status,
      created_at: email.created_at,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    res.status(500).json({
      error: { type: 'internal_error', message: 'Failed to send email. Please try again.' },
    });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const emails = await getEmailsByApiKeyId(req.apiKey!.id, limit, offset);

  res.json({
    data: emails.map((email) => ({
      id: email.id,
      from: email.from_email,
      to: email.to_email,
      subject: email.subject,
      status: email.status,
      created_at: email.created_at,
      sent_at: email.sent_at,
    })),
    pagination: { limit, offset },
  });
});

router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const stats = await getEmailStats(req.apiKey!.id);
  res.json(stats);
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const email = await getEmailById(req.params.id);

  if (!email || email.api_key_id !== req.apiKey!.id) {
    res.status(404).json({
      error: { type: 'not_found', message: 'Email not found.' },
    });
    return;
  }

  const events = await getEmailEvents(email.id);

  res.json({
    id: email.id,
    from: email.from_email,
    to: email.to_email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    status: email.status,
    created_at: email.created_at,
    sent_at: email.sent_at,
    delivered_at: email.delivered_at,
    error_message: email.error_message,
    events: events.map((e: any) => ({
      event: e.event,
      timestamp: e.timestamp,
      details: e.details,
    })),
  });
});

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { getApiKeyById, getApiKeyByInboundAddress } from '../services/apiKeyService';
import { sendEmail } from '../services/emailService';

const router = Router();

/**
 * Inbound email ingestion.
 *
 * Point your inbound mail provider (Cloudflare Email Workers, a Postfix
 * transport pipe, Mailgun/Postmark inbound, etc.) at:
 *
 *   POST /api/inbound/email
 *   Header: x-inbound-secret: <INBOUND_EMAIL_SECRET>
 *   Body:   { to, from, subject?, text?, html?, api_key_id? }
 *
 * The recipient (`to`) is matched against an API key's `email` address to find
 * the owning key. The key's per-key toggles are then enforced:
 *   - allow_incoming_email = false → the message is rejected (403).
 *   - allow_incoming_email = true  → the message is accepted, and when
 *     `forward_to` is set it is forwarded there via the normal send pipeline.
 *
 * If the endpoint is not configured (no INBOUND_EMAIL_SECRET) it responds 503.
 */

/** Rejects requests that do not carry the shared inbound secret. */
function requireInboundSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = config.inbound.secret;
  if (!secret) {
    res.status(503).json({
      error: { type: 'inbound_disabled', message: 'Inbound email is not configured on this server.' },
    });
    return;
  }

  const provided = req.headers[config.inbound.header] as string | undefined;
  if (!provided || provided !== secret) {
    res.status(401).json({
      error: { type: 'authentication_required', message: 'Invalid or missing inbound secret.' },
    });
    return;
  }

  next();
}

router.post('/email', requireInboundSecret, async (req: Request, res: Response): Promise<void> => {
  try {
    const { to, from, subject, text, html, api_key_id: apiKeyId } = req.body || {};

    if (!to || !from) {
      res.status(400).json({
        error: { type: 'validation_error', message: 'Both "to" and "from" are required.' },
      });
      return;
    }

    const recipient = String(to).trim();

    // Resolve the owning API key: explicit id wins, otherwise route by recipient.
    const apiKey = apiKeyId
      ? await getApiKeyById(String(apiKeyId))
      : await getApiKeyByInboundAddress(recipient);

    if (!apiKey) {
      res.status(404).json({
        error: { type: 'unknown_recipient', message: 'No active API key is associated with this recipient.' },
      });
      return;
    }

    // Per-key "Allow incoming email" toggle.
    if (apiKey.allow_incoming_email !== true) {
      res.status(403).json({
        error: {
          type: 'incoming_email_disabled',
          message: 'Incoming email is disabled for this API key.',
        },
      });
      return;
    }

    // Per-key "Forwarding" setting.
    const forwardTo = (apiKey.forward_to || '').trim();
    if (!forwardTo) {
      // Accepted and stored nowhere by design; no forwarder configured.
      res.status(202).json({ accepted: true, forwarded: false, forward_to: null });
      return;
    }

    const originalSubject = String(subject || '(no subject)');
    const forwarded = await sendEmail(apiKey.id, {
      from: config.defaultFrom.email,
      to: forwardTo,
      subject: originalSubject.toLowerCase().startsWith('fwd:')
        ? originalSubject
        : `Fwd: ${originalSubject}`,
      html: typeof html === 'string' ? html : undefined,
      text: typeof text === 'string' ? text : (html ? undefined : originalSubject),
      reply_to: String(from),
      tags: { forwarded_from: String(from), original_to: recipient },
    });

    res.status(202).json({
      accepted: true,
      forwarded: true,
      forward_to: forwardTo,
      forward_id: forwarded.id,
    });
  } catch (error: any) {
    console.error('Error handling inbound email:', error);
    res.status(500).json({
      error: { type: 'internal_error', message: 'Failed to process inbound email.' },
    });
  }
});

export default router;

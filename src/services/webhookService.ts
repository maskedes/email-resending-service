import { createHmac, randomBytes } from 'crypto';
import { getSupabase } from '../database/supabase';

/**
 * Event types that can be delivered to a webhook. These match the `event`
 * values recorded in the `email_events` table plus the lifecycle events
 * emitted by the email worker (queued/sent/failed).
 */
export const WEBHOOK_EVENTS = [
  'queued',
  'sent',
  'delivered',
  'bounced',
  'failed',
  'opened',
  'clicked',
  'complained',
  'unsubscribed',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/** Generates a new webhook signing secret (prefixed for easy identification). */
export function generateWebhookSecret(): string {
  return 'whsec_' + randomBytes(24).toString('hex');
}

/** Computes the HMAC-SHA256 signature for a raw request body. */
function signPayload(secret: string, rawBody: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
}

function parseEvents(events: string | null | undefined): string[] {
  if (!events) return [];
  return events
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

interface WebhookRow {
  id: string;
  url: string;
  secret: string;
  events: string | null;
}

/**
 * Delivers an email event to every active webhook subscribed to `event` for
 * the email's API key. Each delivery is an HTTP POST with a JSON body and an
 * `X-Webhook-Signature` header containing the HMAC-SHA256 of the body.
 *
 * This is fire-and-forget: all errors are swallowed so a slow or broken
 * endpoint can never block or fail the underlying email operation.
 */
export async function dispatchWebhooks(
  emailId: string,
  event: string,
  details?: string
): Promise<void> {
  try {
    const sb = getSupabase();

    const { data: email, error: emailErr } = await sb
      .from('emails')
      .select('id, api_key_id, from_email, from_name, to_email, subject, status')
      .eq('id', emailId)
      .single();

    if (emailErr || !email) return;

    const apiKeyId = (email as any).api_key_id as string;

    const { data: hooks, error: hookErr } = await sb
      .from('webhooks')
      .select('id, url, secret, events')
      .eq('api_key_id', apiKeyId)
      .eq('is_active', true);

    if (hookErr || !hooks || (hooks as WebhookRow[]).length === 0) return;

    const subscribers = (hooks as WebhookRow[]).filter((h) =>
      parseEvents(h.events).includes(event)
    );

    if (subscribers.length === 0) return;

    const payload = {
      id: `${emailId}:${event}:${Date.now()}`,
      event,
      created_at: new Date().toISOString(),
      data: {
        email_id: (email as any).id,
        api_key_id: apiKeyId,
        from: (email as any).from_name
          ? `${(email as any).from_name} <${(email as any).from_email}>`
          : (email as any).from_email,
        to: (email as any).to_email,
        subject: (email as any).subject,
        status: (email as any).status,
        details: details || null,
        timestamp: new Date().toISOString(),
      },
    };

    const rawBody = JSON.stringify(payload);

    await Promise.all(
      subscribers.map(async (h) => {
        try {
          const signature = signPayload(h.secret, rawBody);
          const res = await fetch(h.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signature,
              'X-Webhook-Event': event,
              'X-Webhook-Id': h.id,
              'User-Agent': 'E-NVOY-Webhooks/1.0',
            },
            body: rawBody,
            // Never let a slow endpoint stall the email pipeline.
            signal: AbortSignal.timeout(5000),
          });

          // Best-effort bookkeeping of the last successful attempt.
          if (res.ok) {
            await sb
              .from('webhooks')
              .update({ last_triggered_at: new Date().toISOString() })
              .eq('id', h.id);
          } else {
            console.warn(
              `[webhook] ${h.id} returned ${res.status} for event "${event}"`
            );
          }
        } catch (err) {
          console.warn(
            `[webhook] delivery to ${h.id} failed for event "${event}":`,
            (err as Error).message
          );
        }
      })
    );
  } catch (err) {
    console.warn('[webhook] dispatch error:', (err as Error).message);
  }
}

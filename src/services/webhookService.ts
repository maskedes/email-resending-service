import { createHmac, randomBytes } from 'crypto';
import { getSupabase } from '../database/supabase';
import { enqueueWebhookRetry } from '../queue/webhookQueue';

/**
 * Event types that can be delivered to a webhook. These match the `event`
 * values recorded in the `email_events` table plus the lifecycle events
 * emitted by the email/SMS workers and the SMS gateway.
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
  'sms.queued',
  'sms.sent',
  'sms.failed',
  'sms.delivered',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/** Total delivery attempts per webhook event, including the initial one. */
export const MAX_DELIVERY_ATTEMPTS = 4;

/** Delay before retry attempt N (0-indexed: retry #1, #2, #3). */
const RETRY_DELAYS_MS = [30_000, 5 * 60_000, 30 * 60_000];

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
 * Attempts delivery to a single webhook and logs the outcome in
 * `webhook_deliveries`. Retryable failures get re-enqueued via BullMQ with
 * exponential backoff (30s → 5m → 30m); after MAX_DELIVERY_ATTEMPTS the
 * delivery is logged as 'dead' and never retried again.
 *
 * Never throws — all errors are swallowed (fire-and-forget guarantee).
 */
export async function attemptDelivery(
  sb: ReturnType<typeof getSupabase>,
  hook: WebhookRow,
  event: string,
  rawBody: string,
  attempt: number
): Promise<'delivered' | 'pending_retry' | 'dead'> {
  let outcome: 'delivered' | 'pending_retry' | 'dead' = 'delivered';
  let httpStatus: number | null = null;
  let errorText: string | null = null;

  try {
    const signature = signPayload(hook.secret, rawBody);
    const res = await fetch(hook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
        'X-Webhook-Id': hook.id,
        'User-Agent': 'E-NVOY-Webhooks/1.0',
      },
      body: rawBody,
      // Never let a slow endpoint stall the email pipeline.
      signal: AbortSignal.timeout(5000),
    });

    httpStatus = res.status;
    if (res.ok) {
      outcome = 'delivered';
      await sb.from('webhooks').update({ last_triggered_at: new Date().toISOString() }).eq('id', hook.id);
    } else {
      errorText = `HTTP ${res.status}`;
      outcome = attempt >= MAX_DELIVERY_ATTEMPTS ? 'dead' : 'pending_retry';
    }
  } catch (err) {
    errorText = (err as Error).message;
    outcome = attempt >= MAX_DELIVERY_ATTEMPTS ? 'dead' : 'pending_retry';
  }

  // Log this attempt (service role bypasses RLS).
  await sb.from('webhook_deliveries').insert({
    webhook_id: hook.id,
    api_key_id: (hook as any).api_key_id,
    event,
    attempt,
    outcome,
    http_status: httpStatus,
    error: errorText,
    delivered_at: outcome === 'delivered' ? new Date().toISOString() : null,
  });

  if (outcome === 'pending_retry') {
    await enqueueWebhookRetry(
      { webhookId: hook.id, event, rawBody, attempt: attempt + 1 },
      RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length) - 1]
    ).catch((err) =>
      console.warn(`[webhook] failed to enqueue retry for ${hook.id} (attempt ${attempt + 1}):`, (err as Error).message)
    );
  }

  return outcome;
}

/**
 * Processes a retry attempt enqueued by attemptDelivery(). Called by the
 * webhook BullMQ worker. Re-fetches the webhook row so a deleted/paused
 * hook or a changed subscription never retries. Never throws.
 */
export async function processWebhookRetryJob(data: {
  webhookId: string;
  event: string;
  rawBody: string;
  attempt: number;
}): Promise<void> {
  try {
    const sb = getSupabase();
    const { data: hook, error } = await sb
      .from('webhooks')
      .select('id, url, secret, events, api_key_id, is_active')
      .eq('id', data.webhookId)
      .single();

    if (error || !hook || !hook.is_active) return; // hook gone/paused — stop retrying, quietly
    if (!parseEvents((hook as any).events).includes(data.event)) return; // unsubscribed

    await attemptDelivery(sb, hook as unknown as WebhookRow & { api_key_id: string }, data.event, data.rawBody, data.attempt);
  } catch (err) {
    console.warn('[webhook] retry job error:', (err as Error).message);
  }
}

/**
 * Delivers a payload to every active webhook subscribed to `event` for the
 * given API key. Each delivery is an HTTP POST with a JSON body and an
 * `X-Webhook-Signature` header containing the HMAC-SHA256 of the body.
 *
 * This is fire-and-forget: all errors are swallowed so a slow or broken
 * endpoint can never block or fail the underlying operation.
 */
async function deliverWebhooks(
  sb: ReturnType<typeof getSupabase>,
  apiKeyId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { data: hooks, error: hookErr } = await sb
    .from('webhooks')
    .select('id, url, secret, events, api_key_id')
    .eq('api_key_id', apiKeyId)
    .eq('is_active', true);

  if (hookErr || !hooks || (hooks as any[]).length === 0) return;

  const subscribers = (hooks as any[]).filter((h) =>
    parseEvents(h.events).includes(event)
  );

  if (subscribers.length === 0) return;

  const rawBody = JSON.stringify(payload);

  await Promise.all(
    subscribers.map((h) => attemptDelivery(sb, h as any, event, rawBody, 1))
  );
}

/**
 * Delivers an email event to every active webhook subscribed to `event` for
 * the email's API key. This is fire-and-forget: it never blocks or fails the
 * underlying email operation.
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

    await deliverWebhooks(sb, apiKeyId, event, payload);
  } catch (err) {
    console.warn('[webhook] dispatch error:', (err as Error).message);
  }
}

/**
 * Delivers an SMS event to every active webhook subscribed to `event` for
 * the SMS's API key. `event` should be one of "sms.queued", "sms.sent",
 * "sms.failed", "sms.delivered". Fire-and-forget, same as email delivery.
 */
export async function dispatchSmsWebhooks(
  smsId: string,
  event: string,
  details?: string
): Promise<void> {
  try {
    const sb = getSupabase();

    const { data: sms, error: smsErr } = await sb
      .from('sms_messages')
      .select('id, api_key_id, to_phone, from_phone, body, parts, status')
      .eq('id', smsId)
      .single();

    if (smsErr || !sms) return;

    const apiKeyId = (sms as any).api_key_id as string;

    const payload = {
      id: `${smsId}:${event}:${Date.now()}`,
      event,
      created_at: new Date().toISOString(),
      data: {
        sms_id: (sms as any).id,
        api_key_id: apiKeyId,
        to: (sms as any).to_phone,
        from: (sms as any).from_phone,
        body: (sms as any).body,
        parts: (sms as any).parts,
        status: (sms as any).status,
        details: details || null,
        timestamp: new Date().toISOString(),
      },
    };

    await deliverWebhooks(sb, apiKeyId, event, payload);
  } catch (err) {
    console.warn('[webhook] SMS dispatch error:', (err as Error).message);
  }
}

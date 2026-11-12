import { getSupabase } from '../database/supabase';
/**
 * Event types that can be delivered to a webhook. These match the `event`
 * values recorded in the `email_events` table plus the lifecycle events
 * emitted by the email/SMS workers and the SMS gateway.
 */
export declare const WEBHOOK_EVENTS: readonly ["queued", "sent", "delivered", "bounced", "failed", "opened", "clicked", "complained", "unsubscribed", "sms.queued", "sms.sent", "sms.failed", "sms.delivered"];
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
/** Total delivery attempts per webhook event, including the initial one. */
export declare const MAX_DELIVERY_ATTEMPTS = 4;
/** Generates a new webhook signing secret (prefixed for easy identification). */
export declare function generateWebhookSecret(): string;
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
export declare function attemptDelivery(sb: ReturnType<typeof getSupabase>, hook: WebhookRow, event: string, rawBody: string, attempt: number): Promise<'delivered' | 'pending_retry' | 'dead'>;
/**
 * Processes a retry attempt enqueued by attemptDelivery(). Called by the
 * webhook BullMQ worker. Re-fetches the webhook row so a deleted/paused
 * hook or a changed subscription never retries. Never throws.
 */
export declare function processWebhookRetryJob(data: {
    webhookId: string;
    event: string;
    rawBody: string;
    attempt: number;
}): Promise<void>;
/**
 * Delivers an email event to every active webhook subscribed to `event` for
 * the email's API key. This is fire-and-forget: it never blocks or fails the
 * underlying email operation.
 */
export declare function dispatchWebhooks(emailId: string, event: string, details?: string): Promise<void>;
/**
 * Delivers an SMS event to every active webhook subscribed to `event` for
 * the SMS's API key. `event` should be one of "sms.queued", "sms.sent",
 * "sms.failed", "sms.delivered". Fire-and-forget, same as email delivery.
 */
export declare function dispatchSmsWebhooks(smsId: string, event: string, details?: string): Promise<void>;
export {};
//# sourceMappingURL=webhookService.d.ts.map
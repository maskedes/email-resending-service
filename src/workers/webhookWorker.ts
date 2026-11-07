import { startWebhookWorker, WebhookDeliveryJobData } from '../queue/webhookQueue';
import { processWebhookRetryJob } from '../services/webhookService';

/** Boots the webhook retry worker. Call once during application startup. */
export function initWebhookWorker(): void {
  startWebhookWorker({
    process: (data: WebhookDeliveryJobData) => processWebhookRetryJob(data),
  });
}

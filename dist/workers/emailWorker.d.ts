import { EmailJobData } from '../queue/emailQueue';
/**
 * Loads the queued email record and delivers it via the Brevo HTTPS API.
 * Updates status/events and the API key's usage counter on success or failure.
 */
export declare function processEmailJob(data: EmailJobData): Promise<void>;
/** Boots the queue consumer. Call once during application startup. */
export declare function initEmailWorker(): void;
//# sourceMappingURL=emailWorker.d.ts.map
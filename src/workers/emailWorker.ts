import { startEmailWorker, EmailJobData } from '../queue/emailQueue';
import { sendViaBrevo } from '../services/brevo';
import {
  getEmailById,
  recordEmailFailure,
  recordEmailSuccess,
} from '../services/emailService';
import { incrementEmailCount as incrementKeyCount } from '../services/apiKeyService';

/**
 * Loads the queued email record and delivers it via the Brevo HTTPS API.
 * Updates status/events and the API key's usage counter on success or failure.
 */
export async function processEmailJob(data: EmailJobData): Promise<void> {
  const email = await getEmailById(data.emailId);

  if (!email) {
    throw new Error(`Email record ${data.emailId} not found`);
  }

  const from = email.from_name
    ? `"${email.from_name}" <${email.from_email}>`
    : email.from_email;

  try {
    const info = await sendViaBrevo({
      from,
      to: email.to_email,
      subject: email.subject,
      html: email.html || undefined,
      text: email.text || undefined,
    });

    await recordEmailSuccess(data.emailId, info.messageId || 'unknown');
    await incrementKeyCount(email.api_key_id);
  } catch (error: any) {
    await recordEmailFailure(data.emailId, error.message || 'Unknown error');
    // Re-throw so BullMQ can retry (up to the configured attempts).
    throw error;
  }
}

/** Boots the queue consumer. Call once during application startup. */
export function initEmailWorker(): void {
  startEmailWorker({ process: processEmailJob });
}
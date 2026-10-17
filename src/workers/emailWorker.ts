import { startEmailWorker, EmailJobData } from '../queue/emailQueue';
import { sendViaBrevo } from '../services/brevo';
import {
  getEmailById,
  recordEmailFailure,
  recordEmailSuccess,
} from '../services/emailService';
import { incrementEmailCount as incrementKeyCount } from '../services/apiKeyService';

/**
 * Extracts reply-to + tags from the stored metadata.
 *
 * Newer rows use `{ _reply_to, tags }`; legacy rows stored a flat tags object
 * directly. Both shapes are handled so old emails keep working.
 */
function readMetadata(metadata: unknown): { replyTo?: string; tags?: Record<string, string> } {
  if (!metadata || typeof metadata !== 'object') return {};
  const m = metadata as Record<string, unknown>;

  const replyTo = typeof m._reply_to === 'string' && m._reply_to ? m._reply_to : undefined;

  let tags: Record<string, string> | undefined;
  if (m.tags && typeof m.tags === 'object' && !Array.isArray(m.tags)) {
    tags = m.tags as Record<string, string>;
  } else {
    // Legacy flat shape — everything except the reserved key is a tag.
    const rest: Record<string, string> = {};
    for (const [k, v] of Object.entries(m)) {
      if (k === '_reply_to' || k === 'tags') continue;
      rest[k] = String(v);
    }
    if (Object.keys(rest).length > 0) tags = rest;
  }

  return { replyTo, tags };
}

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

  const { replyTo, tags } = readMetadata(email.metadata);

  try {
    const info = await sendViaBrevo({
      from,
      to: email.to_email,
      subject: email.subject,
      html: email.html || undefined,
      text: email.text || undefined,
      replyTo,
      tags: tags ? Object.entries(tags).map(([k, v]) => `${k}:${v}`) : undefined,
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
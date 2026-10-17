import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { getSupabase } from '../database/supabase';
import { enqueueEmail } from '../queue/emailQueue';
import { dispatchWebhooks } from './webhookService';

export interface SendEmailInput {
  from?: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  tags?: Record<string, string>;
  /** Optional schedule delay in milliseconds (future/scheduled sending). */
  scheduleInMs?: number;
}

export interface EmailRecord {
  id: string;
  api_key_id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string;
  html: string | null;
  text: string | null;
  status: string;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  metadata: any;
}

/** Parse a "Name <email>" string into its parts, or fall back to defaults. */
function normalizeEmailLiteralIp(email: string): string {
  const ipv4LiteralMatch = email.match(/^(?<local>[^@]+)@(?<ip>(?:\d{1,3}\.){3}\d{1,3})$/);
  if (ipv4LiteralMatch && ipv4LiteralMatch.groups) {
    return `${ipv4LiteralMatch.groups.local}@[${ipv4LiteralMatch.groups.ip}]`;
  }
  return email;
}

export function parseFrom(from?: string): { email: string; name: string } {
  let email = config.defaultFrom.email;
  let name = config.defaultFrom.name;

  if (from) {
    const match = from.match(/^(.*?)<([^>]+)>$/);
    if (match) {
      // Display name is always caller-controlled (cosmetic only).
      name = match[1].trim().replace(/"/g, '') || config.defaultFrom.name;
      if (!config.enforcePlatformFrom) {
        email = normalizeEmailLiteralIp(match[2].trim());
      }
    } else if (from.includes('@') && !config.enforcePlatformFrom) {
      email = normalizeEmailLiteralIp(from.trim());
    }
    // When enforcePlatformFrom is on, the sender email stays on the platform
    // domain (verified with the provider) so delivery is never rejected.
  } else {
    email = normalizeEmailLiteralIp(email);
  }

  return { email, name };
}

/**
 * Accepts an email for delivery: records it (status = queued) and enqueues a
 * background job. Actual SMTP delivery happens in the worker.
 */
export async function sendEmail(apiKeyId: string, input: SendEmailInput): Promise<EmailRecord> {
  const id = uuidv4();
  const { email, name } = parseFrom(input.from);
  const scheduledAt = input.scheduleInMs
    ? new Date(Date.now() + input.scheduleInMs).toISOString()
    : null;

  // `reply_to` has no dedicated column, so both it and any caller tags live in
  // the metadata JSONB. `_reply_to` is a reserved key so legacy rows (which
  // stored a flat tags object) still read back correctly in the worker.
  const metadata: Record<string, unknown> = {};
  if (input.reply_to) metadata._reply_to = String(input.reply_to).trim();
  if (input.tags && typeof input.tags === 'object') metadata.tags = input.tags;
  const metadataValue = Object.keys(metadata).length > 0 ? metadata : null;

  const sb = getSupabase();
  await sb.from('emails').insert({
    id, api_key_id: apiKeyId, from_email: email, from_name: name,
    to_email: input.to, subject: input.subject,
    html: input.html || null, text: input.text || null,
    metadata: metadataValue, scheduled_at: scheduledAt,
  });

  await addEmailEvent(id, 'queued', 'Email queued for delivery');

  await enqueueEmail({ emailId: id }, { delay: input.scheduleInMs });

  const { data } = await sb.from('emails').select('*').eq('id', id).single();
  return data as EmailRecord;
}

export async function addEmailEvent(emailId: string, event: string, details?: string): Promise<void> {
  const sb = getSupabase();
  await sb.from('email_events').insert({ email_id: emailId, event, details: details || null });

  // Fan out to any subscribed webhooks. Fire-and-forget: never block the
  // caller and never let a webhook failure break email processing.
  dispatchWebhooks(emailId, event, details).catch(() => {});
}

export async function recordEmailSuccess(emailId: string, messageId: string): Promise<void> {
  const sb = getSupabase();
  await sb.from('emails').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', emailId);
  await addEmailEvent(emailId, 'sent', `Message ID: ${messageId}`);
}

export async function recordEmailFailure(emailId: string, errorMessage: string): Promise<void> {
  const sb = getSupabase();
  await sb.from('emails').update({ status: 'failed', error_message: errorMessage }).eq('id', emailId);
  await addEmailEvent(emailId, 'failed', errorMessage);
}

export async function incrementEmailCount(apiKeyId: string): Promise<void> {
  const sb = getSupabase();
  const { data } = await sb.from('api_keys').select('total_emails_sent').eq('id', apiKeyId).single();
  if (data) {
    await sb.from('api_keys').update({ total_emails_sent: (data.total_emails_sent || 0) + 1 }).eq('id', apiKeyId);
  }
}

export async function getEmailById(id: string): Promise<EmailRecord | null> {
  const sb = getSupabase();
  const { data, error } = await sb.from('emails').select('*').eq('id', id).single();
  if (error || !data) return null;
  return data as EmailRecord;
}

export async function getEmailsByApiKeyId(apiKeyId: string, limit = 50, offset = 0): Promise<EmailRecord[]> {
  const sb = getSupabase();
  const { data, error } = await sb.from('emails')
    .select('*').eq('api_key_id', apiKeyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data || []) as EmailRecord[];
}

export async function getEmailEvents(emailId: string): Promise<any[]> {
  const sb = getSupabase();
  const { data, error } = await sb.from('email_events')
    .select('*').eq('email_id', emailId).order('timestamp', { ascending: true });
  if (error) throw error;
  return data || [];
}

export interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  queued: number;
}

export async function getEmailStats(apiKeyId: string): Promise<EmailStats> {
  const sb = getSupabase();
  const { data, error } = await sb.from('emails')
    .select('status').eq('api_key_id', apiKeyId);
  if (error || !data) return { total: 0, sent: 0, failed: 0, queued: 0 };
  return {
    total: data.length,
    sent: data.filter((e: any) => e.status === 'sent').length,
    failed: data.filter((e: any) => e.status === 'failed').length,
    queued: data.filter((e: any) => e.status === 'queued').length,
  };
}

import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { query, queryOne } from '../database/db';
import { enqueueEmail } from '../queue/emailQueue';

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
      name = match[1].trim().replace(/"/g, '') || config.defaultFrom.name;
      email = normalizeEmailLiteralIp(match[2].trim());
    } else if (from.includes('@')) {
      email = normalizeEmailLiteralIp(from.trim());
    }
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
  const metadata = input.tags ? JSON.stringify(input.tags) : null;
  const scheduledAt = input.scheduleInMs
    ? new Date(Date.now() + input.scheduleInMs).toISOString()
    : null;

  await query(
    `INSERT INTO emails (id, api_key_id, from_email, from_name, to_email, subject, html, text, metadata, scheduled_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, apiKeyId, email, name, input.to, input.subject, input.html || null, input.text || null, metadata, scheduledAt]
  );

  await addEmailEvent(id, 'queued', 'Email queued for delivery');

  await enqueueEmail({ emailId: id }, { delay: input.scheduleInMs });

  return (await queryOne<EmailRecord>(`SELECT * FROM emails WHERE id = $1`, [id]))!;
}

export async function addEmailEvent(emailId: string, event: string, details?: string): Promise<void> {
  await query(
    `INSERT INTO email_events (email_id, event, details) VALUES ($1, $2, $3)`,
    [emailId, event, details || null]
  );
}

export async function recordEmailSuccess(emailId: string, messageId: string): Promise<void> {
  await query(
    `UPDATE emails SET status = 'sent', sent_at = now() WHERE id = $1`,
    [emailId]
  );
  await addEmailEvent(emailId, 'sent', `Message ID: ${messageId}`);
}

export async function recordEmailFailure(emailId: string, errorMessage: string): Promise<void> {
  await query(
    `UPDATE emails SET status = 'failed', error_message = $1 WHERE id = $2`,
    [errorMessage, emailId]
  );
  await addEmailEvent(emailId, 'failed', errorMessage);
}

export async function incrementEmailCount(apiKeyId: string): Promise<void> {
  await query(`UPDATE api_keys SET total_emails_sent = total_emails_sent + 1 WHERE id = $1`, [apiKeyId]);
}

export async function getEmailById(id: string): Promise<EmailRecord | null> {
  return (await queryOne<EmailRecord>(`SELECT * FROM emails WHERE id = $1`, [id])) || null;
}

export async function getEmailsByApiKeyId(apiKeyId: string, limit = 50, offset = 0): Promise<EmailRecord[]> {
  return query<EmailRecord>(
    `SELECT * FROM emails WHERE api_key_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [apiKeyId, limit, offset]
  );
}

export async function getEmailEvents(emailId: string): Promise<any[]> {
  return query(
    `SELECT * FROM email_events WHERE email_id = $1 ORDER BY timestamp ASC`,
    [emailId]
  );
}

export interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  queued: number;
}

export async function getEmailStats(apiKeyId: string): Promise<EmailStats> {
  const row = await queryOne<{ total: string; sent: string; failed: string; queued: string }>(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'sent') as sent,
       COUNT(*) FILTER (WHERE status = 'failed') as failed,
       COUNT(*) FILTER (WHERE status = 'queued') as queued
     FROM emails WHERE api_key_id = $1`,
    [apiKeyId]
  );

  return {
    total: Number(row?.total || 0),
    sent: Number(row?.sent || 0),
    failed: Number(row?.failed || 0),
    queued: Number(row?.queued || 0),
  };
}

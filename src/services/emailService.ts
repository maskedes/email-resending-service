import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { getSupabase } from '../database/supabase';
import { enqueueEmail } from '../queue/emailQueue';
import { dispatchWebhooks } from './webhookService';

export interface AttachmentInput {
  /** Display name, e.g. "banner.png". */
  name?: string;
  /** Resend-compatible alias for `name`. */
  filename?: string;
  /** Base64-encoded file content (no data: URI prefix). */
  content: string;
  /** Ignored by validation — the MIME type is detected from magic bytes. */
  content_type?: string;
}

export interface NormalizedAttachment {
  name: string;
  /** Base64 content, decoded-length-tracked. */
  content: string;
  mimeType: string;
  bytes: number;
}

const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
];

function detectImageMime(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length >= 4 && bytes.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (bytes.length >= 2 && bytes.toString('ascii', 0, 2) === 'BM') return 'image/bmp';
  const head = bytes.toString('utf8', 0, Math.min(bytes.length, 100)).trimStart();
  if (head.startsWith('<svg') || head.startsWith('<?xml') || head.startsWith('\uFEFF<svg')) return 'image/svg+xml';
  return null;
}

/**
 * Validates an attachments array for inline media on outgoing emails.
 * Images only (magic-byte sniffed, not the declared content_type), capped so a
 * single request can't bloat the emails table or the Brevo payload.
 */
export function normalizeAttachments(input: unknown): NormalizedAttachment[] | undefined {
  if (input === undefined || input === null) return undefined;
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error('attachments must be an array of { name, content } objects');
  }
  if (input.length > 5) {
    throw new Error('Too many attachments (max 5).');
  }

  let totalBytes = 0;
  const out: NormalizedAttachment[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') {
      throw new Error('Each attachment must be an object with a base64 "content".');
    }
    const a = item as AttachmentInput;
    const name = (a.name || a.filename || '').toString().trim();
    if (!name) throw new Error('Each attachment needs a "name" (or "filename").');
    if (typeof a.content !== 'string' || !a.content.trim()) {
      throw new Error(`Attachment "${name}" is missing base64 "content".`);
    }

    const bytes = Buffer.from(a.content, 'base64');
    if (bytes.length === 0) throw new Error(`Attachment "${name}" has invalid base64 content.`);
    if (bytes.length > 2 * 1024 * 1024) {
      throw new Error(`Attachment "${name}" exceeds the 2 MB per-file limit.`);
    }
    totalBytes += bytes.length;
    if (totalBytes > 8 * 1024 * 1024) {
      throw new Error('Attachments exceed the 8 MB total limit.');
    }

    const mime = detectImageMime(bytes);
    if (!mime) {
      throw new Error(
        `Attachment "${name}" is not an accepted image. Allowed: JPEG, PNG, GIF, WebP, BMP, SVG.`,
      );
    }
    if (mime === 'image/svg+xml' && (a.content.includes('<script') || a.content.toLowerCase().includes('onload='))) {
      // Inline SVG must not carry script hooks (it renders in the mail client).
      throw new Error(`Attachment "${name}" (SVG) contains script handlers and was rejected.`);
    }

    out.push({ name, content: a.content.trim(), mimeType: mime, bytes: bytes.length });
  }
  return out;
}

export interface SendEmailInput {
  from?: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  tags?: Record<string, string>;
  /** Optional base64 image attachments (max 5 files, 2 MB each, 8 MB total). */
  attachments?: AttachmentInput[];
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
  const attachments = normalizeAttachments(input.attachments);
  if (attachments) metadata.attachments = attachments;
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

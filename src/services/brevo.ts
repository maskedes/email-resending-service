// Brevo HTTPS email sender (replaces Kamatera SMTP — WispByte blocks SMTP ports).
// Uses the Brevo v3 transactional API over HTTPS (port 443).
import { config } from '../config';

export interface MailMessage {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

interface ParsedAddress {
  name?: string;
  email: string;
}

function parseAddress(raw: string): ParsedAddress {
  const m = raw.match(/"?([^"<>]*)"?\s*<([^<>\s@]+@[^<>\s]+)>/);
  if (m) {
    const name = (m[1] || '').trim();
    return name ? { name, email: m[2].trim() } : { email: m[2].trim() };
  }
  return { email: raw.trim() };
}

function parseRecipients(raw: string): Array<{ email: string }> {
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((email) => ({ email }));
}

export async function sendViaBrevo(message: MailMessage): Promise<{ messageId: string }> {
  const apiKey = config.brevo.apiKey;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not configured');
  }
  const sender = parseAddress(message.from);
  const to = parseRecipients(message.to);
  if (!to.length) {
    throw new Error('No recipients');
  }

  const payload: Record<string, unknown> = {
    sender,
    to,
    subject: message.subject,
  };
  if (message.html) payload.htmlContent = message.html;
  if (message.text) payload.textContent = message.text;
  if (message.replyTo) payload.replyTo = parseAddress(message.replyTo);
  if (message.headers) payload.headers = message.headers;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`Brevo error ${res.status}: ${bodyText.slice(0, 200)}`);
  }
  let messageId = 'unknown';
  try {
    messageId = JSON.parse(bodyText).messageId || 'unknown';
  } catch {
    // keep 'unknown'
  }
  return { messageId };
}

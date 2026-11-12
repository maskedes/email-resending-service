"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAttachments = normalizeAttachments;
exports.parseFrom = parseFrom;
exports.sendEmail = sendEmail;
exports.addEmailEvent = addEmailEvent;
exports.recordEmailSuccess = recordEmailSuccess;
exports.recordEmailFailure = recordEmailFailure;
exports.getEmailById = getEmailById;
exports.getEmailsByApiKeyId = getEmailsByApiKeyId;
exports.getEmailEvents = getEmailEvents;
exports.getEmailStats = getEmailStats;
const node_crypto_1 = require("node:crypto");
const config_1 = require("../config");
const supabase_1 = require("../database/supabase");
const emailQueue_1 = require("../queue/emailQueue");
const webhookService_1 = require("./webhookService");
const IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml',
];
function detectImageMime(bytes) {
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
        return 'image/jpeg';
    if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
        return 'image/png';
    if (bytes.length >= 4 && bytes.toString('ascii', 0, 4) === 'GIF8')
        return 'image/gif';
    if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP')
        return 'image/webp';
    if (bytes.length >= 2 && bytes.toString('ascii', 0, 2) === 'BM')
        return 'image/bmp';
    const head = bytes.toString('utf8', 0, Math.min(bytes.length, 100)).trimStart();
    if (head.startsWith('<svg') || head.startsWith('<?xml') || head.startsWith('\uFEFF<svg'))
        return 'image/svg+xml';
    return null;
}
/**
 * Validates an attachments array for inline media on outgoing emails.
 * Images only (magic-byte sniffed, not the declared content_type), capped so a
 * single request can't bloat the emails table or the Brevo payload.
 */
function normalizeAttachments(input) {
    if (input === undefined || input === null)
        return undefined;
    if (!Array.isArray(input) || input.length === 0) {
        throw new Error('attachments must be an array of { name, content } objects');
    }
    if (input.length > 5) {
        throw new Error('Too many attachments (max 5).');
    }
    let totalBytes = 0;
    const out = [];
    for (const item of input) {
        if (!item || typeof item !== 'object') {
            throw new Error('Each attachment must be an object with a base64 "content".');
        }
        const a = item;
        const name = (a.name || a.filename || '').toString().trim();
        if (!name)
            throw new Error('Each attachment needs a "name" (or "filename").');
        if (typeof a.content !== 'string' || !a.content.trim()) {
            throw new Error(`Attachment "${name}" is missing base64 "content".`);
        }
        const bytes = Buffer.from(a.content, 'base64');
        if (bytes.length === 0)
            throw new Error(`Attachment "${name}" has invalid base64 content.`);
        if (bytes.length > 2 * 1024 * 1024) {
            throw new Error(`Attachment "${name}" exceeds the 2 MB per-file limit.`);
        }
        totalBytes += bytes.length;
        if (totalBytes > 8 * 1024 * 1024) {
            throw new Error('Attachments exceed the 8 MB total limit.');
        }
        const mime = detectImageMime(bytes);
        if (!mime) {
            throw new Error(`Attachment "${name}" is not an accepted image. Allowed: JPEG, PNG, GIF, WebP, BMP, SVG.`);
        }
        if (mime === 'image/svg+xml' && (a.content.includes('<script') || a.content.toLowerCase().includes('onload='))) {
            // Inline SVG must not carry script hooks (it renders in the mail client).
            throw new Error(`Attachment "${name}" (SVG) contains script handlers and was rejected.`);
        }
        out.push({ name, content: a.content.trim(), mimeType: mime, bytes: bytes.length });
    }
    return out;
}
/** Parse a "Name <email>" string into its parts, or fall back to defaults. */
function normalizeEmailLiteralIp(email) {
    const ipv4LiteralMatch = email.match(/^(?<local>[^@]+)@(?<ip>(?:\d{1,3}\.){3}\d{1,3})$/);
    if (ipv4LiteralMatch && ipv4LiteralMatch.groups) {
        return `${ipv4LiteralMatch.groups.local}@[${ipv4LiteralMatch.groups.ip}]`;
    }
    return email;
}
function parseFrom(from) {
    let email = config_1.config.defaultFrom.email;
    let name = config_1.config.defaultFrom.name;
    if (from) {
        const match = from.match(/^(.*?)<([^>]+)>$/);
        if (match) {
            // Display name is always caller-controlled (cosmetic only).
            name = match[1].trim().replace(/"/g, '') || config_1.config.defaultFrom.name;
            if (!config_1.config.enforcePlatformFrom) {
                email = normalizeEmailLiteralIp(match[2].trim());
            }
        }
        else if (from.includes('@') && !config_1.config.enforcePlatformFrom) {
            email = normalizeEmailLiteralIp(from.trim());
        }
        // When enforcePlatformFrom is on, the sender email stays on the platform
        // domain (verified with the provider) so delivery is never rejected.
    }
    else {
        email = normalizeEmailLiteralIp(email);
    }
    return { email, name };
}
/**
 * Accepts an email for delivery: records it (status = queued) and enqueues a
 * background job. Actual SMTP delivery happens in the worker.
 */
async function sendEmail(apiKeyId, input) {
    const id = (0, node_crypto_1.randomUUID)();
    const { email, name } = parseFrom(input.from);
    const scheduledAt = input.scheduleInMs
        ? new Date(Date.now() + input.scheduleInMs).toISOString()
        : null;
    // `reply_to` has no dedicated column, so both it and any caller tags live in
    // the metadata JSONB. `_reply_to` is a reserved key so legacy rows (which
    // stored a flat tags object) still read back correctly in the worker.
    const metadata = {};
    if (input.reply_to)
        metadata._reply_to = String(input.reply_to).trim();
    if (input.tags && typeof input.tags === 'object')
        metadata.tags = input.tags;
    const attachments = normalizeAttachments(input.attachments);
    if (attachments)
        metadata.attachments = attachments;
    const metadataValue = Object.keys(metadata).length > 0 ? metadata : null;
    const sb = (0, supabase_1.getSupabase)();
    await sb.from('emails').insert({
        id, api_key_id: apiKeyId, from_email: email, from_name: name,
        to_email: input.to, subject: input.subject,
        html: input.html || null, text: input.text || null,
        metadata: metadataValue, scheduled_at: scheduledAt,
    });
    await addEmailEvent(id, 'queued', 'Email queued for delivery');
    try {
        await (0, emailQueue_1.enqueueEmail)({ emailId: id }, { delay: input.scheduleInMs });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Persist the failure so the operator can see what happened; the
        // route layer maps this to 503 (queue unavailable).
        await sb.from('emails').update({ status: 'failed', error_message: `Delivery queue unavailable: ${msg}` }).eq('id', id);
        await addEmailEvent(id, 'failed', `Message recorded but not queued — delivery queue unavailable (${msg})`);
        throw err;
    }
    const { data } = await sb.from('emails').select('*').eq('id', id).single();
    return data;
}
async function addEmailEvent(emailId, event, details) {
    const sb = (0, supabase_1.getSupabase)();
    await sb.from('email_events').insert({ email_id: emailId, event, details: details || null });
    // Fan out to any subscribed webhooks. Fire-and-forget: never block the
    // caller and never let a webhook failure break email processing.
    (0, webhookService_1.dispatchWebhooks)(emailId, event, details).catch(() => { });
}
async function recordEmailSuccess(emailId, messageId) {
    const sb = (0, supabase_1.getSupabase)();
    await sb.from('emails').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', emailId);
    await addEmailEvent(emailId, 'sent', `Message ID: ${messageId}`);
}
async function recordEmailFailure(emailId, errorMessage) {
    const sb = (0, supabase_1.getSupabase)();
    await sb.from('emails').update({ status: 'failed', error_message: errorMessage }).eq('id', emailId);
    await addEmailEvent(emailId, 'failed', errorMessage);
}
async function getEmailById(id) {
    const sb = (0, supabase_1.getSupabase)();
    const { data, error } = await sb.from('emails').select('*').eq('id', id).single();
    if (error || !data)
        return null;
    return data;
}
async function getEmailsByApiKeyId(apiKeyId, limit = 50, offset = 0) {
    const sb = (0, supabase_1.getSupabase)();
    const { data, error } = await sb.from('emails')
        .select('*').eq('api_key_id', apiKeyId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error)
        throw error;
    return (data || []);
}
async function getEmailEvents(emailId) {
    const sb = (0, supabase_1.getSupabase)();
    const { data, error } = await sb.from('email_events')
        .select('*').eq('email_id', emailId).order('timestamp', { ascending: true });
    if (error)
        throw error;
    return data || [];
}
async function getEmailStats(apiKeyId) {
    const sb = (0, supabase_1.getSupabase)();
    const { data, error } = await sb.from('emails')
        .select('status').eq('api_key_id', apiKeyId);
    if (error || !data)
        return { total: 0, sent: 0, failed: 0, queued: 0 };
    return {
        total: data.length,
        sent: data.filter((e) => e.status === 'sent').length,
        failed: data.filter((e) => e.status === 'failed').length,
        queued: data.filter((e) => e.status === 'queued').length,
    };
}
//# sourceMappingURL=emailService.js.map
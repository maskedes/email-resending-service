"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processEmailJob = processEmailJob;
exports.initEmailWorker = initEmailWorker;
const emailQueue_1 = require("../queue/emailQueue");
const brevo_1 = require("../services/brevo");
const emailService_1 = require("../services/emailService");
const apiKeyService_1 = require("../services/apiKeyService");
/**
 * Extracts reply-to + tags from the stored metadata.
 *
 * Newer rows use `{ _reply_to, tags }`; legacy rows stored a flat tags object
 * directly. Both shapes are handled so old emails keep working.
 */
function readMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object')
        return {};
    const m = metadata;
    const replyTo = typeof m._reply_to === 'string' && m._reply_to ? m._reply_to : undefined;
    const attachments = Array.isArray(m.attachments)
        ? m.attachments
            .filter((a) => a && typeof a.name === 'string' && typeof a.content === 'string')
            .map((a) => ({ name: a.name, content: a.content }))
        : undefined;
    let tags;
    if (m.tags && typeof m.tags === 'object' && !Array.isArray(m.tags)) {
        tags = m.tags;
    }
    else {
        // Legacy flat shape — everything except the reserved key is a tag.
        const rest = {};
        for (const [k, v] of Object.entries(m)) {
            if (k === '_reply_to' || k === 'tags')
                continue;
            rest[k] = String(v);
        }
        if (Object.keys(rest).length > 0)
            tags = rest;
    }
    return { replyTo, tags, attachments };
}
/**
 * Loads the queued email record and delivers it via the Brevo HTTPS API.
 * Updates status/events and the API key's usage counter on success or failure.
 */
async function processEmailJob(data) {
    const email = await (0, emailService_1.getEmailById)(data.emailId);
    if (!email) {
        throw new Error(`Email record ${data.emailId} not found`);
    }
    const from = email.from_name
        ? `"${email.from_name}" <${email.from_email}>`
        : email.from_email;
    const { replyTo, tags, attachments } = readMetadata(email.metadata);
    try {
        const info = await (0, brevo_1.sendViaBrevo)({
            from,
            to: email.to_email,
            subject: email.subject,
            html: email.html || undefined,
            text: email.text || undefined,
            replyTo,
            tags: tags ? Object.entries(tags).map(([k, v]) => `${k}:${v}`) : undefined,
            attachments,
        });
        await (0, emailService_1.recordEmailSuccess)(data.emailId, info.messageId || 'unknown');
        await (0, apiKeyService_1.incrementEmailCount)(email.api_key_id);
    }
    catch (error) {
        await (0, emailService_1.recordEmailFailure)(data.emailId, error.message || 'Unknown error');
        // Re-throw so BullMQ can retry (up to the configured attempts).
        throw error;
    }
}
/** Boots the queue consumer. Call once during application startup. */
function initEmailWorker() {
    (0, emailQueue_1.startEmailWorker)({ process: processEmailJob });
}
//# sourceMappingURL=emailWorker.js.map
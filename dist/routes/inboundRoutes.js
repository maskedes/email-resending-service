"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const config_1 = require("../config");
const apiKeyService_1 = require("../services/apiKeyService");
const forwardingService_1 = require("../services/forwardingService");
const emailService_1 = require("../services/emailService");
const router = (0, express_1.Router)();
/**
 * Inbound email ingestion.
 *
 * Point your inbound mail provider (Cloudflare Email Workers, a Postfix
 * transport pipe, Mailgun/Postmark inbound, etc.) at:
 *
 *   POST /api/inbound/email
 *   Header: x-inbound-secret: <INBOUND_EMAIL_SECRET>
 *   Body:   { to, from, subject?, text?, html?, api_key_id? }
 *
 * The recipient (`to`) is resolved in DNSimple-style order:
 *   1. a forwarding rule — exact alias on the domain, then the domain
 *      catch-all ('*') — created via /api/forwarding;
 *   2. otherwise an API key whose `email` matches the recipient, using the
 *      key's `forward_to` address (legacy per-key forwarding).
 *
 * The owning key's per-key toggles are enforced in both paths:
 *   - allow_incoming_email = false → the message is rejected (403).
 *   - allow_incoming_email = true  → the message is accepted and forwarded.
 *
 * If the endpoint is not configured (no INBOUND_EMAIL_SECRET) it responds 503.
 */
/** Rejects requests that do not carry the shared inbound secret. */
function requireInboundSecret(req, res, next) {
    const secret = config_1.config.inbound.secret;
    if (!secret) {
        res.status(503).json({
            error: { type: 'inbound_disabled', message: 'Inbound email is not configured on this server.' },
        });
        return;
    }
    const provided = req.headers[config_1.config.inbound.header];
    if (!provided || provided !== secret) {
        res.status(401).json({
            error: { type: 'authentication_required', message: 'Invalid or missing inbound secret.' },
        });
        return;
    }
    next();
}
router.post('/email', requireInboundSecret, async (req, res) => {
    try {
        const { to, from, subject, text, html, api_key_id: apiKeyId } = req.body || {};
        if (!to || !from) {
            res.status(400).json({
                error: { type: 'validation_error', message: 'Both "to" and "from" are required.' },
            });
            return;
        }
        const recipient = String(to).trim();
        // Resolve the owning API key: explicit id wins, otherwise route by recipient.
        const apiKey = apiKeyId
            ? await (0, apiKeyService_1.getApiKeyById)(String(apiKeyId))
            : await (0, apiKeyService_1.getApiKeyByInboundAddress)(recipient);
        if (!apiKey) {
            res.status(404).json({
                error: { type: 'unknown_recipient', message: 'No active API key is associated with this recipient.' },
            });
            return;
        }
        // Per-key "Allow incoming email" toggle.
        if (apiKey.allow_incoming_email !== true) {
            res.status(403).json({
                error: {
                    type: 'incoming_email_disabled',
                    message: 'Incoming email is disabled for this API key.',
                },
            });
            return;
        }
        const originalSubject = String(subject || '(no subject)');
        const subjectIsForward = originalSubject.toLowerCase().startsWith('fwd:');
        // Loop protection: a message that already came from our own pipeline
        // (platform From address) must never be forwarded again.
        const fromAddress = String(from).trim().toLowerCase();
        if (fromAddress === config_1.config.defaultFrom.email.toLowerCase()) {
            res.status(202).json({ accepted: true, forwarded: false, reason: 'loop_guard' });
            return;
        }
        // ── DNSimple-style domain/alias rules first ─────────────────────────────
        // An exact alias rule beats the domain catch-all; resolution already
        // validates the owning key is active and allowed incoming email.
        const resolved = await (0, forwardingService_1.resolveForwardFor)(recipient);
        if (resolved) {
            const destination = resolved.rule.destination.trim();
            if (destination.toLowerCase() === recipient.toLowerCase()) {
                res.status(202).json({ accepted: true, forwarded: false, reason: 'self_destination' });
                return;
            }
            const forwarded = await (0, emailService_1.sendEmail)(resolved.apiKeyId, {
                from: config_1.config.defaultFrom.email,
                to: destination,
                subject: subjectIsForward ? originalSubject : `Fwd: ${originalSubject}`,
                html: typeof html === 'string' ? html : undefined,
                text: typeof text === 'string' ? text : (html ? undefined : originalSubject),
                reply_to: fromAddress,
                tags: {
                    forwarded_from: fromAddress,
                    original_to: recipient,
                    forwarded_rule: resolved.catchAll ? 'catch_all' : 'alias',
                },
            });
            res.status(202).json({
                accepted: true,
                forwarded: true,
                matched: { domain: resolved.rule.domain, alias: resolved.rule.alias, catch_all: resolved.catchAll },
                forward_to: destination,
                forward_id: forwarded.id,
            });
            return;
        }
        // ── Legacy per-key forwarding fallback ──────────────────────────────────
        const forwardTo = (apiKey.forward_to || '').trim();
        if (!forwardTo) {
            // Accepted and stored nowhere by design; no forwarder configured.
            res.status(202).json({ accepted: true, forwarded: false, forward_to: null });
            return;
        }
        const forwarded = await (0, emailService_1.sendEmail)(apiKey.id, {
            from: config_1.config.defaultFrom.email,
            to: forwardTo,
            subject: subjectIsForward ? originalSubject : `Fwd: ${originalSubject}`,
            html: typeof html === 'string' ? html : undefined,
            text: typeof text === 'string' ? text : (html ? undefined : originalSubject),
            reply_to: fromAddress,
            tags: { forwarded_from: fromAddress, original_to: recipient },
        });
        res.status(202).json({
            accepted: true,
            forwarded: true,
            forward_to: forwardTo,
            forward_id: forwarded.id,
        });
    }
    catch (error) {
        console.error('Error handling inbound email:', error);
        res.status(500).json({
            error: { type: 'internal_error', message: 'Failed to process inbound email.' },
        });
    }
});
exports.default = router;
//# sourceMappingURL=inboundRoutes.js.map
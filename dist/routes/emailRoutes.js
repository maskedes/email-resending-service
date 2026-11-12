"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const emailService_1 = require("../services/emailService");
const rateLimiter_1 = require("../services/rateLimiter");
const config_1 = require("../config");
const router = (0, express_1.Router)();
/**
 * In-app load balancer: caps concurrent /send executions (default 5 lanes).
 * Excess bursts get a fast 503 + Retry-After instead of piling up and OOMing
 * the container. Tune with MAX_CONCURRENT_SENDS. Per-key 3/sec rate limiting
 * still applies on top.
 */
const MAX_CONCURRENT_SENDS = parseInt(process.env.MAX_CONCURRENT_SENDS || '5', 10);
let activeSends = 0;
function sendConcurrencyGuard(req, res, next) {
    if (activeSends >= MAX_CONCURRENT_SENDS) {
        res.set('Retry-After', '5');
        res.status(503).json({
            error: {
                type: 'overloaded',
                message: 'Server is busy handling sends. Please retry in a few seconds.',
            },
        });
        return;
    }
    activeSends++;
    let released = false;
    const release = () => {
        if (!released) {
            released = true;
            activeSends = Math.max(0, activeSends - 1);
        }
    };
    res.on('finish', release);
    res.on('close', release);
    next();
}
router.post('/send', auth_1.authMiddleware, sendConcurrencyGuard, async (req, res) => {
    try {
        const { from, to, subject, html, text, reply_to, tags, attachments, scheduleInMs } = req.body;
        if (!to || typeof to !== 'string' || !to.trim()) {
            res.status(400).json({
                error: { type: 'validation_error', message: 'The "to" field is required as a single recipient email string.' },
            });
            return;
        }
        if (!subject) {
            res.status(400).json({
                error: { type: 'validation_error', message: 'The "subject" field is required.' },
            });
            return;
        }
        if (!html && !text) {
            res.status(400).json({
                error: { type: 'validation_error', message: 'Either "html" or "text" content is required.' },
            });
            return;
        }
        // Per-API-key send rate limit (default 3 emails/second).
        const limit = config_1.config.emailRateLimit.perSecond;
        const rl = await (0, rateLimiter_1.checkRateLimit)(req.apiKey.id, limit);
        res.set('X-RateLimit-Limit', String(limit));
        res.set('X-RateLimit-Remaining', String(rl.remaining));
        if (!rl.allowed) {
            res.status(429).json({
                error: {
                    type: 'rate_limit_exceeded',
                    message: `Rate limit exceeded. Maximum ${limit} email(s) per second per API key. Try again in ${Math.ceil(rl.retryAfterSeconds)}s.`,
                },
            });
            return;
        }
        const input = { from, to, subject, html, text, reply_to, tags, attachments, scheduleInMs };
        const email = await (0, emailService_1.sendEmail)(req.apiKey.id, input);
        res.status(200).json({
            id: email.id,
            from: email.from_email,
            to: email.to_email,
            subject: email.subject,
            status: email.status,
            created_at: email.created_at,
        });
    }
    catch (error) {
        console.error('Error sending email:', error);
        const msg = error?.message || '';
        if (error?.code === 'queue_unavailable') {
            res.status(503).json({
                error: { type: 'queue_unavailable', message: 'The delivery queue is temporarily unavailable (Redis quota exceeded or unreachable). The message was recorded as failed and will NOT be sent automatically.' },
            });
            return;
        }
        if (/attachment|base64|image/i.test(msg)) {
            res.status(400).json({
                error: { type: 'validation_error', message: msg },
            });
            return;
        }
        res.status(500).json({
            error: { type: 'internal_error', message: 'Failed to send email. Please try again.' },
        });
    }
});
router.get('/', auth_1.authMiddleware, async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const emails = await (0, emailService_1.getEmailsByApiKeyId)(req.apiKey.id, limit, offset);
    res.json({
        data: emails.map((email) => ({
            id: email.id,
            from: email.from_email,
            to: email.to_email,
            subject: email.subject,
            status: email.status,
            created_at: email.created_at,
            sent_at: email.sent_at,
        })),
        pagination: { limit, offset },
    });
});
router.get('/stats', auth_1.authMiddleware, async (req, res) => {
    const stats = await (0, emailService_1.getEmailStats)(req.apiKey.id);
    res.json(stats);
});
router.get('/:id', auth_1.authMiddleware, async (req, res) => {
    const email = await (0, emailService_1.getEmailById)(req.params.id);
    if (!email || email.api_key_id !== req.apiKey.id) {
        res.status(404).json({
            error: { type: 'not_found', message: 'Email not found.' },
        });
        return;
    }
    const events = await (0, emailService_1.getEmailEvents)(email.id);
    res.json({
        id: email.id,
        from: email.from_email,
        to: email.to_email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        status: email.status,
        created_at: email.created_at,
        sent_at: email.sent_at,
        delivered_at: email.delivered_at,
        error_message: email.error_message,
        events: events.map((e) => ({
            event: e.event,
            timestamp: e.timestamp,
            details: e.details,
        })),
    });
});
exports.default = router;
//# sourceMappingURL=emailRoutes.js.map
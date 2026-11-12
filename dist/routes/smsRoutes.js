"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const smsService_1 = require("../services/smsService");
const rateLimiter_1 = require("../services/rateLimiter");
const config_1 = require("../config");
const router = (0, express_1.Router)();
// Send SMS (queued → gateway phone delivers)
router.post('/send', auth_1.authMiddleware, async (req, res) => {
    // Per-key "Allow SMS" toggle. Disabled keys cannot send, even with a valid key.
    if (!req.apiKey.allow_sms) {
        res.status(403).json({
            error: {
                type: 'sms_disabled',
                message: 'SMS is disabled for this API key. Enable "Allow SMS" in the key\'s General settings.',
            },
        });
        return;
    }
    const { to, body, text, message, from, tags, scheduleInMs, gatewayId } = req.body;
    const msgBody = body || text || message;
    if (!to) {
        res.status(400).json({ error: { type: 'validation_error', message: 'The "to" field (phone number) is required.' } });
        return;
    }
    if (!(0, smsService_1.isValidPhone)(String(to))) {
        res.status(400).json({ error: { type: 'validation_error', message: 'Invalid phone number. Use E.164 e.g. +14155552671.' } });
        return;
    }
    if (!msgBody || !String(msgBody).trim()) {
        res.status(400).json({ error: { type: 'validation_error', message: 'Message body is required (field: body or text).' } });
        return;
    }
    if (String(msgBody).length > 1600) {
        res.status(400).json({ error: { type: 'validation_error', message: 'Message too long (max 1600 chars).' } });
        return;
    }
    const limit = config_1.config.smsRateLimit.perSecond;
    const rl = await (0, rateLimiter_1.checkRateLimit)(`sms:${req.apiKey.id}`, limit);
    res.set('X-RateLimit-Limit', String(limit));
    res.set('X-RateLimit-Remaining', String(rl.remaining));
    if (!rl.allowed) {
        res.status(429).json({ error: { type: 'rate_limit_exceeded', message: `SMS rate limit: ${limit}/sec per API key. Try again in ${Math.ceil(rl.retryAfterSeconds)}s.` } });
        return;
    }
    try {
        const sms = await (0, smsService_1.sendSms)(req.apiKey.id, { to: String(to), body: String(msgBody), from: from ? String(from) : undefined, tags, scheduleInMs, gatewayId });
        res.status(200).json({ id: sms.id, to: sms.to_phone, body: sms.body, status: sms.status, parts: sms.parts, created_at: sms.created_at });
    }
    catch (err) {
        const code = err?.code;
        const msg = err instanceof Error ? err.message : String(err);
        if (code === 'queue_unavailable') {
            res.status(503).json({ error: { type: 'queue_unavailable', message: 'The delivery queue is temporarily unavailable (Redis quota exceeded or unreachable). The message was recorded as failed and will NOT be sent automatically.' } });
            return;
        }
        console.error('[sms] send failed:', msg);
        res.status(500).json({ error: { type: 'internal_error', message: 'Failed to queue the SMS.' } });
    }
});
// List
router.get('/', auth_1.authMiddleware, async (req, res) => {
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 100);
    const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);
    const list = await (0, smsService_1.getSmsByApiKeyId)(req.apiKey.id, limit, offset);
    res.json({
        data: list.map((s) => ({ id: s.id, to: s.to_phone, body: s.body, status: s.status, parts: s.parts, created_at: s.created_at, sent_at: s.sent_at, delivered_at: s.delivered_at })),
        pagination: { limit, offset },
    });
});
router.get('/stats', auth_1.authMiddleware, async (req, res) => {
    const stats = await (0, smsService_1.getSmsStats)(req.apiKey.id);
    res.json(stats);
});
router.get('/:id', auth_1.authMiddleware, async (req, res) => {
    const sms = await (0, smsService_1.getSmsById)(req.params.id);
    if (!sms || sms.api_key_id !== req.apiKey.id) {
        res.status(404).json({ error: { type: 'not_found', message: 'SMS not found.' } });
        return;
    }
    const events = await (0, smsService_1.getSmsEvents)(sms.id);
    res.json({ id: sms.id, to: sms.to_phone, from: sms.from_phone, body: sms.body, status: sms.status, parts: sms.parts, error_message: sms.error_message, created_at: sms.created_at, sent_at: sms.sent_at, delivered_at: sms.delivered_at, events });
});
exports.default = router;
//# sourceMappingURL=smsRoutes.js.map
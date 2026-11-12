"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidPhone = isValidPhone;
exports.normalizePhone = normalizePhone;
exports.smsParts = smsParts;
exports.sendSms = sendSms;
exports.addSmsEvent = addSmsEvent;
exports.recordSmsSent = recordSmsSent;
exports.recordSmsFailed = recordSmsFailed;
exports.recordSmsDelivered = recordSmsDelivered;
exports.getSmsById = getSmsById;
exports.getSmsByApiKeyId = getSmsByApiKeyId;
exports.getSmsEvents = getSmsEvents;
exports.getSmsStats = getSmsStats;
const node_crypto_1 = require("node:crypto");
const supabase_1 = require("../database/supabase");
const smsQueue_1 = require("../queue/smsQueue");
const webhookService_1 = require("./webhookService");
/** Very permissive E.164-ish check: + and 7-15 digits, or 7-15 digits. */
const E164_RE = /^\+?[1-9]\d{6,14}$/;
function isValidPhone(phone) {
    const normalized = phone.replace(/[\s()-]/g, '');
    return E164_RE.test(normalized);
}
function normalizePhone(phone) {
    const n = phone.replace(/[\s()-]/g, '');
    return n.startsWith('+') ? n : `+${n}`;
}
/** Rough SMS segmentation: GSM 7-bit 160 vs UCS-2 70. Returns part count. */
function smsParts(body) {
    const isGsm = /^[\x00-\x7F]*$/.test(body);
    if (isGsm) {
        if (body.length <= 160)
            return 1;
        return Math.ceil(body.length / 153);
    }
    if (body.length <= 70)
        return 1;
    return Math.ceil(body.length / 67);
}
async function sendSms(apiKeyId, input) {
    const id = (0, node_crypto_1.randomUUID)();
    const toPhone = normalizePhone(input.to);
    const parts = smsParts(input.body);
    const scheduledAt = input.scheduleInMs ? new Date(Date.now() + input.scheduleInMs).toISOString() : null;
    const sb = (0, supabase_1.getSupabase)();
    await sb.from('sms_messages').insert({
        id,
        api_key_id: apiKeyId,
        gateway_id: input.gatewayId || null,
        to_phone: toPhone,
        from_phone: input.from || null,
        body: input.body,
        parts,
        metadata: input.tags || null,
        scheduled_at: scheduledAt,
        status: 'queued',
    });
    await addSmsEvent(id, 'queued', 'SMS queued for gateway dispatch');
    (0, webhookService_1.dispatchSmsWebhooks)(id, 'sms.queued').catch(() => { });
    try {
        await (0, smsQueue_1.enqueueSms)({ smsId: id }, { delay: input.scheduleInMs });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Persist the failure so the operator can see what happened; the route
        // layer maps this to 503 (queue unavailable).
        await sb.from('sms_messages').update({ status: 'failed', error_message: `Delivery queue unavailable: ${msg}` }).eq('id', id);
        await addSmsEvent(id, 'failed', `SMS recorded but not queued — delivery queue unavailable (${msg})`);
        throw err;
    }
    const { data } = await sb.from('sms_messages').select('*').eq('id', id).single();
    return data;
}
async function addSmsEvent(smsId, event, details) {
    const sb = (0, supabase_1.getSupabase)();
    await sb.from('sms_events').insert({ sms_id: smsId, event, details: details || null });
}
async function recordSmsSent(smsId, info) {
    const sb = (0, supabase_1.getSupabase)();
    await sb.from('sms_messages').update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null }).eq('id', smsId);
    await addSmsEvent(smsId, 'sent', info || 'Sent via gateway');
    (0, webhookService_1.dispatchSmsWebhooks)(smsId, 'sms.sent', info).catch(() => { });
}
async function recordSmsFailed(smsId, err) {
    const sb = (0, supabase_1.getSupabase)();
    await sb.from('sms_messages').update({ status: 'failed', error_message: err }).eq('id', smsId);
    await addSmsEvent(smsId, 'failed', err);
    (0, webhookService_1.dispatchSmsWebhooks)(smsId, 'sms.failed', err).catch(() => { });
}
async function recordSmsDelivered(smsId) {
    const sb = (0, supabase_1.getSupabase)();
    await sb.from('sms_messages').update({ status: 'delivered', delivered_at: new Date().toISOString() }).eq('id', smsId);
    await addSmsEvent(smsId, 'delivered', 'Delivery confirmed by gateway');
    (0, webhookService_1.dispatchSmsWebhooks)(smsId, 'sms.delivered').catch(() => { });
}
async function getSmsById(id) {
    const sb = (0, supabase_1.getSupabase)();
    const { data } = await sb.from('sms_messages').select('*').eq('id', id).single();
    if (!data)
        return null;
    return data;
}
async function getSmsByApiKeyId(apiKeyId, limit = 50, offset = 0) {
    const sb = (0, supabase_1.getSupabase)();
    const { data } = await sb.from('sms_messages').select('*').eq('api_key_id', apiKeyId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    return (data || []);
}
async function getSmsEvents(smsId) {
    const sb = (0, supabase_1.getSupabase)();
    const { data } = await sb.from('sms_events').select('*').eq('sms_id', smsId).order('timestamp', { ascending: true });
    return data || [];
}
async function getSmsStats(apiKeyId) {
    const sb = (0, supabase_1.getSupabase)();
    const { data } = await sb.from('sms_messages').select('status').eq('api_key_id', apiKeyId);
    if (!data)
        return { total: 0, queued: 0, sent: 0, delivered: 0, failed: 0 };
    return {
        total: data.length,
        queued: data.filter((r) => r.status === 'queued').length,
        sent: data.filter((r) => r.status === 'sent').length,
        delivered: data.filter((r) => r.status === 'delivered').length,
        failed: data.filter((r) => r.status === 'failed').length,
    };
}
//# sourceMappingURL=smsService.js.map
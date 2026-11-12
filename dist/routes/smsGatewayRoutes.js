"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../database/db");
const config_1 = require("../config");
const supabase_1 = require("../database/supabase");
const apiKeyService_js_1 = require("../services/apiKeyService.js");
const smsGatewayService_js_1 = require("../services/smsGatewayService.js");
const smsService_js_1 = require("../services/smsService.js");
const router = (0, express_1.Router)();
function gatewayTokenFromReq(req) {
    const h = config_1.config.smsGateway.header.toLowerCase();
    const v = req.headers[h] || req.headers['x-gateway-token'] || req.headers['authorization'];
    if (!v)
        return undefined;
    const s = String(v);
    return s.startsWith('Bearer ') ? s.slice(7) : s;
}
async function gatewayAuth(req, res) {
    const raw = gatewayTokenFromReq(req);
    if (!raw) {
        res.status(401).json({ error: { type: 'authentication_required', message: 'Gateway token required. Register your phone via POST /api/sms/gateway/register (x-api-key) or send x-gateway-token.' } });
        return null;
    }
    const gw = await (0, smsGatewayService_js_1.verifyGatewayToken)(raw);
    if (!gw) {
        res.status(401).json({ error: { type: 'invalid_gateway_token', message: 'Invalid gateway token.' } });
        return null;
    }
    return gw;
}
// ── Dashboard / API-key authed ──────────────────────────────
// Register a new gateway (returns a one-time raw token for the phone)
router.post('/register', async (req, res) => {
    const apiKey = req.headers[config_1.config.apiKeyHeader] || '';
    if (!apiKey) {
        res.status(401).json({ error: { type: 'authentication_required', message: 'x-api-key required to register a gateway.' } });
        return;
    }
    const valid = await (0, apiKeyService_js_1.validateApiKey)(apiKey);
    if (!valid) {
        res.status(401).json({ error: { type: 'invalid_api_key', message: 'Invalid API key.' } });
        return;
    }
    const { name, phoneNumber } = req.body || {};
    const { gateway, rawToken } = await (0, smsGatewayService_js_1.createGateway)({ apiKeyId: valid.id, name, phoneNumber });
    res.status(201).json({
        gateway: { id: gateway.id, name: gateway.name, phone_number: gateway.phone_number, created_at: gateway.created_at },
        gatewayToken: rawToken,
        message: 'Save gatewayToken on the Android phone — it is shown only once.',
    });
});
// Requires an API key. Without one we used to return EVERY gateway row for
// every tenant (including the `gateway_token_hash` column) — a total
// cross-tenant leak. Now it is scoped to the authenticated key and the token
// hash is never serialised.
router.get('/status', async (req, res) => {
    const apiKey = req.headers[config_1.config.apiKeyHeader];
    if (!apiKey) {
        res.status(401).json({ error: { type: 'authentication_required', message: 'x-api-key required to list gateways.' } });
        return;
    }
    const valid = await (0, apiKeyService_js_1.validateApiKey)(apiKey);
    if (!valid) {
        res.status(401).json({ error: { type: 'invalid_api_key', message: 'Invalid API key.' } });
        return;
    }
    const gateways = await (0, smsGatewayService_js_1.listGateways)(valid.id);
    const safe = gateways.map(({ gateway_token_hash: _hash, ...rest }) => rest);
    res.json({ data: safe });
});
router.delete('/:id', async (req, res) => {
    const apiKey = req.headers[config_1.config.apiKeyHeader];
    if (!apiKey) {
        res.status(401).json({ error: { type: 'authentication_required', message: 'x-api-key required.' } });
        return;
    }
    const valid = await (0, apiKeyService_js_1.validateApiKey)(apiKey);
    if (!valid) {
        res.status(401).json({ error: { type: 'invalid_api_key', message: 'Invalid API key.' } });
        return;
    }
    const gw = await (0, smsGatewayService_js_1.getGatewayById)(req.params.id);
    if (!gw || gw.api_key_id !== valid.id) {
        res.status(404).json({ error: { type: 'not_found', message: 'Gateway not found.' } });
        return;
    }
    await (0, smsGatewayService_js_1.deleteGateway)(req.params.id);
    res.json({ message: 'Gateway deleted.' });
});
router.post('/:id/rotate-token', async (req, res) => {
    const apiKey = req.headers[config_1.config.apiKeyHeader];
    if (!apiKey) {
        res.status(401).json({ error: { type: 'authentication_required', message: 'x-api-key required.' } });
        return;
    }
    const valid = await (0, apiKeyService_js_1.validateApiKey)(apiKey);
    if (!valid) {
        res.status(401).json({ error: { type: 'invalid_api_key', message: 'Invalid API key.' } });
        return;
    }
    const gw = await (0, smsGatewayService_js_1.getGatewayById)(req.params.id);
    if (!gw || gw.api_key_id !== valid.id) {
        res.status(404).json({ error: { type: 'not_found', message: 'Gateway not found.' } });
        return;
    }
    const { rawToken } = await (0, smsGatewayService_js_1.rotateGatewayToken)(req.params.id);
    res.json({ gatewayToken: rawToken, message: 'Save the new token on the phone — old token is revoked.' });
});
// ── Phone (gateway token) ─────────────────────────────────
// Long-poll for queued SMS (phone calls this in a loop)
router.get('/jobs', async (req, res) => {
    const gw = await gatewayAuth(req, res);
    if (!gw)
        return;
    await (0, smsGatewayService_js_1.touchGatewayHeartbeat)(gw.id);
    const timeoutMs = config_1.config.smsGateway.pollTimeoutMs;
    const deadline = Date.now() + timeoutMs;
    const pollIntervalMs = 1500;
    const fetchJobs = async () => {
        const sb = (0, supabase_1.getSupabase)();
        // Prefer messages for this gateway, else any queued; respect scheduled_at
        const { data } = await sb
            .from('sms_messages')
            .select('*')
            .eq('status', 'queued')
            .or(`gateway_id.is.null,gateway_id.eq.${gw.id}`)
            .order('created_at', { ascending: true })
            .limit(10);
        const list = (data || []);
        const now = new Date().toISOString();
        const eligible = list.filter((m) => !m.scheduled_at || m.scheduled_at <= now);
        // Claim: assign gateway_id if null
        const claimed = [];
        for (const m of eligible) {
            if (!m.gateway_id) {
                const pool = (0, db_1.getPool)();
                const { rowCount } = await pool.query(`UPDATE sms_messages SET gateway_id = $1 WHERE id = $2 AND gateway_id IS NULL AND status = 'queued'`, [gw.id, m.id]);
                if (rowCount && rowCount > 0)
                    claimed.push({ ...m, gateway_id: gw.id });
                else {
                    // raced — fetch fresh
                    const fresh = await (0, supabase_1.getSupabase)().from('sms_messages').select('*').eq('id', m.id).single();
                    if (fresh.data && fresh.data.gateway_id === gw.id)
                        claimed.push(fresh.data);
                }
            }
            else {
                claimed.push(m);
            }
            if (claimed.length >= 5)
                break;
        }
        return claimed;
    };
    // Long-poll loop
    while (Date.now() < deadline) {
        const jobs = await fetchJobs();
        if (jobs.length > 0) {
            res.json({
                gatewayId: gw.id,
                jobs: jobs.map((j) => ({ id: j.id, to: j.to_phone, body: j.body, parts: j.parts })),
            });
            return;
        }
        await new Promise((r) => setTimeout(r, pollIntervalMs));
        if (res.writableEnded)
            return;
    }
    res.json({ gatewayId: gw.id, jobs: [] });
});
// Phone reports send result
router.post('/result', async (req, res) => {
    const gw = await gatewayAuth(req, res);
    if (!gw)
        return;
    await (0, smsGatewayService_js_1.touchGatewayHeartbeat)(gw.id);
    const { smsId, id, status, error, errorMessage } = req.body || {};
    const targetId = smsId || id;
    if (!targetId || !status) {
        res.status(400).json({ error: { type: 'validation_error', message: 'Fields smsId (or id) and status are required. status: sent|failed|delivered.' } });
        return;
    }
    const allowed = ['sent', 'failed', 'delivered'];
    if (!allowed.includes(String(status))) {
        res.status(400).json({ error: { type: 'validation_error', message: `status must be one of: ${allowed.join(', ')}` } });
        return;
    }
    // Verify ownership (gateway claimed it or it was unassigned)
    const sb = (0, supabase_1.getSupabase)();
    const { data: sms } = await sb.from('sms_messages').select('id,gateway_id').eq('id', targetId).single();
    if (!sms) {
        res.status(404).json({ error: { type: 'not_found', message: 'SMS not found.' } });
        return;
    }
    const rec = sms;
    if (rec.gateway_id && rec.gateway_id !== gw.id) {
        res.status(403).json({ error: { type: 'forbidden', message: 'This SMS is claimed by another gateway.' } });
        return;
    }
    if (status === 'sent')
        await (0, smsService_js_1.recordSmsSent)(targetId, `Sent via gateway ${gw.id}`);
    else if (status === 'failed')
        await (0, smsService_js_1.recordSmsFailed)(targetId, String(error || errorMessage || 'Gateway reported failure'));
    else
        await (0, smsService_js_1.recordSmsDelivered)(targetId);
    res.json({ message: `SMS ${status}` });
});
router.post('/heartbeat', async (req, res) => {
    const gw = await gatewayAuth(req, res);
    if (!gw)
        return;
    await (0, smsGatewayService_js_1.touchGatewayHeartbeat)(gw.id);
    const body = req.body || {};
    if (body.phoneNumber) {
        const pool = (0, db_1.getPool)();
        await pool.query(`UPDATE sms_gateways SET phone_number = $1 WHERE id = $2`, [String(body.phoneNumber), gw.id]);
    }
    res.json({ message: 'ok', gatewayId: gw.id });
});
exports.default = router;
//# sourceMappingURL=smsGatewayRoutes.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGatewayToken = generateGatewayToken;
exports.createGateway = createGateway;
exports.verifyGatewayToken = verifyGatewayToken;
exports.touchGatewayHeartbeat = touchGatewayHeartbeat;
exports.setGatewayOfflineIfStale = setGatewayOfflineIfStale;
exports.listGateways = listGateways;
exports.getGatewayById = getGatewayById;
exports.deleteGateway = deleteGateway;
exports.rotateGatewayToken = rotateGatewayToken;
const crypto_1 = __importDefault(require("crypto"));
const node_crypto_1 = require("node:crypto");
const config_1 = require("../config");
const db_1 = require("../database/db");
function hashToken(raw) {
    return crypto_1.default.createHash('sha256').update(raw).digest('hex');
}
function hmacToken(payload) {
    return crypto_1.default.createHmac('sha256', config_1.config.smsGateway.tokenSecret).update(payload).digest('hex');
}
function generateGatewayToken(gatewayId) {
    const rand = crypto_1.default.randomBytes(24).toString('hex');
    const sig = hmacToken(`${gatewayId}:${rand}`);
    return `gw_${rand}_${sig.slice(0, 16)}`;
}
async function createGateway(opts) {
    const id = (0, node_crypto_1.randomUUID)();
    const rawToken = generateGatewayToken(id);
    const tokenHash = hashToken(rawToken);
    const pool = (0, db_1.getPool)();
    const { rows } = await pool.query(`INSERT INTO sms_gateways (id, api_key_id, name, phone_number, gateway_token_hash)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`, [id, opts.apiKeyId || null, opts.name || 'Android gateway', opts.phoneNumber || null, tokenHash]);
    return { gateway: rows[0], rawToken };
}
async function verifyGatewayToken(rawToken) {
    const tokenHash = hashToken(rawToken);
    const pool = (0, db_1.getPool)();
    const { rows } = await pool.query(`SELECT * FROM sms_gateways WHERE gateway_token_hash = $1 LIMIT 1`, [tokenHash]);
    if (!rows.length)
        return null;
    const gw = rows[0];
    const online = gw.last_heartbeat_at ? Date.now() - new Date(gw.last_heartbeat_at).getTime() < config_1.config.smsGateway.offlineAfterMs : false;
    return { ...gw, is_online: online };
}
async function touchGatewayHeartbeat(gatewayId) {
    const pool = (0, db_1.getPool)();
    await pool.query(`UPDATE sms_gateways SET last_heartbeat_at = now(), last_seen_at = now(), is_online = true WHERE id = $1`, [gatewayId]);
}
async function setGatewayOfflineIfStale(gatewayId) {
    const pool = (0, db_1.getPool)();
    await pool.query(`UPDATE sms_gateways SET is_online = false WHERE id = $1 AND last_heartbeat_at < now() - interval '${Math.floor(config_1.config.smsGateway.offlineAfterMs / 1000)} seconds'`, [gatewayId]);
}
async function listGateways(apiKeyId) {
    const pool = (0, db_1.getPool)();
    if (apiKeyId) {
        const { rows } = await pool.query(`SELECT * FROM sms_gateways WHERE api_key_id = $1 ORDER BY created_at DESC`, [apiKeyId]);
        return rows;
    }
    const { rows } = await pool.query(`SELECT * FROM sms_gateways ORDER BY created_at DESC`);
    return rows;
}
async function getGatewayById(id) {
    const pool = (0, db_1.getPool)();
    const { rows } = await pool.query(`SELECT * FROM sms_gateways WHERE id = $1`, [id]);
    return rows[0] || null;
}
async function deleteGateway(id) {
    const pool = (0, db_1.getPool)();
    const { rowCount } = await pool.query(`DELETE FROM sms_gateways WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
}
async function rotateGatewayToken(gatewayId) {
    const rawToken = generateGatewayToken(gatewayId);
    const tokenHash = hashToken(rawToken);
    const pool = (0, db_1.getPool)();
    await pool.query(`UPDATE sms_gateways SET gateway_token_hash = $1 WHERE id = $2`, [tokenHash, gatewayId]);
    return { rawToken };
}
//# sourceMappingURL=smsGatewayService.js.map
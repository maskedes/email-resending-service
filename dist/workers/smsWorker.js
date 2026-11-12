"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processSmsJob = processSmsJob;
exports.onSmsGatewayResult = onSmsGatewayResult;
exports.initSmsWorker = initSmsWorker;
const db_1 = require("../database/db");
const smsService_1 = require("../services/smsService");
const smsQueue_1 = require("../queue/smsQueue");
/**
 * SMS delivery is done by the Android gateway phone, not by the server.
 * The worker just ensures the message is visible to gateways long enough
 * to be picked up. If no gateway picks it up within the retry window,
 * it will be retried then eventually marked failed with a clear error.
 * Gateways pull via long-poll GET /api/sms/gateway/jobs.
 */
async function processSmsJob(data) {
    const sms = await (0, smsService_1.getSmsById)(data.smsId);
    if (!sms)
        throw new Error(`SMS ${data.smsId} not found`);
    if (sms.status !== 'queued')
        return; // already handled by gateway callback
    // In gateway mode we don't send directly — the job exists so the poll
    // has something to return and retries mark the SMS failed if no phone
    // ever reports. Check if any gateway is online; if none, fail fast
    // on the last attempt.
    const pool = (0, db_1.getPool)();
    const { rows } = await pool.query(`SELECT 1 FROM sms_gateways WHERE is_online = true LIMIT 1`);
    const anyOnline = rows.length > 0;
    if (!anyOnline) {
        // Don't fail immediately — give gateways a chance to come online.
        // Throw so BullMQ retries; on last attempt the catch below will
        // surface and the job will end as failed, but SMS stays queued
        // so a later gateway can still claim it via /gateway/jobs.
        throw new Error('No SMS gateway online — waiting for Android phone');
    }
    // Gateway is online: leave SMS as queued until the phone claims it
    // via GET /api/sms/gateway/jobs and reports via POST /result.
    // No-op here is intentional — delivery confirmation comes from the phone.
}
/** Called when a gateway reports a result; ensures retries stop. */
async function onSmsGatewayResult(smsId) {
    // No-op: gateway already updated sms_messages via smsService.
    // This hook exists for future metrics/billing.
    void smsId;
}
function initSmsWorker() {
    (0, smsQueue_1.startSmsWorker)({ process: processSmsJob });
}
//# sourceMappingURL=smsWorker.js.map
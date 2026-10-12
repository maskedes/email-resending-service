import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { getPool } from '../database/db';

export interface SmsGatewayRecord {
  id: string;
  api_key_id: string | null;
  name: string;
  phone_number: string | null;
  gateway_token_hash: string;
  is_online: boolean;
  last_seen_at: string | null;
  last_heartbeat_at: string | null;
  created_at: string;
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function hmacToken(payload: string): string {
  return crypto.createHmac('sha256', config.smsGateway.tokenSecret).update(payload).digest('hex');
}

export function generateGatewayToken(gatewayId: string): string {
  const rand = crypto.randomBytes(24).toString('hex');
  const sig = hmacToken(`${gatewayId}:${rand}`);
  return `gw_${rand}_${sig.slice(0, 16)}`;
}

export async function createGateway(opts: { apiKeyId?: string; name?: string; phoneNumber?: string }): Promise<{ gateway: SmsGatewayRecord; rawToken: string }> {
  const id = uuidv4();
  const rawToken = generateGatewayToken(id);
  const tokenHash = hashToken(rawToken);
  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO sms_gateways (id, api_key_id, name, phone_number, gateway_token_hash)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [id, opts.apiKeyId || null, opts.name || 'Android gateway', opts.phoneNumber || null, tokenHash]
  );
  return { gateway: rows[0] as SmsGatewayRecord, rawToken };
}

export async function verifyGatewayToken(rawToken: string): Promise<SmsGatewayRecord | null> {
  const tokenHash = hashToken(rawToken);
  const pool = getPool();
  const { rows } = await pool.query(`SELECT * FROM sms_gateways WHERE gateway_token_hash = $1 LIMIT 1`, [tokenHash]);
  if (!rows.length) return null;
  const gw = rows[0] as SmsGatewayRecord;
  const online = gw.last_heartbeat_at ? Date.now() - new Date(gw.last_heartbeat_at).getTime() < config.smsGateway.offlineAfterMs : false;
  return { ...gw, is_online: online };
}

export async function touchGatewayHeartbeat(gatewayId: string): Promise<void> {
  const pool = getPool();
  await pool.query(`UPDATE sms_gateways SET last_heartbeat_at = now(), last_seen_at = now(), is_online = true WHERE id = $1`, [gatewayId]);
}

export async function setGatewayOfflineIfStale(gatewayId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE sms_gateways SET is_online = false WHERE id = $1 AND last_heartbeat_at < now() - interval '${Math.floor(config.smsGateway.offlineAfterMs / 1000)} seconds'`,
    [gatewayId]
  );
}

export async function listGateways(apiKeyId?: string): Promise<SmsGatewayRecord[]> {
  const pool = getPool();
  if (apiKeyId) {
    const { rows } = await pool.query(`SELECT * FROM sms_gateways WHERE api_key_id = $1 ORDER BY created_at DESC`, [apiKeyId]);
    return rows as SmsGatewayRecord[];
  }
  const { rows } = await pool.query(`SELECT * FROM sms_gateways ORDER BY created_at DESC`);
  return rows as SmsGatewayRecord[];
}

export async function getGatewayById(id: string): Promise<SmsGatewayRecord | null> {
  const pool = getPool();
  const { rows } = await pool.query(`SELECT * FROM sms_gateways WHERE id = $1`, [id]);
  return (rows[0] as SmsGatewayRecord) || null;
}

export async function deleteGateway(id: string): Promise<boolean> {
  const pool = getPool();
  const { rowCount } = await pool.query(`DELETE FROM sms_gateways WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

export async function rotateGatewayToken(gatewayId: string): Promise<{ rawToken: string }> {
  const rawToken = generateGatewayToken(gatewayId);
  const tokenHash = hashToken(rawToken);
  const pool = getPool();
  await pool.query(`UPDATE sms_gateways SET gateway_token_hash = $1 WHERE id = $2`, [tokenHash, gatewayId]);
  return { rawToken };
}

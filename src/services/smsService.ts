import { v4 as uuidv4 } from 'uuid';
import { getSupabase } from '../database/supabase';
import { enqueueSms } from '../queue/smsQueue';

export interface SendSmsInput {
  to: string;
  body: string;
  from?: string;
  tags?: Record<string, string>;
  /** Optional schedule delay in milliseconds. */
  scheduleInMs?: number;
  /** Optional preferred gateway ID. */
  gatewayId?: string;
}

export interface SmsRecord {
  id: string;
  api_key_id: string;
  gateway_id: string | null;
  to_phone: string;
  from_phone: string | null;
  body: string;
  status: string;
  parts: number;
  error_message: string | null;
  metadata: unknown;
  scheduled_at: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
}

/** Very permissive E.164-ish check: + and 7-15 digits, or 7-15 digits. */
const E164_RE = /^\+?[1-9]\d{6,14}$/;
export function isValidPhone(phone: string): boolean {
  const normalized = phone.replace(/[\s()-]/g, '');
  return E164_RE.test(normalized);
}
export function normalizePhone(phone: string): string {
  const n = phone.replace(/[\s()-]/g, '');
  return n.startsWith('+') ? n : `+${n}`;
}

/** Rough SMS segmentation: GSM 7-bit 160 vs UCS-2 70. Returns part count. */
export function smsParts(body: string): number {
  const isGsm = /^[\x00-\x7F]*$/.test(body);
  if (isGsm) {
    if (body.length <= 160) return 1;
    return Math.ceil(body.length / 153);
  }
  if (body.length <= 70) return 1;
  return Math.ceil(body.length / 67);
}

export async function sendSms(apiKeyId: string, input: SendSmsInput): Promise<SmsRecord> {
  const id = uuidv4();
  const toPhone = normalizePhone(input.to);
  const parts = smsParts(input.body);
  const scheduledAt = input.scheduleInMs ? new Date(Date.now() + input.scheduleInMs).toISOString() : null;

  const sb = getSupabase();
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

  await enqueueSms({ smsId: id }, { delay: input.scheduleInMs });

  const { data } = await sb.from('sms_messages').select('*').eq('id', id).single();
  return data as SmsRecord;
}

export async function addSmsEvent(smsId: string, event: string, details?: string): Promise<void> {
  const sb = getSupabase();
  await sb.from('sms_events').insert({ sms_id: smsId, event, details: details || null });
}

export async function recordSmsSent(smsId: string, info?: string): Promise<void> {
  const sb = getSupabase();
  await sb.from('sms_messages').update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null }).eq('id', smsId);
  await addSmsEvent(smsId, 'sent', info || 'Sent via gateway');
}

export async function recordSmsFailed(smsId: string, err: string): Promise<void> {
  const sb = getSupabase();
  await sb.from('sms_messages').update({ status: 'failed', error_message: err }).eq('id', smsId);
  await addSmsEvent(smsId, 'failed', err);
}

export async function recordSmsDelivered(smsId: string): Promise<void> {
  const sb = getSupabase();
  await sb.from('sms_messages').update({ status: 'delivered', delivered_at: new Date().toISOString() }).eq('id', smsId);
  await addSmsEvent(smsId, 'delivered', 'Delivery confirmed by gateway');
}

export async function getSmsById(id: string): Promise<SmsRecord | null> {
  const sb = getSupabase();
  const { data } = await sb.from('sms_messages').select('*').eq('id', id).single();
  if (!data) return null;
  return data as SmsRecord;
}

export async function getSmsByApiKeyId(apiKeyId: string, limit = 50, offset = 0): Promise<SmsRecord[]> {
  const sb = getSupabase();
  const { data } = await sb.from('sms_messages').select('*').eq('api_key_id', apiKeyId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  return (data || []) as SmsRecord[];
}

export async function getSmsEvents(smsId: string): Promise<unknown[]> {
  const sb = getSupabase();
  const { data } = await sb.from('sms_events').select('*').eq('sms_id', smsId).order('timestamp', { ascending: true });
  return data || [];
}

export async function getSmsStats(apiKeyId: string): Promise<{ total: number; queued: number; sent: number; delivered: number; failed: number }> {
  const sb = getSupabase();
  const { data } = await sb.from('sms_messages').select('status').eq('api_key_id', apiKeyId);
  if (!data) return { total: 0, queued: 0, sent: 0, delivered: 0, failed: 0 };
  return {
    total: data.length,
    queued: data.filter((r: { status: string }) => r.status === 'queued').length,
    sent: data.filter((r: { status: string }) => r.status === 'sent').length,
    delivered: data.filter((r: { status: string }) => r.status === 'delivered').length,
    failed: data.filter((r: { status: string }) => r.status === 'failed').length,
  };
}

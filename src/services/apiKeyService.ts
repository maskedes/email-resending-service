import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getSupabase } from '../database/supabase';

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  email: string;
  user_id: string | null;
  created_at: string;
  is_active: boolean;
  total_emails_sent: number;
  last_used_at: string | null;
  /** Whether this key is allowed to send SMS (per-key "Allow SMS" toggle). */
  allow_sms: boolean;
  /** Whether this key accepts inbound email (per-key "Allow incoming email" toggle). */
  allow_incoming_email: boolean;
  /** Address inbound email for this key is forwarded to, when set. */
  forward_to: string | null;
  /** When true, this key has elevated privileges for testing/admin purposes. */
  is_admin: boolean;
}

export interface CreateApiKeyInput {
  name: string;
  email: string;
  userId?: string;
}

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'fms_';
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export async function createApiKey(input: CreateApiKeyInput): Promise<{ apiKey: ApiKey; rawKey: string }> {
  const id = uuidv4();
  const rawKey = generateApiKey();
  const hashedKey = await bcrypt.hash(rawKey, 10);
  const sb = getSupabase();

  const { error } = await sb.from('api_keys').insert({
    id, key: hashedKey, name: input.name, email: input.email, user_id: input.userId || null,
  });
  if (error) throw error;

  const { data, error: fetchErr } = await sb.from('api_keys').select('*').eq('id', id).single();
  if (fetchErr) throw fetchErr;
  return { apiKey: { ...data, is_admin: false } as ApiKey, rawKey };
}

export async function validateApiKey(rawKey: string): Promise<ApiKey | null> {
  const sb = getSupabase();
  const { data: keys, error } = await sb.from('api_keys').select('*').eq('is_active', true);
  if (error || !keys) return null;

  for (const storedKey of keys) {
    if (await bcrypt.compare(rawKey, storedKey.key)) {
      await sb.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', storedKey.id);
      return storedKey as ApiKey;
    }
  }
  return null;
}

export async function getAllApiKeys(): Promise<ApiKey[]> {
  const sb = getSupabase();
  const { data, error } = await sb.from('api_keys').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as ApiKey[];
}

/** Return all API keys owned by a specific Supabase user. */
export async function getApiKeysByUserId(userId: string): Promise<ApiKey[]> {
  const sb = getSupabase();
  const { data, error } = await sb.from('api_keys').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as ApiKey[];
}

export async function deactivateApiKey(id: string): Promise<boolean> {
  const sb = getSupabase();
  const { error } = await sb.from('api_keys').update({ is_active: false }).eq('id', id);
  return !error;
}

export async function getApiKeyById(id: string): Promise<ApiKey | null> {
  const sb = getSupabase();
  const { data, error } = await sb.from('api_keys').select('*').eq('id', id).single();
  if (error || !data) return null;
  return data as ApiKey;
}

/**
 * Resolve the active API key that owns an inbound email address.
 * Inbound mail is routed to a key by matching the recipient against the key's
 * `email` field (case-insensitive). Returns null when nothing matches.
 */
export async function getApiKeyByInboundAddress(address: string): Promise<ApiKey | null> {
  const normalized = (address || '').trim();
  if (!normalized) return null;
  const sb = getSupabase();
  // ilike is case-insensitive but treats `_`/`%` as wildcards, so confirm an
  // exact (case-insensitive) match in JS before returning.
  const { data, error } = await sb
    .from('api_keys')
    .select('*')
    .eq('is_active', true)
    .ilike('email', normalized);
  if (error || !data) return null;
  const needle = normalized.toLowerCase();
  const match = data.find((k: any) => String(k.email || '').toLowerCase() === needle);
  return (match as ApiKey) || null;
}

export async function deleteApiKey(id: string): Promise<boolean> {
  const sb = getSupabase();
  // CASCADE handles children but we clean explicitly for safety
  const { data: emails } = await sb.from('emails').select('id').eq('api_key_id', id);
  if (emails && emails.length > 0) {
    const emailIds = emails.map((e: any) => e.id);
    await sb.from('email_events').delete().in('email_id', emailIds);
    await sb.from('emails').delete().eq('api_key_id', id);
  }
  await sb.from('webhooks').delete().eq('api_key_id', id);
  await sb.from('domains').delete().eq('api_key_id', id);
  await sb.from('templates').delete().eq('api_key_id', id);
  const { error } = await sb.from('api_keys').delete().eq('id', id);
  return !error;
}

export async function incrementEmailCount(apiKeyId: string): Promise<void> {
  const sb = getSupabase();
  // Supabase doesn't have atomic increment, so fetch + update
  const { data } = await sb.from('api_keys').select('total_emails_sent').eq('id', apiKeyId).single();
  if (data) {
    await sb.from('api_keys').update({ total_emails_sent: (data.total_emails_sent || 0) + 1 }).eq('id', apiKeyId);
  }
}

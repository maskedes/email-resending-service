import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../database/db';

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  email: string;
  created_at: string;
  is_active: boolean;
  total_emails_sent: number;
  last_used_at: string | null;
}

export interface CreateApiKeyInput {
  name: string;
  email: string;
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

  await query(
    `INSERT INTO api_keys (id, key, name, email) VALUES ($1, $2, $3, $4)`,
    [id, hashedKey, input.name, input.email]
  );

  const apiKey = await queryOne<ApiKey>(`SELECT * FROM api_keys WHERE id = $1`, [id]);
  return { apiKey: apiKey!, rawKey };
}

export async function validateApiKey(rawKey: string): Promise<ApiKey | null> {
  const keys = await query<ApiKey>(`SELECT * FROM api_keys WHERE is_active = TRUE`);

  for (const storedKey of keys) {
    if (await bcrypt.compare(rawKey, storedKey.key)) {
      await query(`UPDATE api_keys SET last_used_at = now() WHERE id = $1`, [storedKey.id]);
      return storedKey;
    }
  }

  return null;
}

export async function getAllApiKeys(): Promise<ApiKey[]> {
  return query<ApiKey>(`SELECT * FROM api_keys ORDER BY created_at DESC`);
}

export async function deactivateApiKey(id: string): Promise<boolean> {
  const result = await queryOne<{ ok: boolean }>(
    `UPDATE api_keys SET is_active = FALSE WHERE id = $1 RETURNING TRUE AS ok`,
    [id]
  );
  return !!result;
}

export async function getApiKeyById(id: string): Promise<ApiKey | null> {
  return (await queryOne<ApiKey>(`SELECT * FROM api_keys WHERE id = $1`, [id])) || null;
}

export async function incrementEmailCount(apiKeyId: string): Promise<void> {
  await query(`UPDATE api_keys SET total_emails_sent = total_emails_sent + 1 WHERE id = $1`, [apiKeyId]);
}

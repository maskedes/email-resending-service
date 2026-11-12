"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiKey = createApiKey;
exports.invalidateApiKeyCacheById = invalidateApiKeyCacheById;
exports.validateApiKey = validateApiKey;
exports.getAllApiKeys = getAllApiKeys;
exports.getApiKeysByUserId = getApiKeysByUserId;
exports.deactivateApiKey = deactivateApiKey;
exports.getApiKeyById = getApiKeyById;
exports.getApiKeyByInboundAddress = getApiKeyByInboundAddress;
exports.deleteApiKey = deleteApiKey;
exports.incrementEmailCount = incrementEmailCount;
const crypto_1 = __importDefault(require("crypto"));
const node_crypto_1 = require("node:crypto");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const supabase_1 = require("../database/supabase");
function generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'fms_';
    for (let i = 0; i < 48; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}
async function createApiKey(input) {
    const id = (0, node_crypto_1.randomUUID)();
    const rawKey = generateApiKey();
    const hashedKey = await bcryptjs_1.default.hash(rawKey, 10);
    const sb = (0, supabase_1.getSupabase)();
    const { error } = await sb.from('api_keys').insert({
        id, key: hashedKey, name: input.name, email: input.email, user_id: input.userId || null,
    });
    if (error)
        throw error;
    const { data, error: fetchErr } = await sb.from('api_keys').select('*').eq('id', id).single();
    if (fetchErr)
        throw fetchErr;
    return { apiKey: { ...data, is_admin: false }, rawKey };
}
/**
 * In-memory validation cache.
 *
 * The previous implementation bcrypt-compared the presented key against
 * EVERY active key in the database on every request (~100 ms per compare,
 * O(n) per request). Now the first validation for a given raw key is
 * memoized (keyed by SHA-256 of the raw key, never the key itself) and
 * reused until the TTL expires or the key changes server-side.
 */
const VALIDATION_TTL_MS = 5 * 60 * 1000;
const validationCache = new Map();
function sha256(input) {
    return crypto_1.default.createHash('sha256').update(input).digest('hex');
}
/** Drop a cached validation (e.g. after delete/revoke) so revocation is prompt. */
function invalidateApiKeyCacheById(apiKeyId) {
    for (const [hash, entry] of validationCache) {
        if (entry.apiKey.id === apiKeyId)
            validationCache.delete(hash);
    }
}
async function validateApiKey(rawKey) {
    const cacheHash = sha256(rawKey);
    const cached = validationCache.get(cacheHash);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.apiKey;
    }
    if (cached)
        validationCache.delete(cacheHash);
    const sb = (0, supabase_1.getSupabase)();
    const { data: keys, error } = await sb.from('api_keys').select('*').eq('is_active', true);
    if (error || !keys)
        return null;
    for (const storedKey of keys) {
        if (await bcryptjs_1.default.compare(rawKey, storedKey.key)) {
            const apiKey = storedKey;
            validationCache.set(cacheHash, { apiKey, expiresAt: Date.now() + VALIDATION_TTL_MS });
            await sb.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKey.id);
            return apiKey;
        }
    }
    return null;
}
async function getAllApiKeys() {
    const sb = (0, supabase_1.getSupabase)();
    const { data, error } = await sb.from('api_keys').select('*').order('created_at', { ascending: false });
    if (error)
        throw error;
    return (data || []);
}
/** Return all API keys owned by a specific Supabase user. */
async function getApiKeysByUserId(userId) {
    const sb = (0, supabase_1.getSupabase)();
    const { data, error } = await sb.from('api_keys').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error)
        throw error;
    return (data || []);
}
async function deactivateApiKey(id) {
    const sb = (0, supabase_1.getSupabase)();
    const { error } = await sb.from('api_keys').update({ is_active: false }).eq('id', id);
    invalidateApiKeyCacheById(id);
    return !error;
}
async function getApiKeyById(id) {
    const sb = (0, supabase_1.getSupabase)();
    const { data, error } = await sb.from('api_keys').select('*').eq('id', id).single();
    if (error || !data)
        return null;
    return data;
}
/**
 * Resolve the active API key that owns an inbound email address.
 * Inbound mail is routed to a key by matching the recipient against the key's
 * `email` field (case-insensitive). Returns null when nothing matches.
 */
async function getApiKeyByInboundAddress(address) {
    const normalized = (address || '').trim();
    if (!normalized)
        return null;
    const sb = (0, supabase_1.getSupabase)();
    // ilike is case-insensitive but treats `_`/`%` as wildcards, so confirm an
    // exact (case-insensitive) match in JS before returning.
    const { data, error } = await sb
        .from('api_keys')
        .select('*')
        .eq('is_active', true)
        .ilike('email', normalized);
    if (error || !data)
        return null;
    const needle = normalized.toLowerCase();
    const match = data.find((k) => String(k.email || '').toLowerCase() === needle);
    return match || null;
}
async function deleteApiKey(id) {
    const sb = (0, supabase_1.getSupabase)();
    // CASCADE handles children but we clean explicitly for safety
    const { data: emails } = await sb.from('emails').select('id').eq('api_key_id', id);
    if (emails && emails.length > 0) {
        const emailIds = emails.map((e) => e.id);
        await sb.from('email_events').delete().in('email_id', emailIds);
        await sb.from('emails').delete().eq('api_key_id', id);
    }
    await sb.from('webhooks').delete().eq('api_key_id', id);
    await sb.from('domains').delete().eq('api_key_id', id);
    await sb.from('templates').delete().eq('api_key_id', id);
    invalidateApiKeyCacheById(id);
    const { error } = await sb.from('api_keys').delete().eq('id', id);
    return !error;
}
async function incrementEmailCount(apiKeyId) {
    const sb = (0, supabase_1.getSupabase)();
    // Supabase doesn't have atomic increment, so fetch + update
    const { data } = await sb.from('api_keys').select('total_emails_sent').eq('id', apiKeyId).single();
    if (data) {
        await sb.from('api_keys').update({ total_emails_sent: (data.total_emails_sent || 0) + 1 }).eq('id', apiKeyId);
    }
}
//# sourceMappingURL=apiKeyService.js.map
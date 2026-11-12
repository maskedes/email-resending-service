"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveForwardFor = resolveForwardFor;
exports.listForwardingRules = listForwardingRules;
exports.createForwardingRule = createForwardingRule;
exports.deleteForwardingRule = deleteForwardingRule;
const node_crypto_1 = require("node:crypto");
const supabase_1 = require("../database/supabase");
const LOCAL_PART_RE = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function normalizeAddress(value) {
    return (value || '').trim().toLowerCase();
}
/** Splits "user@example.com" into its lowercased local part and domain. */
function splitAddress(address) {
    const normalized = normalizeAddress(address);
    const at = normalized.lastIndexOf('@');
    if (at <= 0 || at === normalized.length - 1)
        return null;
    return { local: normalized.slice(0, at), domain: normalized.slice(at + 1) };
}
/**
 * Resolves the forwarding rule for an inbound recipient.
 * Match order mirrors DNSimple's semantics:
 *   1. exact alias on the recipient's domain (most specific wins)
 *   2. the domain catch-all ('*')
 * The rule's owning key must still be active and allowed incoming email.
 */
async function resolveForwardFor(recipient) {
    const parts = splitAddress(recipient);
    if (!parts)
        return null;
    const sb = (0, supabase_1.getSupabase)();
    // Exact alias first…
    let match = null;
    let catchAll = false;
    const { data: exact } = await sb
        .from('forwarding_rules')
        .select('*')
        .eq('is_active', true)
        .ilike('domain', parts.domain)
        .ilike('alias', parts.local)
        .limit(2);
    if (exact && exact.length > 0) {
        // ilike treats _/% as wildcards — confirm a real case-insensitive match.
        match = exact.find((r) => normalizeAddress(r.alias) === parts.local
            && normalizeAddress(r.domain) === parts.domain) || null;
    }
    // …then the domain catch-all.
    if (!match) {
        const { data: all } = await sb
            .from('forwarding_rules')
            .select('*')
            .eq('is_active', true)
            .ilike('domain', parts.domain)
            .eq('alias', '*')
            .limit(2);
        if (all && all.length > 0) {
            match = all.find((r) => normalizeAddress(r.domain) === parts.domain) || null;
            catchAll = !!match;
        }
    }
    if (!match)
        return null;
    // The owning key gates delivery: inactive keys and keys that disabled
    // incoming email must not keep receiving forwarded mail.
    const { data: key } = await sb
        .from('api_keys')
        .select('id, is_active, allow_incoming_email')
        .eq('id', match.api_key_id)
        .single();
    if (!key || key.is_active !== true || key.allow_incoming_email !== true)
        return null;
    return { rule: match, apiKeyId: key.id, catchAll };
}
/** Lists every forwarding rule owned by a key, newest first. */
async function listForwardingRules(apiKeyId) {
    const sb = (0, supabase_1.getSupabase)();
    const { data, error } = await sb
        .from('forwarding_rules')
        .select('*')
        .eq('api_key_id', apiKeyId)
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    return (data || []);
}
/**
 * Creates a forwarding rule. The domain must already belong to the key and be
 * verified — forwarding from an uncontrolled domain would let a tenant
 * intercept mail for names it does not own.
 */
async function createForwardingRule(input) {
    const domain = normalizeAddress(input.domain).replace(/\.$/, '');
    const alias = input.alias === '*' ? '*' : normalizeAddress(input.alias);
    const destination = normalizeAddress(input.destination);
    if (!domain || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
        throw Object.assign(new Error('A valid domain (e.g. example.com) is required.'), { status: 400 });
    }
    if (alias !== '*' && (!alias || alias.length > 64 || !LOCAL_PART_RE.test(alias))) {
        throw Object.assign(new Error('Alias must be a valid local part (e.g. "sales") or "*" for catch-all.'), { status: 400 });
    }
    if (!destination || !EMAIL_RE.test(destination)) {
        throw Object.assign(new Error('A valid destination email address is required.'), { status: 400 });
    }
    // Ownership + verification check: the key must own a domain with this name
    // and that domain must already be verified.
    const { data: owned, error: ownedErr } = await (0, supabase_1.getSupabase)()
        .from('domains')
        .select('id, name, status')
        .eq('api_key_id', input.apiKeyId)
        .ilike('name', domain);
    if (ownedErr)
        throw ownedErr;
    const verified = (owned || []).find((d) => String(d.name || '').toLowerCase() === domain && d.status === 'verified');
    if (!verified) {
        const exists = (owned || []).some((d) => String(d.name || '').toLowerCase() === domain);
        throw Object.assign(new Error(exists
            ? 'This domain is not verified yet — verify it in DNS settings first.'
            : 'Add and verify this domain before creating forwarding rules for it.'), { status: 403 });
    }
    const sb = (0, supabase_1.getSupabase)();
    const id = (0, node_crypto_1.randomUUID)();
    const { data, error } = await sb
        .from('forwarding_rules')
        .insert({ id, api_key_id: input.apiKeyId, domain: verified.name, alias, destination })
        .select('*')
        .single();
    if (error) {
        if (error.code === '23505') {
            throw Object.assign(new Error('This exact rule already exists.'), { status: 409 });
        }
        throw error;
    }
    return data;
}
/** Deletes a rule, scoped to the owning key. */
async function deleteForwardingRule(id, apiKeyId) {
    const sb = (0, supabase_1.getSupabase)();
    const { error } = await sb
        .from('forwarding_rules')
        .delete()
        .eq('id', id)
        .eq('api_key_id', apiKeyId);
    return !error;
}
//# sourceMappingURL=forwardingService.js.map
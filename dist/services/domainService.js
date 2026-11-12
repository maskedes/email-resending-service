"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDomain = createDomain;
exports.getDomainsByApiKey = getDomainsByApiKey;
exports.sanitizeDomain = sanitizeDomain;
exports.getDomainById = getDomainById;
exports.verifyDomainDns = verifyDomainDns;
exports.deleteDomain = deleteDomain;
const node_crypto_1 = require("node:crypto");
const node_crypto_2 = require("node:crypto");
const supabase_1 = require("../database/supabase");
const dnsService_1 = require("./dnsService");
/**
 * Generates a real RSA-2048 key pair for DKIM signing.
 */
function generateDKIMKeys() {
    const { privateKey, publicKey } = (0, node_crypto_2.generateKeyPairSync)('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    // Build the DNS TXT value from the DER base64 of the public key (no PEM armor)
    const base64Pub = publicKey
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\s+/g, '');
    return { privateKey, publicKey: `v=DKIM1; k=rsa; p=${base64Pub}` };
}
function generateSPFRecord() {
    // Include covers the infrastructure client mail actually leaves from.
    // SENDING_SPF_INCLUDE env override (self-hosted egress) > Brevo default.
    // The old "spf.freemailsend.com" token was never backed by DNS.
    const include = (process.env.SENDING_SPF_INCLUDE || 'spf.brevo.com').trim();
    return `v=spf1 include:${include} ~all`;
}
function generateDKIMRecordName() {
    return `fm${Date.now().toString(36).slice(-6)}._domainkey`;
}
function generateDMARCRecord(domain) {
    return `v=DMARC1; p=none; rua=mailto:dmarc@${domain}; sp=none; adkim=r; aspf=r`;
}
async function createDomain(input) {
    const sb = (0, supabase_1.getSupabase)();
    // Reject domains already registered to ANOTHER account in this service.
    const { data: existing } = await sb.from('domains')
        .select('id, api_key_id')
        .eq('name', input.name)
        .single();
    if (existing) {
        const error = new Error(existing.api_key_id !== input.apiKeyId
            ? 'This domain is already registered to another account.'
            : 'This domain has already been added to your account.');
        error.code = '23505'; // mimic unique-violation so the route returns 409
        throw error;
    }
    const id = (0, node_crypto_1.randomUUID)();
    const { privateKey, publicKey } = generateDKIMKeys();
    const dkimRecordName = generateDKIMRecordName();
    const spfRecord = generateSPFRecord();
    const dmarcRecord = generateDMARCRecord(input.name);
    const { error: insertErr } = await sb.from('domains').insert({
        id, api_key_id: input.apiKeyId, name: input.name,
        dkim_private_key: privateKey, dkim_public_key: publicKey,
        spf_record: spfRecord, dkim_record_name: dkimRecordName,
        dkim_record_value: publicKey, dmarc_record: dmarcRecord,
    });
    if (insertErr)
        throw insertErr;
    const { data: domain } = await sb.from('domains').select('*').eq('id', id).single();
    return domain;
}
async function getDomainsByApiKey(apiKeyId) {
    const sb = (0, supabase_1.getSupabase)();
    const { data } = await sb.from('domains').select('*').eq('api_key_id', apiKeyId).order('created_at', { ascending: false });
    return (data || []);
}
/**
 * Strips secrets from a domain row before it is returned over the wire.
 *
 * `dkim_private_key` is a signing secret — it must NEVER leave the server.
 * Callers get the public DNS records (SPF/DKIM/DMARC) they need to configure
 * their DNS, but not the private key used to sign outgoing mail.
 */
function sanitizeDomain(domain) {
    const { dkim_private_key: _privateKey, ...safe } = domain;
    return safe;
}
/**
 * Looks up a single domain, optionally scoped to the owning API key.
 * When `apiKeyId` is provided, a domain owned by another key returns null
 * (no cross-tenant access).
 */
async function getDomainById(id, apiKeyId) {
    const sb = (0, supabase_1.getSupabase)();
    let query = sb.from('domains').select('*').eq('id', id);
    if (apiKeyId)
        query = query.eq('api_key_id', apiKeyId);
    const { data } = await query.single();
    return data || null;
}
/**
 * Runs real DNS verification against SPF / DKIM / DMARC records and
 * updates the stored domain status + per-record flags.
 */
async function verifyDomainDns(id, apiKeyId) {
    const domain = await getDomainById(id, apiKeyId);
    if (!domain)
        return null;
    const checks = await (0, dnsService_1.checkAllDns)({
        name: domain.name,
        dkimRecordName: domain.dkim_record_name,
        dkimRecordValue: domain.dkim_record_value,
    });
    const byType = Object.fromEntries(checks.map((c) => [c.type, c.verified]));
    const allVerified = checks.every((c) => c.verified);
    const anyVerified = checks.some((c) => c.verified);
    const overall = allVerified
        ? 'verified'
        : anyVerified
            ? 'partial'
            : 'failed';
    const sb = (0, supabase_1.getSupabase)();
    await sb.from('domains').update({
        spf_verified: byType['SPF'] || false,
        dkim_verified: byType['DKIM'] || false,
        dmarc_verified: byType['DMARC'] || false,
        status: overall,
        verified_at: overall === 'verified' ? new Date().toISOString() : undefined,
        last_checked_at: new Date().toISOString(),
    }).eq('id', id);
    const updated = await getDomainById(id, apiKeyId);
    return {
        domain: updated,
        checks,
        overall,
        allVerified,
    };
}
async function deleteDomain(id, apiKeyId) {
    const sb = (0, supabase_1.getSupabase)();
    // Resolve the domain name first so its forwarding rules can be removed too.
    const { data: row } = await sb.from('domains').select('name, api_key_id').eq('id', id).single();
    let query = sb.from('domains').delete().eq('id', id);
    if (apiKeyId)
        query = query.eq('api_key_id', apiKeyId);
    const { error } = await query;
    if (error)
        return false;
    // Forwarding rules have no FK on domains (domains are free-text there), so
    // without this they would silently keep matching inbound mail after the
    // domain is deleted. Clean them up by name, scoped to the owning key.
    if (row?.name) {
        let rules = sb.from('forwarding_rules').delete().ilike('domain', row.name);
        if (row.api_key_id)
            rules = rules.eq('api_key_id', row.api_key_id);
        await rules;
    }
    return true;
}
//# sourceMappingURL=domainService.js.map
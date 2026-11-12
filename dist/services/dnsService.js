"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTxt = resolveTxt;
exports.checkDomainExists = checkDomainExists;
exports.checkAuthoritativeDns = checkAuthoritativeDns;
exports.spfIncludeCandidates = spfIncludeCandidates;
exports.checkSpf = checkSpf;
exports.checkDkim = checkDkim;
exports.checkDmarc = checkDmarc;
exports.checkMx = checkMx;
exports.checkAllDns = checkAllDns;
const node_dns_1 = require("node:dns");
/**
 * Resolves TXT records for a hostname using real DNS.
 * Returns an array of raw TXT strings (joined across quoted chunks).
 */
async function resolveTxt(hostname) {
    try {
        const records = await node_dns_1.promises.resolveTxt(hostname);
        return records.map((chunks) => chunks.join(''));
    }
    catch (err) {
        if (err.code === 'ENODATA' || err.code === 'ENOTFOUND' || err.code === 'ENODNS') {
            return []; // No TXT records — not an error for our purposes
        }
        throw err;
    }
}
/**
 * Normalizes a TXT value for comparison: lowercases, collapses whitespace.
 */
function normalize(value) {
    return value.replace(/\s+/g, '').toLowerCase();
}
/**
 * Check #1 — Does the domain actually exist in public DNS?
 * Resolves A / AAAA / NS / MX; any successful answer means it exists.
 */
async function checkDomainExists(domain) {
    const hostname = domain;
    const found = [];
    let exists = false;
    const tryResolve = async (fn, label) => {
        try {
            const res = await fn();
            if (Array.isArray(res) && res.length > 0) {
                exists = true;
                const first = res[0];
                found.push(label + (typeof first === 'object' ? ` ${first.exchange ?? first.nsdname ?? ''}` : ` ${first}`));
            }
        }
        catch {
            /* record type absent — try the next one */
        }
    };
    await tryResolve(() => node_dns_1.promises.resolve4(domain), 'A');
    await tryResolve(() => node_dns_1.promises.resolve6(domain), 'AAAA');
    await tryResolve(() => node_dns_1.promises.resolveNs(domain), 'NS');
    await tryResolve(() => node_dns_1.promises.resolveMx(domain), 'MX');
    return {
        type: 'DOMAIN',
        hostname,
        expected: 'Domain exists in public DNS',
        found: exists ? found : null,
        verified: exists,
        detail: exists
            ? `Domain exists in public DNS (${found.join(', ')}).`
            // An expired domain is disabled at the registry level, so it stops
            // resolving exactly like a never-registered name.
            : 'Domain does not resolve in public DNS. Check that the domain is registered, has DNS records, and has not expired (an expired domain stops resolving during its grace period).',
    };
}
/**
 * Check #2 — Can we resolve its authoritative DNS?
 */
async function checkAuthoritativeDns(domain) {
    const hostname = domain;
    let found = [];
    try {
        found = await node_dns_1.promises.resolveNs(domain);
    }
    catch {
        found = [];
    }
    const verified = found.length > 0;
    return {
        type: 'NS',
        hostname,
        expected: 'Authoritative nameservers resolvable',
        found: verified ? found : null,
        verified,
        detail: verified
            ? `Authoritative nameservers: ${found.join(', ')}`
            // A previously-working domain failing this check often means the zone
            // moved (registrar transfer / new DNS host) and records were not re-added.
            : 'Could not resolve authoritative nameservers for this domain. If this domain worked before, a registrar transfer or DNS-host change may have moved the zone — re-add the MX/SPF/DKIM records at the new DNS host.',
    };
}
/**
 * Candidate SPF include tokens that authorize our outbound infrastructure.
 * Order of precedence:
 *   1. SENDING_SPF_INCLUDE env var (explicit operator override, e.g. a
 *      self-hosted "spf1.yourdomain.com" publishing the sending IPs)
 *   2. spf.brevo.com — platform sends via Brevo's HTTPS API
 *   3. spf.freemailsend.com — legacy token kept so domains verified before
 *      the rebrand still pass
 */
function spfIncludeCandidates() {
    const env = (process.env.SENDING_SPF_INCLUDE || '').trim();
    return env
        ? [...new Set([env, 'spf.brevo.com', 'spf.freemailsend.com'])]
        : ['spf.brevo.com', 'spf.freemailsend.com'];
}
/**
 * Verifies SPF: looks for a TXT record at the root domain that
 * starts with v=spf1 and includes ANY of our include tokens
 * (see spfIncludeCandidates).
 */
async function checkSpf(domain) {
    const candidates = spfIncludeCandidates();
    const expected = `v=spf1 ${candidates.map((c) => `include:${c}`).join(' ')} ~all`;
    const hostname = domain;
    const found = await resolveTxt(hostname);
    const matching = found.find((r) => normalize(r).startsWith('v=spf1'));
    const verified = !!matching &&
        candidates.some((token) => normalize(matching).includes(`include:${token}`));
    return {
        type: 'SPF',
        hostname,
        expected,
        found,
        verified,
        detail: verified
            ? 'SPF record found and includes our include token.'
            : matching
                ? 'SPF record exists but is missing our include token.'
                : 'No SPF record found at the root domain.',
    };
}
/**
 * Verifies DKIM: looks up the generated DKIM selector hostname and
 * confirms the published key matches our expected value.
 */
async function checkDkim(domain, dkimRecordName, expectedValue) {
    const hostname = `${dkimRecordName}.${domain}`;
    const found = await resolveTxt(hostname);
    const normExpected = normalize(expectedValue);
    const verified = found.some((r) => normalize(r) === normExpected);
    return {
        type: 'DKIM',
        hostname,
        expected: expectedValue,
        found,
        verified,
        detail: verified
            ? 'DKIM record found and matches.'
            : found.length > 0
                ? 'DKIM record exists but does not match our expected key.'
                : 'No DKIM record found. Add the TXT record above.',
    };
}
/**
 * Parses a DMARC record into its tag/value pairs.
 */
function parseDmarc(record) {
    const tags = {};
    for (const part of record.split(';')) {
        const idx = part.indexOf('=');
        if (idx === -1)
            continue;
        const key = part.slice(0, idx).trim().toLowerCase();
        const value = part.slice(idx + 1).trim();
        if (key)
            tags[key] = value;
    }
    return tags;
}
/**
 * Verifies DMARC: looks for a TXT record at _dmarc.<domain> with v=DMARC1
 * AND parses the policy so it must contain a valid p= tag
 * (none | quarantine | reject).
 */
async function checkDmarc(domain) {
    const expected = `v=DMARC1; p=none`;
    const hostname = `_dmarc.${domain}`;
    const found = await resolveTxt(hostname);
    const record = found.find((r) => normalize(r).startsWith('v=dmarc1'));
    let verified = false;
    let detail = 'No DMARC record found. Add the TXT record above.';
    if (record) {
        const tags = parseDmarc(record);
        const policy = tags['p'];
        const validPolicy = !!policy && ['none', 'quarantine', 'reject'].includes(policy.toLowerCase());
        if (validPolicy) {
            verified = true;
            detail = `DMARC record found and parses correctly (p=${policy.toLowerCase()}).`;
        }
        else if (policy) {
            detail = `DMARC record found but p= policy "${policy}" is invalid (must be none, quarantine, or reject).`;
        }
        else {
            detail = 'DMARC record found but missing the required p= policy tag.';
        }
    }
    return {
        type: 'DMARC',
        hostname,
        expected,
        found,
        verified,
        detail,
    };
}
/**
 * Check #6 — MX records (email reception, DNSimple-style).
 * When INBOUND_MX_HOST is configured, verifies the domain's MX records point
 * at the inbound mail host so messages can actually be received and forwarded.
 * Without it the check is skipped (inbound reception is not part of the setup).
 *
 * SPF note: SPF is verified separately by checkSpf — operators who add a
 * forwarding/receiving provider merge its include into the existing v=spf1
 * record (checkSpf's detail text reports a present-but-missing-include SPF).
 */
async function checkMx(domain) {
    const expectedHost = (process.env.INBOUND_MX_HOST || '').trim();
    if (!expectedHost)
        return null; // feature not in use for this deployment
    const hostname = domain;
    let found = [];
    try {
        found = await node_dns_1.promises.resolveMx(domain);
    }
    catch {
        found = [];
    }
    const normalize = (h) => h.replace(/\.$/, '').toLowerCase();
    const expected = `MX → ${expectedHost}`;
    const target = normalize(expectedHost);
    const verified = found.some((mx) => normalize(mx.exchange) === target);
    return {
        type: 'MX',
        hostname,
        expected,
        found: found.length > 0 ? found.map((mx) => `${mx.priority} ${mx.exchange}`) : null,
        verified,
        detail: verified
            ? `MX records point at ${expectedHost} — inbound mail can be received.`
            : found.length > 0
                ? `MX records exist but none point at ${expectedHost}. Add an MX record → ${expectedHost} so mail for this domain reaches the forwarding service.`
                : `No MX records found. Add an MX record → ${expectedHost} (email reception) and merge its include into your SPF record.`,
    };
}
/**
 * Runs all DNS checks for a domain, in the spec order:
 *   1. Domain exists in public DNS
 *   2. Authoritative DNS resolvable
 *   3. SPF contains our include
 *   4. DKIM TXT matches our key
 *   5. DMARC exists and parses
 *   6. MX records point at the inbound host (skipped when INBOUND_MX_HOST
 *      is not configured — see checkMx)
 */
async function checkAllDns(domain) {
    const [domainExists, ns, spf, dkim, dmarc, mx] = await Promise.all([
        checkDomainExists(domain.name),
        checkAuthoritativeDns(domain.name),
        checkSpf(domain.name),
        checkDkim(domain.name, domain.dkimRecordName, domain.dkimRecordValue),
        checkDmarc(domain.name),
        checkMx(domain.name),
    ]);
    return [domainExists, ns, spf, dkim, dmarc, ...(mx ? [mx] : [])];
}
//# sourceMappingURL=dnsService.js.map
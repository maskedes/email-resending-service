import { promises as dns } from 'node:dns';

export type DnsRecordType = 'DOMAIN' | 'NS' | 'SPF' | 'DKIM' | 'DMARC';

export interface DnsRecordStatus {
  type: DnsRecordType;
  hostname: string;
  expected: string;
  found: string[] | null;
  verified: boolean;
  detail: string;
}

/**
 * Resolves TXT records for a hostname using real DNS.
 * Returns an array of raw TXT strings (joined across quoted chunks).
 */
export async function resolveTxt(hostname: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(hostname);
    return records.map((chunks) => chunks.join(''));
  } catch (err: any) {
    if (err.code === 'ENODATA' || err.code === 'ENOTFOUND' || err.code === 'ENODNS') {
      return []; // No TXT records — not an error for our purposes
    }
    throw err;
  }
}

/**
 * Normalizes a TXT value for comparison: lowercases, collapses whitespace.
 */
function normalize(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

/**
 * Check #1 — Does the domain actually exist in public DNS?
 * Resolves A / AAAA / NS / MX; any successful answer means it exists.
 */
export async function checkDomainExists(domain: string): Promise<DnsRecordStatus> {
  const hostname = domain;
  const found: string[] = [];
  let exists = false;

  const tryResolve = async (fn: () => Promise<any>, label: string): Promise<void> => {
    try {
      const res = await fn();
      if (Array.isArray(res) && res.length > 0) {
        exists = true;
        const first = res[0];
        found.push(label + (typeof first === 'object' ? ` ${first.exchange ?? first.nsdname ?? ''}` : ` ${first}`));
      }
    } catch {
      /* record type absent — try the next one */
    }
  };

  await tryResolve(() => dns.resolve4(domain), 'A');
  await tryResolve(() => dns.resolve6(domain), 'AAAA');
  await tryResolve(() => dns.resolveNs(domain), 'NS');
  await tryResolve(() => dns.resolveMx(domain), 'MX');

  return {
    type: 'DOMAIN',
    hostname,
    expected: 'Domain exists in public DNS',
    found: exists ? found : null,
    verified: exists,
    detail: exists
      ? `Domain exists in public DNS (${found.join(', ')}).`
      : 'Domain does not resolve in public DNS. Check that the domain is registered and has DNS records.',
  };
}

/**
 * Check #2 — Can we resolve its authoritative DNS?
 */
export async function checkAuthoritativeDns(domain: string): Promise<DnsRecordStatus> {
  const hostname = domain;
  let found: string[] = [];
  try {
    found = await dns.resolveNs(domain);
  } catch {
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
      : 'Could not resolve authoritative nameservers for this domain.',
  };
}

/**
 * Verifies SPF: looks for a TXT record at the root domain that
 * starts with v=spf1 and includes our include token.
 */
export async function checkSpf(domain: string): Promise<DnsRecordStatus> {
  const expected = `v=spf1 include:spf.freemailsend.com ~all`;
  const hostname = domain;
  const found = await resolveTxt(hostname);
  const normExpected = normalize(expected);

  const matching = found.find((r) => normalize(r).startsWith('v=spf1'));
  const verified =
    !!matching && normalize(matching).includes('include:spf.freemailsend.com');

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
export async function checkDkim(domain: string, dkimRecordName: string, expectedValue: string): Promise<DnsRecordStatus> {
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
function parseDmarc(record: string): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const part of record.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (key) tags[key] = value;
  }
  return tags;
}

/**
 * Verifies DMARC: looks for a TXT record at _dmarc.<domain> with v=DMARC1
 * AND parses the policy so it must contain a valid p= tag
 * (none | quarantine | reject).
 */
export async function checkDmarc(domain: string): Promise<DnsRecordStatus> {
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
    } else if (policy) {
      detail = `DMARC record found but p= policy "${policy}" is invalid (must be none, quarantine, or reject).`;
    } else {
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
 * Runs all DNS checks for a domain, in the spec order:
 *   1. Domain exists in public DNS
 *   2. Authoritative DNS resolvable
 *   3. SPF contains our include
 *   4. DKIM TXT matches our key
 *   5. DMARC exists and parses
 */
export async function checkAllDns(domain: {
  name: string;
  dkimRecordName: string;
  dkimRecordValue: string;
}): Promise<DnsRecordStatus[]> {
  const [domainExists, ns, spf, dkim, dmarc] = await Promise.all([
    checkDomainExists(domain.name),
    checkAuthoritativeDns(domain.name),
    checkSpf(domain.name),
    checkDkim(domain.name, domain.dkimRecordName, domain.dkimRecordValue),
    checkDmarc(domain.name),
  ]);
  return [domainExists, ns, spf, dkim, dmarc];
}

export type DnsRecordType = 'DOMAIN' | 'NS' | 'SPF' | 'DKIM' | 'DMARC' | 'MX';
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
export declare function resolveTxt(hostname: string): Promise<string[]>;
/**
 * Check #1 — Does the domain actually exist in public DNS?
 * Resolves A / AAAA / NS / MX; any successful answer means it exists.
 */
export declare function checkDomainExists(domain: string): Promise<DnsRecordStatus>;
/**
 * Check #2 — Can we resolve its authoritative DNS?
 */
export declare function checkAuthoritativeDns(domain: string): Promise<DnsRecordStatus>;
/**
 * Candidate SPF include tokens that authorize our outbound infrastructure.
 * Order of precedence:
 *   1. SENDING_SPF_INCLUDE env var (explicit operator override, e.g. a
 *      self-hosted "spf1.yourdomain.com" publishing the sending IPs)
 *   2. spf.brevo.com — platform sends via Brevo's HTTPS API
 *   3. spf.freemailsend.com — legacy token kept so domains verified before
 *      the rebrand still pass
 */
export declare function spfIncludeCandidates(): string[];
/**
 * Verifies SPF: looks for a TXT record at the root domain that
 * starts with v=spf1 and includes ANY of our include tokens
 * (see spfIncludeCandidates).
 */
export declare function checkSpf(domain: string): Promise<DnsRecordStatus>;
/**
 * Verifies DKIM: looks up the generated DKIM selector hostname and
 * confirms the published key matches our expected value.
 */
export declare function checkDkim(domain: string, dkimRecordName: string, expectedValue: string): Promise<DnsRecordStatus>;
/**
 * Verifies DMARC: looks for a TXT record at _dmarc.<domain> with v=DMARC1
 * AND parses the policy so it must contain a valid p= tag
 * (none | quarantine | reject).
 */
export declare function checkDmarc(domain: string): Promise<DnsRecordStatus>;
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
export declare function checkMx(domain: string): Promise<DnsRecordStatus | null>;
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
export declare function checkAllDns(domain: {
    name: string;
    dkimRecordName: string;
    dkimRecordValue: string;
}): Promise<DnsRecordStatus[]>;
//# sourceMappingURL=dnsService.d.ts.map
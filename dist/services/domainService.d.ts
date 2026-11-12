import { DnsRecordStatus } from './dnsService';
export interface Domain {
    id: string;
    api_key_id: string;
    name: string;
    status: 'pending' | 'verified' | 'failed' | 'partial';
    dkim_private_key: string | null;
    dkim_public_key: string | null;
    spf_record: string;
    dkim_record_name: string;
    dkim_record_value: string;
    dmarc_record: string;
    verified_at: string | null;
    spf_verified: boolean;
    dkim_verified: boolean;
    dmarc_verified: boolean;
    last_checked_at: string | null;
    created_at: string;
}
export interface CreateDomainInput {
    apiKeyId: string;
    name: string;
}
export interface DomainVerification {
    domain: Domain;
    checks: DnsRecordStatus[];
    overall: 'pending' | 'verified' | 'failed' | 'partial';
    allVerified: boolean;
}
export declare function createDomain(input: CreateDomainInput): Promise<Domain>;
export declare function getDomainsByApiKey(apiKeyId: string): Promise<Domain[]>;
/**
 * Strips secrets from a domain row before it is returned over the wire.
 *
 * `dkim_private_key` is a signing secret — it must NEVER leave the server.
 * Callers get the public DNS records (SPF/DKIM/DMARC) they need to configure
 * their DNS, but not the private key used to sign outgoing mail.
 */
export declare function sanitizeDomain(domain: Domain): Omit<Domain, 'dkim_private_key'>;
/**
 * Looks up a single domain, optionally scoped to the owning API key.
 * When `apiKeyId` is provided, a domain owned by another key returns null
 * (no cross-tenant access).
 */
export declare function getDomainById(id: string, apiKeyId?: string): Promise<Domain | null>;
/**
 * Runs real DNS verification against SPF / DKIM / DMARC records and
 * updates the stored domain status + per-record flags.
 */
export declare function verifyDomainDns(id: string, apiKeyId?: string): Promise<DomainVerification | null>;
export declare function deleteDomain(id: string, apiKeyId?: string): Promise<boolean>;
//# sourceMappingURL=domainService.d.ts.map
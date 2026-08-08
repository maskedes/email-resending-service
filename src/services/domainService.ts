import { v4 as uuidv4 } from 'uuid';
import { generateKeyPairSync } from 'node:crypto';
import { query, queryOne } from '../database/db';
import { checkAllDns, DnsRecordStatus } from './dnsService';

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

/**
 * Generates a real RSA-2048 key pair for DKIM signing.
 */
function generateDKIMKeys(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
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

function generateSPFRecord(): string {
  return `v=spf1 include:spf.freemailsend.com ~all`;
}

function generateDKIMRecordName(): string {
  return `fm${Date.now().toString(36).slice(-6)}._domainkey`;
}

function generateDMARCRecord(domain: string): string {
  return `v=DMARC1; p=none; rua=mailto:dmarc@${domain}; sp=none; adkim=r; aspf=r`;
}

export async function createDomain(input: CreateDomainInput): Promise<Domain> {
  // Reject domains already registered to ANOTHER account in this service.
  const existing = await queryOne<{ id: string; api_key_id: string }>(
    `SELECT id, api_key_id FROM domains WHERE name = $1`,
    [input.name]
  );

  if (existing) {
    const error: any = new Error(
      existing.api_key_id !== input.apiKeyId
        ? 'This domain is already registered to another account.'
        : 'This domain has already been added to your account.'
    );
    error.code = '23505'; // mimic unique-violation so the route returns 409
    throw error;
  }

  const id = uuidv4();
  const { privateKey, publicKey } = generateDKIMKeys();
  const dkimRecordName = generateDKIMRecordName();
  const spfRecord = generateSPFRecord();
  const dmarcRecord = generateDMARCRecord(input.name);

  await query(
    `INSERT INTO domains (id, api_key_id, name, dkim_private_key, dkim_public_key, spf_record, dkim_record_name, dkim_record_value, dmarc_record)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, input.apiKeyId, input.name, privateKey, publicKey, spfRecord, dkimRecordName, publicKey, dmarcRecord]
  );

  const domain = await queryOne<Domain>(`SELECT * FROM domains WHERE id = $1`, [id]);
  return domain!;
}

export async function getDomainsByApiKey(apiKeyId: string): Promise<Domain[]> {
  return query<Domain>(
    `SELECT * FROM domains WHERE api_key_id = $1 ORDER BY created_at DESC`,
    [apiKeyId]
  );
}

export async function getAllDomains(): Promise<Domain[]> {
  return query<Domain>(`SELECT * FROM domains ORDER BY created_at DESC`);
}

export async function getDomainById(id: string): Promise<Domain | null> {
  return (await queryOne<Domain>(`SELECT * FROM domains WHERE id = $1`, [id])) || null;
}

/**
 * Runs real DNS verification against SPF / DKIM / DMARC records and
 * updates the stored domain status + per-record flags.
 */
export async function verifyDomainDns(id: string): Promise<DomainVerification | null> {
  const domain = await getDomainById(id);
  if (!domain) return null;

  const checks = await checkAllDns({
    name: domain.name,
    dkimRecordName: domain.dkim_record_name,
    dkimRecordValue: domain.dkim_record_value,
  });

  const byType = Object.fromEntries(checks.map((c) => [c.type, c.verified]));
  const allVerified = checks.every((c) => c.verified);
  const anyVerified = checks.some((c) => c.verified);

  const overall: Domain['status'] = allVerified
    ? 'verified'
    : anyVerified
      ? 'partial'
      : 'failed';

  await query(
    `UPDATE domains
       SET spf_verified = $2,
           dkim_verified = $3,
           dmarc_verified = $4,
           status = $5,
           verified_at = CASE WHEN $5 = 'verified' THEN now() ELSE verified_at END,
           last_checked_at = now()
     WHERE id = $1`,
    [id, byType['SPF'] || false, byType['DKIM'] || false, byType['DMARC'] || false, overall]
  );

  const updated = await getDomainById(id);

  return {
    domain: updated!,
    checks,
    overall,
    allVerified,
  };
}

export async function deleteDomain(id: string): Promise<boolean> {
  const result = await queryOne<{ ok: boolean }>(
    `DELETE FROM domains WHERE id = $1 RETURNING TRUE AS ok`,
    [id]
  );
  return !!result;
}
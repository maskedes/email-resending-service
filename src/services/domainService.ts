import { v4 as uuidv4 } from 'uuid';
import { generateKeyPairSync } from 'node:crypto';
import { getSupabase } from '../database/supabase';
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
  const sb = getSupabase();
  // Reject domains already registered to ANOTHER account in this service.
  const { data: existing } = await sb.from('domains')
    .select('id, api_key_id')
    .eq('name', input.name)
    .single();

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

  const { error: insertErr } = await sb.from('domains').insert({
    id, api_key_id: input.apiKeyId, name: input.name,
    dkim_private_key: privateKey, dkim_public_key: publicKey,
    spf_record: spfRecord, dkim_record_name: dkimRecordName,
    dkim_record_value: publicKey, dmarc_record: dmarcRecord,
  });
  if (insertErr) throw insertErr;

  const { data: domain } = await sb.from('domains').select('*').eq('id', id).single();
  return domain!;
}

export async function getDomainsByApiKey(apiKeyId: string): Promise<Domain[]> {
  const sb = getSupabase();
  const { data } = await sb.from('domains').select('*').eq('api_key_id', apiKeyId).order('created_at', { ascending: false });
  return (data || []) as Domain[];
}

/**
 * Strips secrets from a domain row before it is returned over the wire.
 *
 * `dkim_private_key` is a signing secret — it must NEVER leave the server.
 * Callers get the public DNS records (SPF/DKIM/DMARC) they need to configure
 * their DNS, but not the private key used to sign outgoing mail.
 */
export function sanitizeDomain(domain: Domain): Omit<Domain, 'dkim_private_key'> {
  const { dkim_private_key: _privateKey, ...safe } = domain;
  return safe;
}

/**
 * Looks up a single domain, optionally scoped to the owning API key.
 * When `apiKeyId` is provided, a domain owned by another key returns null
 * (no cross-tenant access).
 */
export async function getDomainById(id: string, apiKeyId?: string): Promise<Domain | null> {
  const sb = getSupabase();
  let query = sb.from('domains').select('*').eq('id', id);
  if (apiKeyId) query = query.eq('api_key_id', apiKeyId);
  const { data } = await query.single();
  return (data as Domain) || null;
}

/**
 * Runs real DNS verification against SPF / DKIM / DMARC records and
 * updates the stored domain status + per-record flags.
 */
export async function verifyDomainDns(id: string, apiKeyId?: string): Promise<DomainVerification | null> {
  const domain = await getDomainById(id, apiKeyId);
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

  const sb = getSupabase();
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
    domain: updated!,
    checks,
    overall,
    allVerified,
  };
}

export async function deleteDomain(id: string, apiKeyId?: string): Promise<boolean> {
  const sb = getSupabase();
  let query = sb.from('domains').delete().eq('id', id);
  if (apiKeyId) query = query.eq('api_key_id', apiKeyId);
  const { error } = await query;
  return !error;
}
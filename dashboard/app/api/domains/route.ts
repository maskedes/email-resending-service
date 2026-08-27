import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { randomUUID } from 'crypto';
import { generateKeyPairSync } from 'node:crypto';
import { promises as dns } from 'node:dns';

function generateDKIMKeys(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const base64Pub = publicKey
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '');
  return { privateKey, publicKey: `v=DKIM1; k=rsa; p=${base64Pub}` };
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();

  // Get user's API key IDs
  const { data: userKeys } = await sb
    .from('api_keys')
    .select('id')
    .eq('user_id', user.id);

  const apiKeyIds = (userKeys || []).map((k: any) => k.id);
  if (apiKeyIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const { data, error } = await sb
    .from('domains')
    .select('*')
    .in('api_key_id', apiKeyIds)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: { type: 'db_error', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const { name } = body;

  if (!name) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'Domain name is required.' } },
      { status: 400 }
    );
  }

  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  if (!domainRegex.test(name)) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'Please provide a valid domain name.' } },
      { status: 400 }
    );
  }

  const sb = createAdminClient();

  // Get user's first API key to associate the domain with
  const { data: userKeys } = await sb
    .from('api_keys')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (!userKeys || userKeys.length === 0) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'No API key available. Create an API key first.' } },
      { status: 400 }
    );
  }

  const apiKeyId = userKeys[0].id;

  // Check if domain already exists
  const { data: existing } = await sb
    .from('domains')
    .select('id, api_key_id')
    .eq('name', name)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: { type: 'conflict', message: 'This domain has already been added.' } },
      { status: 409 }
    );
  }

  // Generate DKIM keys and DNS records
  const id = randomUUID();
  const { privateKey, publicKey } = generateDKIMKeys();
  const dkimRecordName = `fm${Date.now().toString(36).slice(-6)}._domainkey`;
  const spfRecord = `v=spf1 include:spf.freemailsend.com ~all`;
  const dmarcRecord = `v=DMARC1; p=none; rua=mailto:dmarc@${name}; sp=none; adkim=r; aspf=r`;

  const { error: insertError } = await sb.from('domains').insert({
    id,
    api_key_id: apiKeyId,
    name,
    dkim_private_key: privateKey,
    dkim_public_key: publicKey,
    spf_record: spfRecord,
    dkim_record_name: dkimRecordName,
    dkim_record_value: publicKey,
    dmarc_record: dmarcRecord,
  });

  if (insertError) {
    return NextResponse.json(
      { error: { type: 'db_error', message: insertError.message } },
      { status: 500 }
    );
  }

  const { data: domain } = await sb.from('domains').select('*').eq('id', id).single();

  // Auto-run DNS verification server-side right after creation
  try {
    const spfRecords = await dns.resolveTxt(name).then(r => r.map(c => c.join(''))).catch(() => [] as string[]);
    const spfVerified = spfRecords.some((r) => r.includes(spfRecord));

    const dkimRecords = await dns.resolveTxt(`${dkimRecordName}.${name}`).then(r => r.map(c => c.join(''))).catch(() => [] as string[]);
    const dkimVerified = dkimRecords.some((r) => r.includes('v=DKIM1'));

    const dmarcRecords = await dns.resolveTxt(`_dmarc.${name}`).then(r => r.map(c => c.join(''))).catch(() => [] as string[]);
    const dmarcVerified = dmarcRecords.some((r) => r.includes('v=DMARC1'));

    const allVerified = spfVerified && dkimVerified && dmarcVerified;
    const anyVerified = spfVerified || dkimVerified || dmarcVerified;
    const overall = allVerified ? 'verified' : anyVerified ? 'partial' : 'pending';

    await sb.from('domains').update({
      spf_verified: spfVerified,
      dkim_verified: dkimVerified,
      dmarc_verified: dmarcVerified,
      status: overall,
      verified_at: overall === 'verified' ? new Date().toISOString() : undefined,
      last_checked_at: new Date().toISOString(),
    }).eq('id', id);

    const { data: updated } = await sb.from('domains').select('*').eq('id', id).single();
    return NextResponse.json({ domain: updated || domain }, { status: 201 });
  } catch {
    // DNS check failed — still return the domain, verification can be retried
    return NextResponse.json({ domain }, { status: 201 });
  }
}
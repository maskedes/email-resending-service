import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { promises as dns } from 'node:dns';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const { id } = await params;
  const sb = createAdminClient();

  // Verify ownership via user's API keys
  const { data: userKeys } = await sb
    .from('api_keys')
    .select('id')
    .eq('user_id', user.id);
  const apiKeyIds = (userKeys || []).map((k: any) => k.id);

  const { data: domain } = await sb
    .from('domains')
    .select('*')
    .eq('id', id)
    .in('api_key_id', apiKeyIds)
    .single();

  if (!domain) {
    return NextResponse.json(
      { error: { type: 'not_found', message: 'Domain not found.' } },
      { status: 404 }
    );
  }

  return NextResponse.json({ domain });
}

/** Verify DNS records for a domain */
async function resolveTxt(hostname: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(hostname);
    return records.map((chunks) => chunks.join(''));
  } catch (err: any) {
    if (err.code === 'ENODATA' || err.code === 'ENOTFOUND' || err.code === 'ENODNS') {
      return [];
    }
    throw err;
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const { id } = await params;
  const sb = createAdminClient();

  // Get user's API key IDs
  const { data: userKeys } = await sb
    .from('api_keys')
    .select('id')
    .eq('user_id', user.id);
  const apiKeyIds = (userKeys || []).map((k: any) => k.id);

  const { data: domain } = await sb
    .from('domains')
    .select('*')
    .eq('id', id)
    .in('api_key_id', apiKeyIds)
    .single();

  if (!domain) {
    return NextResponse.json(
      { error: { type: 'not_found', message: 'Domain not found.' } },
      { status: 404 }
    );
  }

  // Run DNS checks
  const spfRecords = await resolveTxt(domain.name);
  const spfVerified = spfRecords.some((r) => r.includes(domain.spf_record));

  const dkimRecords = await resolveTxt(`${domain.dkim_record_name}.${domain.name}`);
  const dkimVerified = dkimRecords.some((r) => r.includes('v=DKIM1'));

  const dmarcRecords = await resolveTxt(`_dmarc.${domain.name}`);
  const dmarcVerified = dmarcRecords.some((r) => r.includes('v=DMARC1'));

  const checks = [
    { type: 'SPF' as const, verified: spfVerified, detail: spfVerified ? 'SPF record found' : 'SPF record not found' },
    { type: 'DKIM' as const, verified: dkimVerified, detail: dkimVerified ? 'DKIM record found' : 'DKIM record not found' },
    { type: 'DMARC' as const, verified: dmarcVerified, detail: dmarcVerified ? 'DMARC record found' : 'DMARC record not found' },
  ];

  const allVerified = checks.every((c) => c.verified);
  const anyVerified = checks.some((c) => c.verified);
  const overall = allVerified ? 'verified' : anyVerified ? 'partial' : 'failed';

  await sb.from('domains').update({
    spf_verified: spfVerified,
    dkim_verified: dkimVerified,
    dmarc_verified: dmarcVerified,
    status: overall,
    verified_at: overall === 'verified' ? new Date().toISOString() : undefined,
    last_checked_at: new Date().toISOString(),
  }).eq('id', id);

  const { data: updated } = await sb.from('domains').select('*').eq('id', id).single();

  return NextResponse.json({ domain: updated, checks, overall });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const { id } = await params;
  const sb = createAdminClient();

  // Verify ownership
  const { data: userKeys } = await sb
    .from('api_keys')
    .select('id')
    .eq('user_id', user.id);
  const apiKeyIds = (userKeys || []).map((k: any) => k.id);

  const { data: domain } = await sb
    .from('domains')
    .select('id')
    .eq('id', id)
    .in('api_key_id', apiKeyIds)
    .single();

  if (!domain) {
    return NextResponse.json(
      { error: { type: 'not_found', message: 'Domain not found.' } },
      { status: 404 }
    );
  }

  const { error } = await sb.from('domains').delete().eq('id', id);
  if (error) {
    return NextResponse.json(
      { error: { type: 'db_error', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: 'Domain deleted successfully.' });
}
import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { promises as dns } from 'node:dns';

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

async function verifyOneDomain(sb: ReturnType<typeof createAdminClient>, domain: any) {
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
  }).eq('id', domain.id);

  const { data: updated } = await sb.from('domains').select('*').eq('id', domain.id).single();

  return { id: domain.id, domain: updated, checks, overall };
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();

  // Get all user's domains
  const { data: userKeys } = await sb
    .from('api_keys')
    .select('id')
    .eq('user_id', user.id);
  const apiKeyIds = (userKeys || []).map((k: any) => k.id);

  if (apiKeyIds.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const { data: domains } = await sb
    .from('domains')
    .select('*')
    .in('api_key_id', apiKeyIds);

  if (!domains || domains.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // Verify all domains in parallel (limit concurrency to 5)
  const results: Awaited<ReturnType<typeof verifyOneDomain>>[] = [];
  const chunks: any[][] = [];
  for (let i = 0; i < domains.length; i += 5) {
    chunks.push(domains.slice(i, i + 5));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.allSettled(
      chunk.map((domain) => verifyOneDomain(sb, domain))
    );
    for (const r of chunkResults) {
      if (r.status === 'fulfilled') results.push(r.value);
    }
  }

  return NextResponse.json({ results });
}

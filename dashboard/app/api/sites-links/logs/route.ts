import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOwnerApiKeyId } from '@/lib/sites';

/** GET /api/sites-links/logs — recent long→short log lines for the user's key. */
export async function GET(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();
  const keyId = await getOwnerApiKeyId(sb, user!.id);
  if (!keyId) return NextResponse.json({ data: [] });

  const { data, error } = await sb
    .from('link_logs')
    .select('*')
    .eq('api_key_id', keyId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { error: { type: 'db_error', message: error.message } },
      { status: 500 }
    );
  }
  return NextResponse.json({ data: data || [] });
}

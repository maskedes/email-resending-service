import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

// Returns the signed-in user's emails (newest first) plus their API key IDs
// (the browser uses keyIds to scope its realtime subscription).
export async function GET(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sb = createAdminClient();

    const { data: userKeys } = await sb
      .from('api_keys')
      .select('id')
      .eq('user_id', user.id);

    const keyIds = ((userKeys || []) as Array<{ id: string }>).map((k) => k.id);
    if (keyIds.length === 0) {
      return NextResponse.json({ data: [], keyIds: [] });
    }

    const { data, error } = await sb
      .from('emails')
      .select(
        'id,api_key_id,from_email,from_name,to_email,subject,status,created_at,sent_at,delivered_at,error_message'
      )
      .in('api_key_id', keyIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return NextResponse.json({ data: data || [], keyIds });
  } catch (err: any) {
    return NextResponse.json(
      { data: [], keyIds: [], error: err?.message || 'Failed to load emails.' },
      { status: 500 }
    );
  }
}

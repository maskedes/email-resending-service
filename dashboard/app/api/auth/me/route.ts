import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();
  const { data: profile } = await sb
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    },
  });
}

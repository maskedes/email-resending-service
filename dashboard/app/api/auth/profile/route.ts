import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

const NAME_MAX = 150;
const URL_MAX = 500;

/**
 * Updates the editable profile fields (display name + avatar) for the
 * authenticated user. Only the two whitelisted fields are written; everything
 * else in the profiles row is left untouched.
 */
export async function PUT(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const body = await request.json().catch(() => ({}));

  const rawName = typeof body?.full_name === 'string' ? body.full_name.trim() : '';
  const full_name = rawName.length ? rawName.slice(0, NAME_MAX) : null;

  let avatar_url: string | null = null;
  if (typeof body?.avatar_url === 'string') {
    const trimmed = body.avatar_url.trim();
    if (trimmed.length) {
      if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('data:image/')) {
        return NextResponse.json(
          { error: { type: 'invalid_field', message: 'Avatar URL must start with http(s):// or be a data:image.' } },
          { status: 400 }
        );
      }
      avatar_url = trimmed.slice(0, URL_MAX);
    }
  }

  const sb = createAdminClient();
  const { error } = await sb
    .from('profiles')
    .update({ full_name, avatar_url })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json(
      { error: { type: 'db_error', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ full_name, avatar_url });
}

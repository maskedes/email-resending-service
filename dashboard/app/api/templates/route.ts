import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cachedJson, cacheGet, cacheSet, cacheDelete } from '@/lib/cache';

// Lists the current user's saved templates. Ownership is resolved through the
// user's API keys (each template references an api_key_id that belongs to the
// user), matching the existing RLS model on the `templates` table.
export async function GET(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const cacheKey = `templates:${user.id}`;
  let data = cacheGet<any[]>(cacheKey);

  if (!data) {
    const sb = createAdminClient();
    const { data: keys } = await sb.from('api_keys').select('id').eq('user_id', user.id);
    const keyIds = (keys || []).map((k: any) => k.id);

    if (keyIds.length === 0) {
      return cachedJson({ data: [] });
    }

    const { data: fetched, error } = await sb
      .from('templates')
      .select('*')
      .in('api_key_id', keyIds)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: { type: 'db_error', message: error.message } },
        { status: 500 }
      );
    }

    data = fetched || [];
    cacheSet(cacheKey, data, 15_000);
  }

  return cachedJson({ data });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const { name, subject, html, text, apiKeyId } = body as Record<string, string>;

  if (!name || !subject) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'Name and subject are required.' } },
      { status: 400 }
    );
  }
  if (!apiKeyId) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'Please select an API key (sender) for this template.' } },
      { status: 400 }
    );
  }

  const sb = createAdminClient();

  // Verify the chosen API key belongs to the user.
  const { data: keyCheck } = await sb
    .from('api_keys')
    .select('id')
    .eq('id', apiKeyId)
    .eq('user_id', user.id)
    .single();

  if (!keyCheck) {
    return NextResponse.json(
      { error: { type: 'forbidden', message: 'That API key does not belong to you.' } },
      { status: 403 }
    );
  }

  const { data, error } = await sb
    .from('templates')
    .insert({
      api_key_id: apiKeyId,
      name,
      subject,
      html: html || null,
      text: text || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: { type: 'db_error', message: error.message } }, { status: 500 });
  }

  // Invalidate the cached list so the next read is fresh.
  cacheDelete(`templates:${user.id}`);

  return NextResponse.json({ data });
}

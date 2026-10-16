import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserApiKeyIds, validateSubdomain } from '@/lib/sites';

/** Loads a site only if it is owned (via an API key) by this user. */
async function ownedSite(
  sb: ReturnType<typeof createAdminClient>,
  id: string,
  userId: string
) {
  const { data: site } = await sb.from('sites').select('*').eq('id', id).maybeSingle();
  if (!site) return null;
  const keyIds = await getUserApiKeyIds(sb, userId);
  return keyIds.includes(site.api_key_id) ? site : null;
}

/**
 * PATCH /api/sites-links/sites/:id — update title, subdomain, HTML, published.
 * DELETE /api/sites-links/sites/:id — remove a site.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();
  const site = await ownedSite(sb, params.id, user!.id);
  if (!site) {
    return NextResponse.json(
      { error: { type: 'not_found', message: 'Site not found.' } },
      { status: 404 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if ('title' in body) patch.title = body.title ? String(body.title) : null;

  if ('html' in body) {
    if (!String(body.html ?? '').trim()) {
      return NextResponse.json(
        { error: { type: 'validation_error', message: 'Page content (HTML) is required.' } },
        { status: 400 }
      );
    }
    patch.html = String(body.html);
  }

  if ('is_published' in body) patch.is_published = Boolean(body.is_published);

  if ('subdomain' in body) {
    const sub = String(body.subdomain ?? '').trim().toLowerCase();
    const problem = validateSubdomain(sub);
    if (problem) {
      return NextResponse.json(
        { error: { type: 'validation_error', message: problem } },
        { status: 400 }
      );
    }
    patch.subdomain = sub;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'Nothing to update.' } },
      { status: 400 }
    );
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await sb
    .from('sites')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    const taken = /duplicate key|unique/i.test(error.message);
    return NextResponse.json(
      {
        error: {
          type: taken ? 'subdomain_taken' : 'db_error',
          message: taken
            ? 'That subdomain is already taken. Pick another.'
            : error.message,
        },
      },
      { status: taken ? 409 : 500 }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();
  const site = await ownedSite(sb, params.id, user!.id);
  if (!site) {
    return NextResponse.json(
      { error: { type: 'not_found', message: 'Site not found.' } },
      { status: 404 }
    );
  }

  const { error } = await sb.from('sites').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json(
      { error: { type: 'db_error', message: error.message } },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SITE_DOMAIN, getUserApiKeyIds, getOwnerApiKeyId, validateSubdomain } from '@/lib/sites';

/**
 * GET  /api/sites-links/sites  — list the signed-in user's sites
 * POST /api/sites-links/sites  — create a site at <subdomain>.<SITE_DOMAIN>
 */
export async function GET(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();
  const keyIds = await getUserApiKeyIds(sb, user!.id);
  if (keyIds.length === 0) return NextResponse.json({ data: [] });

  const { data, error } = await sb
    .from('sites')
    .select('*')
    .in('api_key_id', keyIds)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { type: 'db_error', message: error.message } },
      { status: 500 }
    );
  }
  return NextResponse.json({ data: data || [] });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const { subdomain, title, html, is_published } = body as {
    subdomain?: string;
    title?: string;
    html?: string;
    is_published?: boolean;
  };

  const sub = (subdomain || '').trim().toLowerCase();
  const problem = validateSubdomain(sub);
  if (problem) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: problem } },
      { status: 400 }
    );
  }

  if (!html || !String(html).trim()) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'Page content (HTML) is required.' } },
      { status: 400 }
    );
  }

  const sb = createAdminClient();
  const keyId = await getOwnerApiKeyId(sb, user!.id);
  if (!keyId) {
    return NextResponse.json(
      {
        error: {
          type: 'no_api_key',
          message: 'Create an API key first — sites are owned by one of your keys.',
        },
      },
      { status: 400 }
    );
  }

  const { data, error } = await sb
    .from('sites')
    .insert({
      api_key_id: keyId,
      domain: SITE_DOMAIN,
      subdomain: sub,
      title: title ? String(title) : null,
      html: String(html),
      is_published: is_published === undefined ? true : Boolean(is_published),
    })
    .select()
    .single();

  if (error) {
    const taken = /duplicate key|unique/i.test(error.message);
    return NextResponse.json(
      {
        error: {
          type: taken ? 'subdomain_taken' : 'db_error',
          message: taken
            ? `"${sub}.${SITE_DOMAIN}" is already taken. Pick another subdomain.`
            : error.message,
        },
      },
      { status: taken ? 409 : 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}

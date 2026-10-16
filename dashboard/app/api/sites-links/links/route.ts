import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOwnerApiKeyId, slugify } from '@/lib/sites';

const DEFAULT_SHORT_DOMAIN = 'en.12';

/**
 * GET  /api/sites-links/links  — list the user's short links
 * POST /api/sites-links/links  — create a short link (long URL → short)
 */
export async function GET(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();
  const keyId = await getOwnerApiKeyId(sb, user!.id);
  if (!keyId) return NextResponse.json({ data: [] });

  const { data, error } = await sb
    .from('links')
    .select('*')
    .eq('api_key_id', keyId)
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
  const { domain, slug, target_url } = body as {
    domain?: string;
    slug?: string;
    target_url?: string;
  };

  if (!target_url || !String(target_url).trim()) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'A target URL is required.' } },
      { status: 400 }
    );
  }

  let normalizedTarget = String(target_url).trim();
  if (!/^https?:\/\//i.test(normalizedTarget)) normalizedTarget = `https://${normalizedTarget}`;
  try {
    // eslint-disable-next-line no-new
    new URL(normalizedTarget);
  } catch {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'Target URL is not valid.' } },
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
          message: 'Create an API key first — links are owned by one of your keys.',
        },
      },
      { status: 400 }
    );
  }

  const linkDomain = (domain || DEFAULT_SHORT_DOMAIN).trim() || DEFAULT_SHORT_DOMAIN;
  const linkSlug = slugify(
    slug || normalizedTarget.split('/').filter(Boolean).pop() || ''
  );

  const { data, error } = await sb
    .from('links')
    .insert({
      api_key_id: keyId,
      domain: linkDomain,
      slug: linkSlug,
      target_url: normalizedTarget,
      long_url: normalizedTarget,
    })
    .select()
    .single();

  if (error) {
    const taken = /duplicate key|unique/i.test(error.message);
    return NextResponse.json(
      {
        error: {
          type: taken ? 'slug_taken' : 'db_error',
          message: taken
            ? `"${linkDomain}/${linkSlug}" is already taken. Pick another slug.`
            : error.message,
        },
      },
      { status: taken ? 409 : 500 }
    );
  }

  // Long→short log line (non-blocking).
  await sb.from('link_logs').insert({
    link_id: data.id,
    api_key_id: keyId,
    long_url: normalizedTarget,
    short_url: `https://${linkDomain}/${linkSlug}`,
  });

  return NextResponse.json(data, { status: 201 });
}

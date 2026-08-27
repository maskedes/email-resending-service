import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cachedJson, cacheGet, cacheSet, cacheDelete } from '@/lib/cache';
import { randomBytes } from 'crypto';

/** Generates a new webhook signing secret (prefixed for easy identification). */
function generateWebhookSecret(): string {
  return 'whsec_' + randomBytes(24).toString('hex');
}

function normalizeWebhook(row: any) {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    events: (row.events || '')
      .split(',')
      .map((e: string) => e.trim())
      .filter(Boolean),
    is_active: row.is_active,
    created_at: row.created_at,
    last_triggered_at: row.last_triggered_at || null,
  };
}

/** Resolves the current user's API key IDs (webhooks are scoped to a key). */
async function getUserApiKeyIds(sb: any, userId: string): Promise<string[]> {
  const { data: keys } = await sb.from('api_keys').select('id').eq('user_id', userId);
  return (keys || []).map((k: any) => k.id);
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const cacheKey = `webhooks:${user.id}`;
  let data = cacheGet<any[]>(cacheKey);

  if (!data) {
    const sb = createAdminClient();
    const keyIds = await getUserApiKeyIds(sb, user.id);

    if (keyIds.length === 0) {
      return cachedJson({ data: [] });
    }

    const { data: fetched, error } = await sb
      .from('webhooks')
      .select('id, name, url, events, is_active, created_at, last_triggered_at')
      .in('api_key_id', keyIds)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: { type: 'db_error', message: error.message } },
        { status: 500 }
      );
    }

    data = (fetched || []).map(normalizeWebhook);
    cacheSet(cacheKey, data, 15_000);
  }

  return cachedJson({ data });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const { name, url, events, apiKeyId } = body as Record<string, any>;

  if (!name || !url) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'Both "name" and "url" are required.' } },
      { status: 400 }
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!/^https?:$/.test(parsedUrl.protocol)) throw new Error('invalid protocol');
  } catch {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'Please provide a valid http(s) URL.' } },
      { status: 400 }
    );
  }

  const sb = createAdminClient();
  const keyIds = await getUserApiKeyIds(sb, user.id);
  if (keyIds.length === 0) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'Create an API key before adding webhooks.' } },
      { status: 400 }
    );
  }

  // Use the explicitly chosen key if it belongs to the user, otherwise the
  // user's first key (so test emails sent with the default key will fire it).
  const targetKey = apiKeyId && keyIds.includes(apiKeyId) ? apiKeyId : keyIds[0];

  const secret = generateWebhookSecret();
  const eventsStr =
    Array.isArray(events) && events.length > 0 ? events.join(',') : 'sent,delivered,bounced';

  const { data, error } = await sb
    .from('webhooks')
    .insert({
      api_key_id: targetKey,
      name: name.trim(),
      url: parsedUrl.toString(),
      events: eventsStr,
      is_active: true,
      secret,
    })
    .select('id, name, url, events, is_active, created_at, last_triggered_at')
    .single();

  if (error) {
    return NextResponse.json(
      { error: { type: 'db_error', message: error.message } },
      { status: 500 }
    );
  }

  cacheDelete(`webhooks:${user.id}`);

  const webhook = normalizeWebhook(data);
  // The signing secret is returned exactly once — display it to the user now.
  (webhook as any).secret = secret;

  return NextResponse.json({ webhook }, { status: 201 });
}

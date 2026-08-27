import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cacheDelete } from '@/lib/cache';

/** Resolves the current user's API key IDs (webhooks are scoped to a key). */
async function getUserApiKeyIds(sb: any, userId: string): Promise<string[]> {
  const { data: keys } = await sb.from('api_keys').select('id').eq('user_id', userId);
  return (keys || []).map((k: any) => k.id);
}

/** Verifies the webhook belongs to one of the user's API keys. */
async function verifyOwnership(sb: any, userId: string, webhookId: string) {
  const keyIds = await getUserApiKeyIds(sb, userId);
  const { data } = await sb
    .from('webhooks')
    .select('id, api_key_id')
    .eq('id', webhookId)
    .in('api_key_id', keyIds)
    .single();
  return !!data;
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const isActive = (body as any).is_active;

  if (typeof isActive !== 'boolean') {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'is_active must be a boolean.' } },
      { status: 400 }
    );
  }

  const sb = createAdminClient();

  if (!(await verifyOwnership(sb, user.id, params.id))) {
    return NextResponse.json(
      { error: { type: 'not_found', message: 'Webhook not found.' } },
      { status: 404 }
    );
  }

  const { data, error } = await sb
    .from('webhooks')
    .update({ is_active: isActive })
    .eq('id', params.id)
    .select('id, name, url, events, is_active, created_at, last_triggered_at')
    .single();

  if (error) {
    return NextResponse.json(
      { error: { type: 'db_error', message: error.message } },
      { status: 500 }
    );
  }

  cacheDelete(`webhooks:${user.id}`);

  return NextResponse.json({ webhook: normalizeWebhook(data) });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();

  if (!(await verifyOwnership(sb, user.id, params.id))) {
    return NextResponse.json(
      { error: { type: 'not_found', message: 'Webhook not found.' } },
      { status: 404 }
    );
  }

  const { error } = await sb.from('webhooks').delete().eq('id', params.id);

  if (error) {
    return NextResponse.json(
      { error: { type: 'db_error', message: error.message } },
      { status: 500 }
    );
  }

  cacheDelete(`webhooks:${user.id}`);

  return NextResponse.json({ message: 'Webhook deleted successfully.' });
}

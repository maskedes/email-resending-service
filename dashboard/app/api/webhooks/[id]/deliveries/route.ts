import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

/** Resolves the current user's API key IDs (webhooks are scoped to a key). */
async function getUserApiKeyIds(sb: any, userId: string): Promise<string[]> {
  const { data: keys } = await sb.from('api_keys').select('id').eq('user_id', userId);
  return (keys || []).map((k: any) => k.id);
}

/**
 * GET /api/webhooks/[id]/deliveries — the last 50 attempts for one of the
 * user's webhooks, plus a summary (delivered / failed / pending counts,
 * success rate). Service-role access to webhook_deliveries; ownership is
 * verified against the caller's api_keys.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();
  const keyIds = await getUserApiKeyIds(sb, user.id);

  // Ownership: webhook must belong to one of the caller's keys.
  const { data: hook } = await sb
    .from('webhooks')
    .select('id, api_key_id')
    .eq('id', id)
    .in('api_key_id', keyIds)
    .maybeSingle();

  if (!hook) {
    return NextResponse.json(
      { error: { type: 'not_found', message: 'Webhook not found.' } },
      { status: 404 }
    );
  }

  const { data: rows, error } = await sb
    .from('webhook_deliveries')
    .select('id, event, attempt, outcome, http_status, error, delivered_at, created_at')
    .eq('webhook_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { error: { type: 'db_error', message: error.message } },
      { status: 500 }
    );
  }

  const data = (rows || []) as Array<Record<string, any>>;
  const delivered = data.filter((r) => r.outcome === 'delivered').length;
  const failed = data.filter((r) => r.outcome === 'dead').length;
  const pending = data.filter((r) => r.outcome === 'pending_retry').length;
  const total = delivered + failed + pending;

  const summary = {
    attempts: total,
    delivered,
    failed,
    pending_retry: pending,
    success_rate: total > 0 ? Math.round((delivered / total) * 100) : 0,
    last: data[0] ?? null,
  };

  return NextResponse.json({ data, summary });
}

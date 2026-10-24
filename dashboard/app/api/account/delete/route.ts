import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/account/delete
 *
 * Permanently deletes the signed-in user's account and every artifact they
 * own: API keys (with their emails, email events, webhooks, domains,
 * templates, sites, links, link logs/triggers and SMS records) plus the
 * Supabase auth user itself. No API key auth — dashboard session only.
 */
export async function POST(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();

  const { data: keys, error: keysErr } = await sb
    .from('api_keys')
    .select('id')
    .eq('user_id', user.id);
  if (keysErr) {
    return NextResponse.json(
      { error: { type: 'server_error', message: 'Could not look up your API keys.' } },
      { status: 500 },
    );
  }
  const keyIds = (keys || []).map((k: { id: string }) => k.id);

  if (keyIds.length > 0) {
    // Emails + their events
    const { data: emails } = await sb.from('emails').select('id').in('api_key_id', keyIds);
    const emailIds = (emails || []).map((e: { id: string }) => e.id);
    if (emailIds.length > 0) {
      await sb.from('email_events').delete().in('email_id', emailIds);
    }
    await sb.from('emails').delete().in('api_key_id', keyIds);

    // Per-key artifacts
    await sb.from('webhooks').delete().in('api_key_id', keyIds);
    await sb.from('domains').delete().in('api_key_id', keyIds);
    await sb.from('templates').delete().in('api_key_id', keyIds);

    // Sites + links (with their logs/triggers)
    const { data: links } = await sb.from('links').select('id').in('api_key_id', keyIds);
    if (links && links.length > 0) {
      const linkIds = links.map((l: { id: string }) => l.id);
      await sb.from('link_logs').delete().in('link_id', linkIds);
      await sb.from('link_triggers').delete().in('api_key_id', keyIds);
      await sb.from('links').delete().in('id', linkIds);
    } else {
      await sb.from('link_logs').delete().in('api_key_id', keyIds);
      await sb.from('link_triggers').delete().in('api_key_id', keyIds);
    }
    await sb.from('sites').delete().in('api_key_id', keyIds);

    // SMS records (best effort — table set depends on migration state)
    for (const table of ['sms_events', 'sms_messages', 'sms_gateways']) {
      await sb.from(table).delete().in('api_key_id', keyIds).then(
        () => {},
        () => {},
      );
    }

    // The keys themselves last
    await sb.from('api_keys').delete().in('id', keyIds);
  }

  // Finally remove the auth user (also invalidates their session server-side)
  const { error: deleteErr } = await sb.auth.admin.deleteUser(user.id);
  if (deleteErr) {
    return NextResponse.json(
      { error: { type: 'server_error', message: 'Failed to delete your account. Please contact support.' } },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cacheDelete } from '@/lib/cache';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * PATCH /api/apikeys/:id
 * Updates the per-key general settings. Only the fields present in the body
 * are changed: allow_sms, allow_incoming_email, forward_to.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();

  // Verify the key belongs to this user
  const { data: key } = await sb
    .from('api_keys')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!key) {
    return NextResponse.json(
      { error: { type: 'not_found', message: 'API key not found.' } },
      { status: 404 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (typeof body?.allow_sms === 'boolean') update.allow_sms = body.allow_sms;
  if (typeof body?.allow_incoming_email === 'boolean') {
    update.allow_incoming_email = body.allow_incoming_email;
  }
  if (body?.forward_to !== undefined) {
    const forward = String(body.forward_to ?? '').trim();
    if (forward && !EMAIL_RE.test(forward)) {
      return NextResponse.json(
        {
          error: {
            type: 'validation_error',
            message: 'Please provide a valid forwarding email address.',
          },
        },
        { status: 400 }
      );
    }
    update.forward_to = forward || null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'No settings provided.' } },
      { status: 400 }
    );
  }

  const { data, error } = await sb
    .from('api_keys')
    .update(update)
    .eq('id', params.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json(
      { error: { type: 'db_error', message: error.message } },
      { status: 500 }
    );
  }

  // Drop the cached list so the next read reflects the new settings.
  cacheDelete(`apikeys:${user.id}`);

  return NextResponse.json({ data });
}

/**
 * DELETE /api/apikeys/:id
 * ?permanent=true  → permanently removes key + all child rows
 * otherwise         → soft-revoke (sets is_active = false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();
  const permanent = request.nextUrl.searchParams.get('permanent') === 'true';

  // Verify the key belongs to this user
  const { data: key } = await sb
    .from('api_keys')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!key) {
    return NextResponse.json(
      { error: { type: 'not_found', message: 'API key not found.' } },
      { status: 404 }
    );
  }

  if (permanent) {
    // Delete child rows first
    const { data: emails } = await sb
      .from('emails')
      .select('id')
      .eq('api_key_id', params.id);

    if (emails && emails.length > 0) {
      const emailIds = emails.map((e: any) => e.id);
      await sb.from('email_events').delete().in('email_id', emailIds);
      await sb.from('emails').delete().eq('api_key_id', params.id);
    }

    await sb.from('webhooks').delete().eq('api_key_id', params.id);
    await sb.from('domains').delete().eq('api_key_id', params.id);
    await sb.from('templates').delete().eq('api_key_id', params.id);

    const { error } = await sb.from('api_keys').delete().eq('id', params.id);
    if (error) {
      return NextResponse.json(
        { error: { type: 'db_error', message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'API key deleted successfully.' });
  }

  // Soft-revoke
  const { error } = await sb
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', params.id);

  if (error) {
    return NextResponse.json(
      { error: { type: 'db_error', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: 'API key revoked successfully.' });
}

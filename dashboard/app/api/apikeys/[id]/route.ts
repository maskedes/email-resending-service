import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

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

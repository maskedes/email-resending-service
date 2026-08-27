import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sb = createAdminClient();

    // Get user's API key IDs
    const { data: userKeys } = await sb
      .from('api_keys')
      .select('id')
      .eq('user_id', user.id);

    const apiKeyIds = (userKeys || []).map((k: any) => k.id);
    if (apiKeyIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get emails for these keys
    const { data: emails } = await sb
      .from('emails')
      .select('id')
      .in('api_key_id', apiKeyIds);

    const emailIds = (emails || []).map((e: any) => e.id);
    if (emailIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get events for these emails
    const { data } = await sb
      .from('email_events')
      .select('*, emails!inner(subject, to_email, status)')
      .in('email_id', emailIds)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    const logs = (data || []).map((ee: any) => ({
      id: ee.id,
      level: ee.event,
      message: ee.details || ee.event,
      created_at: ee.timestamp,
      email_id: ee.email_id,
      subject: ee.emails?.subject,
      to_email: ee.emails?.to_email,
      email_status: ee.emails?.status,
    }));

    return NextResponse.json({ data: logs });
  } catch (err) {
    console.error('Logs error:', err);
    return NextResponse.json({ data: [] });
  }
}

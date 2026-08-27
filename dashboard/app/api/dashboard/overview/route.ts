import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  try {
    const sb = createAdminClient();

    // Get API keys for this user
    const { data: apiKeys } = await sb
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const keys = apiKeys || [];
    const apiKeyIds = keys.map((k: any) => k.id);

    let emails: any[] = [];
    let stats = { total: 0, sent: 0, failed: 0, queued: 0 };

    if (apiKeyIds.length > 0) {
      // Get recent emails
      const { data: emailRows } = await sb
        .from('emails')
        .select('*')
        .in('api_key_id', apiKeyIds)
        .order('created_at', { ascending: false })
        .limit(100);
      emails = emailRows || [];

      // Get stats
      const { data: allEmails } = await sb
        .from('emails')
        .select('status')
        .in('api_key_id', apiKeyIds);

      if (allEmails) {
        stats = {
          total: allEmails.length,
          sent: allEmails.filter((e: any) => e.status === 'sent').length,
          failed: allEmails.filter((e: any) => e.status === 'failed').length,
          queued: allEmails.filter((e: any) => e.status === 'queued').length,
        };
      }
    }

    return NextResponse.json({
      stats,
      apiKeys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        email: k.email,
        is_active: k.is_active,
        total_emails_sent: k.total_emails_sent,
        created_at: k.created_at,
        last_used_at: k.last_used_at,
      })),
      emails: emails.map((e) => ({
        id: e.id,
        from_email: e.from_email,
        to_email: e.to_email,
        subject: e.subject,
        status: e.status,
        created_at: e.created_at,
      })),
    });
  } catch (err) {
    console.error('Overview error:', err);
    return NextResponse.json(
      { error: { type: 'error', message: 'Failed to load overview.' } },
      { status: 500 }
    );
  }
}

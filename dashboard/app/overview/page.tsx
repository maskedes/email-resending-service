import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import StatsCards from './StatsCards';
import EmailTable from './EmailTable';
import LogoutButton from './LogoutButton';
import SmsSender from './SmsSender';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Read directly from Supabase instead of proxying to Express
  const sb = createAdminClient();

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
    const { data: emailRows } = await sb
      .from('emails')
      .select('*')
      .in('api_key_id', apiKeyIds)
      .order('created_at', { ascending: false })
      .limit(100);
    emails = emailRows || [];

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

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Overview</h1>
          <p className="mt-1 text-slate-400">Your email sending dashboard at a glance.</p>
        </div>
        <LogoutButton />
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* SMS — Twilio-like, realtime via same Android gateway API */}
      <SmsSender keyName={keys[0]?.name} />

      {/* Recent Emails */}
      <EmailTable emails={emails} />
    </div>
  );
}

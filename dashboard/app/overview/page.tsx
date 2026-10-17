import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDashboardOverview } from '@/lib/dashboard-overview';
import StatsCards from './StatsCards';
import EmailTable from './EmailTable';
import LogoutButton from './LogoutButton';
import SmsSender from './SmsSender';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const overview = await getDashboardOverview(createAdminClient(), user.id);

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
      <StatsCards stats={overview.stats} />

      {/* SMS — Twilio-like, realtime via same Android gateway API */}
      <SmsSender keyName={overview.apiKeys[0]?.name} />

      {/* Recent Emails */}
      <EmailTable emails={overview.emails} />
    </div>
  );
}

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { expressFetch } from '@/lib/api';
import StatsCards from './StatsCards';
import EmailTable from './EmailTable';
import LogoutButton from './LogoutButton';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('fms_dashboard')?.value;

  const { status, data } = await expressFetch('/api/dashboard/overview', {
    sessionToken,
  });

  if (status === 401) {
    redirect('/login');
  }

  const stats = data?.stats || { total: 0, sent: 0, failed: 0, queued: 0 };
  const emails = data?.emails || [];

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

      {/* Recent Emails */}
      <EmailTable emails={emails} />
    </div>
  );
}

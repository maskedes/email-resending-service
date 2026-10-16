import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDashboardOverview } from '@/lib/dashboard-overview';

export async function GET(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  try {
    const overview = await getDashboardOverview(createAdminClient(), user.id);
    return NextResponse.json(overview);
  } catch (err) {
    console.error('Overview error:', err);
    return NextResponse.json(
      { error: { type: 'error', message: 'Failed to load overview.' } },
      { status: 500 }
    );
  }
}

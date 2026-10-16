import type { SupabaseClient } from '@supabase/supabase-js';

export interface DashboardEmail {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  status: string;
  created_at: string;
}

export interface DashboardApiKey {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  total_emails_sent: number;
  created_at: string;
  last_used_at: string | null;
}

export interface DashboardStats {
  total: number;
  sent: number;
  failed: number;
  queued: number;
  successRate: number;
}

export interface DashboardOverview {
  stats: DashboardStats;
  apiKeys: DashboardApiKey[];
  emails: DashboardEmail[];
}

const emptyStats: DashboardStats = {
  total: 0,
  sent: 0,
  failed: 0,
  queued: 0,
  successRate: 0,
};

export async function getDashboardOverview(
  supabase: SupabaseClient,
  userId: string
): Promise<DashboardOverview> {
  const { data: apiKeys, error: apiKeysError } = await supabase
    .from('api_keys')
    .select('id, name, email, is_active, total_emails_sent, created_at, last_used_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (apiKeysError) throw apiKeysError;

  const keys = apiKeys ?? [];
  const apiKeyIds = keys.map((key) => key.id);

  if (apiKeyIds.length === 0) {
    return { stats: emptyStats, apiKeys: keys, emails: [] };
  }

  const countEmails = (status?: string) => {
    const query = supabase
      .from('emails')
      .select('id', { count: 'exact', head: true })
      .in('api_key_id', apiKeyIds);
    return status ? query.eq('status', status) : query;
  };
  const [recentResult, totalResult, sentResult, failedResult, queuedResult] = await Promise.all([
    supabase
      .from('emails')
      .select('id, from_email, to_email, subject, status, created_at')
      .in('api_key_id', apiKeyIds)
      .order('created_at', { ascending: false })
      .limit(100),
    countEmails(),
    countEmails('sent'),
    countEmails('failed'),
    countEmails('queued'),
  ]);

  const queryError = [recentResult, totalResult, sentResult, failedResult, queuedResult]
    .find((result) => result.error)?.error;
  if (queryError) throw queryError;

  const sent = sentResult.count ?? 0;
  const failed = failedResult.count ?? 0;
  const completed = sent + failed;

  return {
    stats: {
      total: totalResult.count ?? 0,
      sent,
      failed,
      queued: queuedResult.count ?? 0,
      successRate: completed === 0 ? 0 : Math.round((sent / completed) * 100),
    },
    apiKeys: keys,
    emails: recentResult.data ?? [],
  };
}
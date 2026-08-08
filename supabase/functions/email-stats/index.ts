// E-NVOY email-stats edge function
//
// GET /functions/v1/email-stats
// Returns aggregate counts (total/delivered/failed/queued/sent) for the dashboard
// overview by calling the public.list_email_stats() Postgres function.

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,OPTIONS',
  'access-control-allow-headers': 'authorization, apikey, x-client-info, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'GET') {
    return json({ error: { type: 'method_not_allowed', message: 'Only GET is allowed.' } }, 405);
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.rpc('list_email_stats');

    if (error) {
      return json({ error: { type: 'database_error', message: error.message } }, 500);
    }

    return json({ data });
  } catch (err) {
    return json({ error: { type: 'internal_error', message: (err as Error).message } }, 500);
  }
});

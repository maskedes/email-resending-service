// E-NVOY create-api-key edge function
//
// POST /functions/v1/create-api-key
// Body (JSON): { "name": "...", "email": "..." }
// Returns the raw API key (shown to the caller exactly once) by calling the
// public.create_api_key() Postgres function.

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST,OPTIONS',
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
  if (req.method !== 'POST') {
    return json({ error: { type: 'method_not_allowed', message: 'Only POST is allowed.' } }, 405);
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let body: { name?: string; email?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: { type: 'validation_error', message: 'Invalid JSON body.' } }, 400);
    }

    if (!body.name || !body.email) {
      return json(
        { error: { type: 'validation_error', message: 'Both "name" and "email" are required.' } },
        400
      );
    }

    const { data, error } = await supabase.rpc('create_api_key', {
      p_name: body.name,
      p_email: body.email,
    });

    if (error) {
      return json({ error: { type: 'database_error', message: error.message } }, 500);
    }

    return json({ api_key: data });
  } catch (err) {
    return json({ error: { type: 'internal_error', message: (err as Error).message } }, 500);
  }
});

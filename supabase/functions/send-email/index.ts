// E-NVOY send-email edge function
//
// POST /functions/v1/send-email
// Headers:
//   Authorization: Bearer <anon or service key>
//   x-api-key: <the sender's raw API key>
// Body (JSON):
//   { "from": "Name <addr@example.com>"?, "to": "...", "subject": "...",
//     "html"?: "...", "text"?: "...", "reply_to"?: "...",
//     "tags"?: { ... }, "schedule_in_ms"?: number }
//
// It validates the API key against public.api_keys, inserts the email into
// public.emails (the increment_email_count trigger bumps the counter), and
// returns the created email record.

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'authorization, x-api-key, apikey, x-client-info, content-type',
};

interface EmailInput {
  from?: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  tags?: Record<string, string>;
  schedule_in_ms?: number;
}

interface ApiKeyRow {
  id: string;
  key: string;
  is_active: boolean;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8' },
  });
}

function extractApiKey(req: Request): string | null {
  return req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null;
}

async function validateApiKey(supabase: SupabaseClient, rawKey: string): Promise<ApiKeyRow | null> {
  // Fetch active keys and compare. Keys are stored bcrypt-hashed, so we compare
  // against the same hashing the Node app uses. To keep it dependency-light at
  // the edge, we compare the raw key to the stored hash via a DB function.
  const { data, error } = await supabase
    .rpc('validate_api_key', { p_raw_key: rawKey });
  if (error || !data) return null;
  return data as ApiKeyRow;
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

    const rawKey = extractApiKey(req);
    if (!rawKey) {
      return json({ error: { type: 'authentication_error', message: 'Missing API key.' } }, 401);
    }

    const { data: rpcData, error: rpcError } = await supabase
      .rpc('validate_api_key', { p_raw_key: rawKey });

    if (rpcError) {
      return json({ error: { type: 'database_error', message: `validate_api_key RPC failed: ${rpcError.message}` } }, 500);
    }

    const apiKey = rpcData as unknown as ApiKeyRow;
    if (!apiKey || !apiKey.is_active) {
      return json({ error: { type: 'authentication_error', message: 'Invalid or inactive API key.' } }, 401);
    }

    let body: EmailInput;
    try {
      body = await req.json();
    } catch {
      return json({ error: { type: 'validation_error', message: 'Invalid JSON body.' } }, 400);
    }

    if (!body.to || !body.subject) {
      return json(
        { error: { type: 'validation_error', message: 'The "to" and "subject" fields are required.' } },
        400
      );
    }
    if (!body.html && !body.text) {
      return json(
        { error: { type: 'validation_error', message: 'Either "html" or "text" content is required.' } },
        400
      );
    }

    const { data, error } = await supabase
      .from('emails')
      .insert({
        api_key_id: apiKey.id,
        from_email: body.from ?? 'default@en-voy.dev',
        to_email: body.to,
        subject: body.subject,
        html: body.html ?? null,
        text: body.text ?? null,
        status: body.schedule_in_ms ? 'scheduled' : 'queued',
        metadata: body.tags ?? null,
        scheduled_at: body.schedule_in_ms
          ? new Date(Date.now() + body.schedule_in_ms).toISOString()
          : null,
      })
      .select('*')
      .single();

    if (error) {
      return json({ error: { type: 'database_error', message: error.message } }, 500);
    }

    return json({ id: data.id, from: data.from_email, to: data.to_email, subject: data.subject, status: data.status });
  } catch (err) {
    return json({ error: { type: 'internal_error', message: (err as Error).message } }, 500);
  }
});

import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cachedJson, cacheGet, cacheSet, cacheDelete } from '@/lib/cache';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'fms_';
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const cacheKey = `apikeys:${user.id}`;
  let data = cacheGet<any[]>(cacheKey);

  if (!data) {
    const sb = createAdminClient();
    const { data: fetched, error } = await sb
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: { type: 'db_error', message: error.message } },
        { status: 500 }
      );
    }

    data = fetched || [];
    cacheSet(cacheKey, data, 15_000);
  }

  return cachedJson({ data });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const { name, email } = body;

  if (!name || !email) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'Both "name" and "email" are required.' } },
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'Please provide a valid email address.' } },
      { status: 400 }
    );
  }

  const sb = createAdminClient();
  const id = randomUUID();
  const rawKey = generateApiKey();
  const hashedKey = await bcrypt.hash(rawKey, 10);

  const { error: insertError } = await sb.from('api_keys').insert({
    id,
    key: hashedKey,
    name,
    email,
    user_id: user.id,
  });

  if (insertError) {
    return NextResponse.json(
      { error: { type: 'db_error', message: insertError.message } },
      { status: 500 }
    );
  }

  // Invalidate the cached list so the next read shows the new key.
  cacheDelete(`apikeys:${user.id}`);

  const { data: apiKey } = await sb
    .from('api_keys')
    .select('*')
    .eq('id', id)
    .single();

  return NextResponse.json(
    {
      id: apiKey.id,
      key: rawKey,
      name: apiKey.name,
      email: apiKey.email,
      created_at: apiKey.created_at,
      message: 'API key created successfully. Save this key securely - it will not be shown again.',
    },
    { status: 201 }
  );
}

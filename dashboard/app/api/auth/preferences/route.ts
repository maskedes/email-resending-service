import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

export type UserPreferences = {
  emailNotifications: boolean;
  dnsAutoCheck: boolean;
  darkMode: boolean;
};

const DEFAULTS: UserPreferences = {
  emailNotifications: true,
  dnsAutoCheck: true,
  darkMode: true,
};

const KEYS = Object.keys(DEFAULTS) as (keyof UserPreferences)[];

/**
 * Coerces arbitrary input into a valid UserPreferences object, falling back to
 * defaults for any missing / non-boolean keys. Keeps the stored payload clean.
 */
function sanitize(input: unknown): UserPreferences {
  const out: UserPreferences = { ...DEFAULTS };
  if (input && typeof input === 'object') {
    const record = input as Record<string, unknown>;
    for (const key of KEYS) {
      const value = record[key];
      if (typeof value === 'boolean') out[key] = value;
    }
  }
  return out;
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();
  const { data, error } = await sb
    .from('profiles')
    .select('preferences')
    .eq('id', user.id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: { type: 'db_error', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ preferences: sanitize(data?.preferences) });
}

export async function PUT(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const preferences = sanitize(body?.preferences);

  const sb = createAdminClient();
  const { error } = await sb
    .from('profiles')
    .update({ preferences })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json(
      { error: { type: 'db_error', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ preferences });
}

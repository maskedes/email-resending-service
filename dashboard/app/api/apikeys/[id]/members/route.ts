import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['admin', 'member'] as const;

function notFound() {
  return NextResponse.json(
    { error: { type: 'not_found', message: 'API key not found.' } },
    { status: 404 }
  );
}

function validation(message: string) {
  return NextResponse.json(
    { error: { type: 'validation_error', message } },
    { status: 400 }
  );
}

function dbError(message: string) {
  return NextResponse.json(
    { error: { type: 'db_error', message } },
    { status: 500 }
  );
}

/** Confirms the key exists and belongs to the signed-in user. */
async function ownsKey(sb: SupabaseClient, keyId: string, userId: string): Promise<boolean> {
  const { data } = await sb
    .from('api_keys')
    .select('id')
    .eq('id', keyId)
    .eq('user_id', userId)
    .single();
  return !!data;
}

/**
 * GET /api/apikeys/:id/members
 * Lists the users granted access to this API key.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();
  if (!(await ownsKey(sb, id, user.id))) return notFound();

  const { data, error } = await sb
    .from('api_key_members')
    .select('*')
    .eq('api_key_id', id)
    .order('created_at', { ascending: true });

  if (error) return dbError(error.message);
  return NextResponse.json({ data: data || [] });
}

/**
 * POST /api/apikeys/:id/members
 * Adds a user to the key. `role` is "member" (default) or "admin".
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();
  if (!(await ownsKey(sb, id, user.id))) return notFound();

  const body = await request.json().catch(() => ({}));
  const email = String(body?.email ?? '').trim().toLowerCase();
  const role = ROLES.includes(body?.role) ? (body.role as (typeof ROLES)[number]) : 'member';

  if (!EMAIL_RE.test(email)) return validation('Please provide a valid email address.');

  const { data, error } = await sb
    .from('api_key_members')
    .insert({ api_key_id: id, email, role })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: { type: 'conflict', message: 'That user is already on this API key.' } },
        { status: 409 }
      );
    }
    return dbError(error.message);
  }

  return NextResponse.json({ data }, { status: 201 });
}

/**
 * PATCH /api/apikeys/:id/members
 * Promotes / demotes a user. Body: { memberId, role: "admin" | "member" }.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();
  if (!(await ownsKey(sb, id, user.id))) return notFound();

  const body = await request.json().catch(() => ({}));
  const memberId = String(body?.memberId ?? '');
  const role = body?.role;

  if (!memberId || !ROLES.includes(role)) {
    return validation('A memberId and a valid role (admin or member) are required.');
  }

  const { data, error } = await sb
    .from('api_key_members')
    .update({ role })
    .eq('id', memberId)
    .eq('api_key_id', id)
    .select('*')
    .single();

  if (error) return dbError(error.message);
  return NextResponse.json({ data });
}

/**
 * DELETE /api/apikeys/:id/members?memberId=...
 * Revokes a user's access to this API key.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();
  if (!(await ownsKey(sb, id, user.id))) return notFound();

  const memberId = request.nextUrl.searchParams.get('memberId');
  if (!memberId) return validation('A memberId query parameter is required.');

  const { error } = await sb
    .from('api_key_members')
    .delete()
    .eq('id', memberId)
    .eq('api_key_id', id);

  if (error) return dbError(error.message);
  return NextResponse.json({ message: 'User removed from this API key.' });
}

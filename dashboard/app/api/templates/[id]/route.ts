import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cacheDelete } from '@/lib/cache';

async function ownsTemplate(sb: any, userId: string, templateId: string): Promise<boolean> {
  const { data: keys } = await sb.from('api_keys').select('id').eq('user_id', userId);
  const keyIds = (keys || []).map((k: any) => k.id);
  if (keyIds.length === 0) return false;

  const { data } = await sb
    .from('templates')
    .select('api_key_id')
    .eq('id', templateId)
    .single();

  return !!data && keyIds.includes(data.api_key_id);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();
  if (!(await ownsTemplate(sb, user.id, id))) {
    return NextResponse.json({ error: { type: 'not_found', message: 'Template not found.' } }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, subject, html, text } = body as Record<string, string>;

  if (!name || !subject) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'Name and subject are required.' } },
      { status: 400 }
    );
  }

  const { data, error } = await sb
    .from('templates')
    .update({
      name,
      subject,
      html: html ?? null,
      text: text ?? null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: { type: 'db_error', message: error.message } }, { status: 500 });
  }

  cacheDelete(`templates:${user.id}`);
  return NextResponse.json({ data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;

  const sb = createAdminClient();
  if (!(await ownsTemplate(sb, user.id, id))) {
    return NextResponse.json({ error: { type: 'not_found', message: 'Template not found.' } }, { status: 404 });
  }

  const { error } = await sb.from('templates').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: { type: 'db_error', message: error.message } }, { status: 500 });
  }

  cacheDelete(`templates:${user.id}`);
  return NextResponse.json({ ok: true });
}

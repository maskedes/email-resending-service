'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Phone + segmentation rules mirror the backend (src/services/smsService.ts) so
// the dashboard and API agree on validation and part counting.
const E164_RE = /^\+?[1-9]\d{6,14}$/;

function isValidPhone(phone: string): boolean {
  return E164_RE.test(phone.replace(/[\s()-]/g, ''));
}

function normalizePhone(phone: string): string {
  const n = phone.replace(/[\s()-]/g, '');
  return n.startsWith('+') ? n : `+${n}`;
}

/** Rough SMS segmentation: GSM 7-bit 160 chars vs UCS-2 70 chars. */
function smsParts(body: string): number {
  const isGsm = /^[\x00-\x7F]*$/.test(body);
  if (isGsm) return body.length <= 160 ? 1 : Math.ceil(body.length / 153);
  return body.length <= 70 ? 1 : Math.ceil(body.length / 67);
}

/**
 * Queues a test SMS. Runs entirely on the server — the browser never calls the
 * SMS API directly. Authentication comes from the Supabase session cookie and
 * the message is scoped to the signed-in user's own API key.
 *
 * Note: this is a Server Function, so the file MUST carry the `use server`
 * directive. Without it the function is not registered and the form action
 * silently does nothing.
 */
export async function sendSmsAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in to send SMS.');
  }

  const to = String(formData.get('to') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();

  if (!to || !body) {
    throw new Error('Phone number and message are both required.');
  }
  if (!isValidPhone(to)) {
    throw new Error('Enter a valid phone number in international format, e.g. +2567XXXXXXXX.');
  }
  if (body.length > 1600) {
    throw new Error('Message is too long (maximum 1600 characters).');
  }

  const admin = createAdminClient();

  // Pick the user's first SMS-enabled active key (fall back to their first key
  // so we can report a precise "enable SMS" error).
  const { data: keys, error: keyError } = await admin
    .from('api_keys')
    .select('id, allow_sms')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (keyError) {
    throw new Error('Could not load your API keys. Please try again.');
  }

  const keyList = keys || [];
  const enabled = keyList.find((k) => k.allow_sms === true);
  if (!enabled) {
    throw new Error(
      keyList.length === 0
        ? 'Create an API key before sending SMS.'
        : 'SMS is disabled for your API key. Enable "Allow SMS" on the API keys page.'
    );
  }

  const id = randomUUID();
  const { error } = await admin.from('sms_messages').insert({
    id,
    api_key_id: enabled.id,
    to_phone: normalizePhone(to),
    body,
    parts: smsParts(body),
    status: 'queued',
  });

  if (error) {
    throw new Error(error.message || 'Failed to queue the SMS. Please try again.');
  }

  await admin
    .from('sms_events')
    .insert({ sms_id: id, event: 'queued', details: 'SMS queued for gateway dispatch' });

  revalidatePath('/sms');
}

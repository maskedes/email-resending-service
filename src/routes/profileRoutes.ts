import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import { getSupabase } from '../database/supabase';

const router = Router();

const URL_MAX = 300_000; // allows inline data:image payloads (~256px JPEG)

/**
 * Resolve the Supabase profile row that owns the authenticated API key.
 *
 * Preference order:
 *  1. `profiles.id` matching the key's `user_id` (dashboard-minted keys).
 *  2. `profiles.email` matching the key's email (CLI/self-serve keys).
 * Returns null when no profile can be matched.
 */
async function resolveProfileForApiKey(
  apiKey: NonNullable<AuthRequest['apiKey']>
): Promise<{ id: string; email: string | null } | null> {
  const sb = getSupabase();

  if (apiKey.id && apiKey.name) {
    // user_id is stored on api_keys — look it up from the row itself.
    const { data: keyRow } = await sb
      .from('api_keys')
      .select('user_id, email')
      .eq('id', apiKey.id)
      .single();

    const userId = (keyRow as { user_id?: string | null } | null)?.user_id;
    if (userId) {
      const { data: profile } = await sb
        .from('profiles')
        .select('id, email')
        .eq('id', userId)
        .maybeSingle();
      if (profile) return profile as { id: string; email: string | null };
    }

    const keyEmail = (keyRow as { email?: string | null } | null)?.email || apiKey.email;
    if (keyEmail) {
      const { data: profile } = await sb
        .from('profiles')
        .select('id, email')
        .eq('email', keyEmail)
        .maybeSingle();
      if (profile) return profile as { id: string; email: string | null };
    }
  }

  return null;
}

function normalizeAvatar(body: unknown): { ok: true; value: string | null } | { ok: false; message: string } {
  if (typeof body !== 'string') {
    return { ok: false, message: '"avatar_url" is required (http(s) URL or data:image payload).' };
  }
  const trimmed = body.trim();
  if (!trimmed) return { ok: true, value: null }; // clear
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('data:image/')) {
    return { ok: false, message: 'Avatar URL must start with http(s):// or be a data:image payload.' };
  }
  if (trimmed.length > URL_MAX) {
    return { ok: false, message: `Image too large — max ${Math.round(URL_MAX / 1000)}KB encoded. Resize to 256x256 (the dashboard picker does this automatically).` };
  }
  return { ok: true, value: trimmed.slice(0, URL_MAX) };
}

/** GET /api/profile/pic — current avatar for the authenticated key's user. */
router.get('/pic', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const auth = req as AuthRequest;
  if (!auth.apiKey) {
    res.status(401).json({ error: { type: 'authentication_required', message: 'API key is required.' } });
    return;
  }

  const profile = await resolveProfileForApiKey(auth.apiKey);
  if (!profile) {
    res.status(404).json({ error: { type: 'not_found', message: 'No profile is linked to this API key.' } });
    return;
  }

  const { data, error } = await getSupabase()
    .from('profiles')
    .select('avatar_url')
    .eq('id', profile.id)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: { type: 'db_error', message: error.message } });
    return;
  }

  res.json({ avatar_url: (data as { avatar_url?: string | null } | null)?.avatar_url ?? null });
});

/** PUT /api/profile/pic — set/clear the avatar (profile picture) for the authenticated key's user. */
router.put('/pic', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const auth = req as AuthRequest;
  if (!auth.apiKey) {
    res.status(401).json({ error: { type: 'authentication_required', message: 'API key is required.' } });
    return;
  }

  const parsed = normalizeAvatar(req.body?.avatar_url);
  if (!parsed.ok) {
    res.status(400).json({ error: { type: 'validation_error', message: parsed.message } });
    return;
  }

  const profile = await resolveProfileForApiKey(auth.apiKey);
  if (!profile) {
    res.status(404).json({ error: { type: 'not_found', message: 'No profile is linked to this API key — create the key from the dashboard so it is linked to your account.' } });
    return;
  }

  const { error } = await getSupabase()
    .from('profiles')
    .update({ avatar_url: parsed.value })
    .eq('id', profile.id);

  if (error) {
    res.status(500).json({ error: { type: 'db_error', message: error.message } });
    return;
  }

  res.json({ avatar_url: parsed.value, message: parsed.value ? 'Profile picture updated.' : 'Profile picture cleared.' });
});

export default router;

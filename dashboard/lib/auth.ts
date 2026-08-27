'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * Shared OAuth / Supabase actions used across auth screens.
 * All return an error string (empty string on success).
 */
export async function signInWithProvider(provider: 'google' | 'github' | 'apple'): Promise<string> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return error?.message || '';
}

export async function signInWithPassword(email: string, password: string): Promise<string> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error?.message || '';
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName?: string
): Promise<string> {
  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: fullName ? { full_name: fullName } : undefined,
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return error?.message || '';
}

export async function resetPasswordForEmail(email: string): Promise<string> {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return error?.message || '';
}

export async function updatePassword(newPassword: string): Promise<string> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return error?.message || '';
}

/**
 * Request an email change. Supabase sends a confirmation link to the new
 * address — the change only takes effect once the user clicks it.
 */
export async function updateEmail(newEmail: string): Promise<string> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  return error?.message || '';
}

/**
 * Change the user's password.
 *
 * For users who signed up with a password we re-authenticate first so the
 * change satisfies Supabase's recent-login policy. OAuth-only users can omit
 * `currentPassword` to set a password for the first time.
 */
export async function changePassword(
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<string> {
  const supabase = createClient();
  if (currentPassword) {
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (reauthErr) return reauthErr.message;
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return error?.message || '';
}

/**
 * Link an OAuth provider (Google / GitHub) to the current account.
 * Redirects to the provider and back through /auth/callback. Returns an
 * error string if the redirect cannot be initiated.
 */
export async function linkSocialProvider(provider: 'google' | 'github'): Promise<string> {
  const supabase = createClient();
  const { error } = await supabase.auth.linkIdentity({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return error?.message || '';
}

/**
 * Returns the list of auth providers currently linked to the account
 * (e.g. ['email'], ['email', 'google']). Uses the user's identities.
 */
export async function getConnectedProviders(): Promise<{ providers: string[]; error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return { providers: [], error: error.message };
  const providers = (data.user?.identities ?? [])
    .map((i) => i.provider)
    .filter((p): p is string => typeof p === 'string');
  return { providers, error: '' };
}

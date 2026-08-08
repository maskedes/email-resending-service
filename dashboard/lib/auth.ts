'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * Shared OAuth / Supabase actions used across auth screens.
 * All return an error string (empty string on success).
 */
export async function signInWithProvider(provider: 'google' | 'github'): Promise<string> {
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

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AuthShell from '@/components/auth/AuthShell';
import { updatePassword } from '@/lib/auth';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // Exchange the recovery code for a session so updateUser() works.
  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('Missing recovery code. Please use the link from your email.');
      return;
    }
    const supabase = createClient();
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error: err }) => {
        if (err) {
          setError(err.message || 'Invalid or expired reset link.');
        } else {
          setReady(true);
        }
      });
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    const err = await updatePassword(password);
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    setMessage('Password updated successfully.');
    setLoading(false);
    setTimeout(() => router.push('/overview'), 1500);
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong, new password">
      {error && (
        <div className="mb-5 border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300 ">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-5 border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-300 ">
          {message}
        </div>
      )}

      {ready ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">
              New password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              autoFocus
              className="auth-input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">
              Confirm password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              required
              minLength={6}
              className="auth-input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="auth-btn-primary"
          >
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-slate-500">Verifying your reset link…</p>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

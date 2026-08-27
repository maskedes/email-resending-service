'use client';

import { useState } from 'react';
import { signInWithProvider } from '@/lib/auth';

const googleEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH !== 'false';
const githubEnabled = process.env.NEXT_PUBLIC_ENABLE_GITHUB_OAUTH !== 'false';
const appleEnabled = process.env.NEXT_PUBLIC_ENABLE_APPLE_OAUTH !== 'false';

/** True when at least one OAuth provider is enabled in Supabase. */
export function hasEnabledOAuthProviders() {
  return googleEnabled || githubEnabled || appleEnabled;
}

export default function OAuthButtons() {
  const [error, setError] = useState('');
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | 'apple' | null>(null);

  async function handleProvider(provider: 'google' | 'github' | 'apple') {
    setLoadingProvider(provider);
    setError('');
    const err = await signInWithProvider(provider);
    if (err) setError(err);
    setLoadingProvider(null);
  }

  if (!hasEnabledOAuthProviders()) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {error && (
        <p className="text-center text-sm text-red-400">{error}</p>
      )}

      <div className="flex items-center justify-center gap-3">
      {googleEnabled && (
      <button
        type="button"
        onClick={() => handleProvider('google')}
        disabled={loadingProvider !== null}
        className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-canvas-raised px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-canvas-border hover:border-white/[0.16] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingProvider === 'google' ? (
          <span className="flex items-center gap-2">
            <span className="h-1 w-1 animate-pulse rounded-full bg-slate-300" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-slate-300 [animation-delay:0.15s]" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-slate-300 [animation-delay:0.3s]" />
          </span>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </>
        )}
      </button>
      )}

      {githubEnabled && (
      <button
        type="button"
        onClick={() => handleProvider('github')}
        disabled={loadingProvider !== null}
        className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-canvas-raised px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-canvas-border hover:border-white/[0.16] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingProvider === 'github' ? (
          <span className="flex items-center gap-2">
            <span className="h-1 w-1 animate-pulse rounded-full bg-slate-300" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-slate-300 [animation-delay:0.15s]" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-slate-300 [animation-delay:0.3s]" />
          </span>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            GitHub
          </>
        )}
      </button>
      )}

      {appleEnabled && (
      <button
        type="button"
        onClick={() => handleProvider('apple')}
        disabled={loadingProvider !== null}
        className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-canvas-raised px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-canvas-border hover:border-white/[0.16] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingProvider === 'apple' ? (
          <span className="flex items-center gap-2">
            <span className="h-1 w-1 animate-pulse rounded-full bg-slate-300" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-slate-300 [animation-delay:0.15s]" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-slate-300 [animation-delay:0.3s]" />
          </span>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.88 2.65 3.22 2.6 1.29-.05 1.78-.83 3.34-.83 1.56 0 2 .83 3.38.81 1.39-.03 2.27-1.27 3.12-2.53.98-1.45 1.39-2.85 1.41-2.92-.03-.01-2.71-1.04-2.74-4.13zM14.6 4.74c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44z" />
            </svg>
            Apple
          </>
        )}
      </button>
      )}
      </div>
    </div>
  );
}

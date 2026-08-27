'use client';

import { useEffect, useState } from 'react';

type CookiePreferences = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

const STORAGE_KEY = 'envoy-cookie-preferences';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<CookiePreferences>;
        setPreferences({
          necessary: true,
          analytics: Boolean(parsed.analytics),
          marketing: Boolean(parsed.marketing),
        });
      } else {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const savePreferences = (next: CookiePreferences) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage failures silently
    }
    setPreferences(next);
    setVisible(false);
  };

  const togglePreference = (key: keyof Omit<CookiePreferences, 'necessary'>) => {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 sm:px-6">
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0b0d10] p-5 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Privacy & cookies</p>
            <h2 className="mt-2 text-2xl font-bold text-white">We use cookies to improve your experience</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              We use necessary cookies for app functionality, analytics to understand usage, and optional preferences
              to personalize the experience. You can update your choices at any time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => savePreferences({ necessary: true, analytics: true, marketing: true })}
              className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-200"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={() => savePreferences({ necessary: true, analytics: false, marketing: false })}
              className="rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5"
            >
              Reject optional
            </button>
            <button
              type="button"
              onClick={() => savePreferences(preferences)}
              className="rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5"
            >
              Save preferences
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-300">
            <div>
              <span className="block font-medium text-white">Necessary</span>
              <span className="text-xs text-slate-400">Required for app features</span>
            </div>
            <input
              type="checkbox"
              checked={preferences.necessary}
              disabled
              readOnly
              className="h-4 w-4 accent-white"
            />
          </label>

          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-300">
            <div>
              <span className="block font-medium text-white">Analytics</span>
              <span className="text-xs text-slate-400">Usage insights</span>
            </div>
            <input
              type="checkbox"
              checked={preferences.analytics}
              onChange={() => togglePreference('analytics')}
              className="h-4 w-4 accent-white"
            />
          </label>

          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-300">
            <div>
              <span className="block font-medium text-white">Marketing</span>
              <span className="text-xs text-slate-400">Product updates</span>
            </div>
            <input
              type="checkbox"
              checked={preferences.marketing}
              onChange={() => togglePreference('marketing')}
              className="h-4 w-4 accent-white"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

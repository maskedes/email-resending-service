'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'envoy-theme';

/**
 * Applies the user's Dark Mode preference to the whole dashboard.
 *
 * The `darkMode` boolean is stored per-user in Supabase (via /api/auth/preferences).
 * We mirror it in localStorage so the theme can be applied instantly on first
 * paint (no flash) and on pages before the session resolves. A `theme-change`
 * event lets the Settings toggle apply the change immediately without a reload.
 *
 * When darkMode is false we add the `light` class to <html>, which activates the
 * `.light` overrides in globals.css. When true (default) we remove it.
 */
function applyTheme(isDark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('light', !isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Apply cached preference immediately (flash-free).
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached === 'light' || cached === 'dark') {
      applyTheme(cached === 'dark');
    }

    // 2. Resolve the authoritative preference from the backend (if signed in).
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/preferences', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const p = data?.preferences;
        if (!p || typeof p.darkMode !== 'boolean') return;
        if (cancelled) return;
        applyTheme(p.darkMode);
        localStorage.setItem(STORAGE_KEY, p.darkMode ? 'dark' : 'light');
      } catch {
        // offline / not authenticated — keep the cached/localStorage value
      }
    })();

    // 3. Listen for live toggles from the Settings page.
    const onThemeChange = (e: Event) => {
      const detail = (e as CustomEvent<{ darkMode: boolean }>).detail;
      if (typeof detail?.darkMode === 'boolean') {
        applyTheme(detail.darkMode);
        localStorage.setItem(STORAGE_KEY, detail.darkMode ? 'dark' : 'light');
      }
    };
    window.addEventListener('theme-change', onThemeChange as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener('theme-change', onThemeChange as EventListener);
    };
  }, []);

  return <>{children}</>;
}

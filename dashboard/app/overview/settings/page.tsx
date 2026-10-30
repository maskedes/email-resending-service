'use client';

import { useState, useEffect } from 'react';
import {
  updateEmail,
  changePassword,
  linkSocialProvider,
  getConnectedProviders,
} from '@/lib/auth';

interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  full_name: string | null;
  avatar_url: string | null;
}

type SettingsTab = 'account' | 'preferences' | 'security' | 'resources' | 'danger';

const TAB_DEFS: { id: SettingsTab; label: string }[] = [
  { id: 'account', label: 'Account Settings' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'security', label: 'Security' },
  { id: 'resources', label: 'Resources' },
  { id: 'danger', label: 'Danger Zone' },
];

export default function SettingsPage() {
  // Active settings tab
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Preferences state — loaded from the backend so they persist per user.
  type PreferenceKey = 'emailNotifications' | 'dnsAutoCheck' | 'darkMode';
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [dnsAutoCheck, setDnsAutoCheck] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE' || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setDeleteError(body?.error?.message || 'Account deletion failed. Please try again or contact support.');
        setDeleting(false);
        return;
      }
      // Account + auth user are gone — hard-redirect clears session state.
      window.location.href = '/';
    } catch {
      setDeleteError('Account deletion failed. Please try again or contact support.');
      setDeleting(false);
    }
  }

  // Account editing
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftAvatar, setDraftAvatar] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Change email
  const [newEmail, setNewEmail] = useState('');
  const [emailMsg, setEmailMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  // Connected social accounts
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [socialMsg, setSocialMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [socialLoading, setSocialLoading] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user) setUser(data.user);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    async function loadPreferences() {
      try {
        const res = await fetch('/api/auth/preferences');
        const data = await res.json();
        const p = data.preferences;
        if (p) {
          if (typeof p.emailNotifications === 'boolean') setEmailNotifications(p.emailNotifications);
          if (typeof p.dnsAutoCheck === 'boolean') setDnsAutoCheck(p.dnsAutoCheck);
          if (typeof p.darkMode === 'boolean') setDarkMode(p.darkMode);
        }
      } catch {
        // silent — keep UI defaults
      } finally {
        setPrefsLoading(false);
      }
    }

    async function loadProviders() {
      const { providers, error } = await getConnectedProviders();
      if (!error) setConnectedProviders(providers);
    }

    loadUser();
    loadPreferences();
    loadProviders();
  }, []);

  // Persist a single preference toggle to the backend (optimistic update).
  async function updatePreference(key: PreferenceKey, value: boolean) {
    if (key === 'emailNotifications') setEmailNotifications(value);
    if (key === 'dnsAutoCheck') setDnsAutoCheck(value);
    if (key === 'darkMode') setDarkMode(value);

    const next = {
      emailNotifications: key === 'emailNotifications' ? value : emailNotifications,
      dnsAutoCheck: key === 'dnsAutoCheck' ? value : dnsAutoCheck,
      darkMode: key === 'darkMode' ? value : darkMode,
    };

    // Apply theme change instantly (Dark Mode toggle).
    if (key === 'darkMode' && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('theme-change', { detail: { darkMode: value } })
      );
      try {
        localStorage.setItem('envoy-theme', value ? 'dark' : 'light');
      } catch {
        // ignore
      }
    }

    setPrefsSaving(true);
    try {
      await fetch('/api/auth/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: next }),
      });
    } catch {
      // silent — state already updated optimistically
    } finally {
      setPrefsSaving(false);
    }
  }

  // Open the account editing screen, seeded with current values.
  function openEdit() {
    setDraftName(user?.full_name ?? '');
    setDraftAvatar(user?.avatar_url ?? '');
    setProfileError('');
    setEditOpen(true);
  }

  // Persist edited account fields to the backend.
  async function saveProfile() {
    setSavingProfile(true);
    setProfileError('');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: draftName, avatar_url: draftAvatar }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setProfileError(data?.error?.message || 'Failed to update account.');
        return;
      }
      const data = await res.json();
      setUser((u) => (u ? { ...u, full_name: data.full_name, avatar_url: data.avatar_url } : u));
      setEditOpen(false);
    } catch {
      setProfileError('Network error. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  }

  // Request an email change (requires confirmation at the new address).
  async function handleChangeEmail() {
    setEmailLoading(true);
    setEmailMsg(null);
    const err = await updateEmail(newEmail.trim());
    setEmailLoading(false);
    if (err) {
      setEmailMsg({ type: 'err', text: err });
      return;
    }
    setEmailMsg({
      type: 'ok',
      text: 'Confirmation sent. Check your new email address to finish the change.',
    });
    setNewEmail('');
  }

  // Change the account password.
  async function handleChangePassword() {
    setPwMsg(null);
    if (newPassword.length < 8) {
      setPwMsg({ type: 'err', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'err', text: 'New passwords do not match.' });
      return;
    }
    if (!user) return;
    setPwLoading(true);
    const err = await changePassword(user.email, currentPassword, newPassword);
    setPwLoading(false);
    if (err) {
      setPwMsg({ type: 'err', text: err });
      return;
    }
    setPwMsg({ type: 'ok', text: 'Password updated successfully.' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }

  // Link an OAuth provider to the current account.
  async function handleLinkProvider(provider: 'google' | 'github') {
    setSocialLoading(true);
    setSocialMsg(null);
    const err = await linkSocialProvider(provider);
    setSocialLoading(false);
    // On success the browser redirects to the provider, so we may not return here.
    if (err) {
      setSocialMsg({ type: 'err', text: err });
    }
  }

  function EditIcon() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M0 0h24v24H0z" fill="none" />
        <path
          fill="currentColor"
          d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"
        />
      </svg>
    );
  }

  function MoreIcon() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        className="h-5 w-5 text-white"
        aria-hidden="true"
      >
        <path d="M0 0h24v24H0z" fill="none" />
        <path
          fill="currentColor"
          d="M9 20q-.475 0-.9-.213t-.7-.587L2 12l5.4-7.2q.275-.375.7-.587T9 4h11q.825 0 1.413.587T22 6v12q0 .825-.587 1.413T20 20zm1.713-7.288Q11 12.425 11 12t-.288-.712T10 11t-.712.288T9 12t.288.713T10 13t.713-.288m3.5 0q.287-.287.287-.712t-.288-.712T13.5 11t-.712.288T12.5 12t.288.713t.712.287t.713-.288m3.5 0Q18 12.426 18 12t-.288-.712T17 11t-.712.288T16 12t.288.713T17 13t.713-.288"
        />
      </svg>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-slate-400">Manage your account settings, preferences, security, and more.</p>
      </div>

      {/* Settings Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-canvas-border" role="tablist" aria-label="Settings sections">
        {TAB_DEFS.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-brand text-white'
                : id === 'danger'
                  ? 'border-transparent text-red-400/70 hover:text-red-400'
                  : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ================= Account Settings Tab ================= */}
      {activeTab === 'account' && (
        <section className="rounded-2xl border border-canvas-border bg-canvas-raised p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Account</h2>
              <p className="text-sm text-slate-400">Your account information</p>
            </div>
            <button
              type="button"
              onClick={openEdit}
              aria-label="Edit account"
              className="inline-flex items-center gap-1.5 rounded-lg border border-canvas-border bg-canvas px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-brand/60 hover:text-white"
            >
              <EditIcon />
              Edit
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-canvas-border bg-canvas/30 p-4">
              <div>
                <p className="text-sm text-slate-400">Display Name</p>
                <p className="text-white font-medium">
                  {loading ? 'Loading…' : user?.full_name || '—'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-canvas-border bg-canvas/30 p-4">
              <div>
                <p className="text-sm text-slate-400">Email</p>
                <p className="text-white font-medium">
                  {loading ? 'Loading…' : user?.email || '—'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-canvas-border bg-canvas/30 p-4">
              <div>
                <p className="text-sm text-slate-400">User ID</p>
                <p className="text-white font-mono text-sm break-all">
                  {loading ? 'Loading…' : user?.id || '—'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-canvas-border bg-canvas/30 p-4">
              <div>
                <p className="text-sm text-slate-400">Member since</p>
                <p className="text-white font-medium">
                  {loading ? 'Loading…' : user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= Preferences Tab ================= */}
      {activeTab === 'preferences' && (
        <section className="rounded-2xl border border-canvas-border bg-canvas-raised p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">
              Preferences{prefsSaving && <span className="ml-2 text-xs font-normal text-slate-500">Saving…</span>}
            </h2>
            <p className="text-sm text-slate-400">Customize your experience — saved to your account automatically</p>
          </div>

          <div className="space-y-3">
            {/* Email Notifications */}
            <div className="flex items-center justify-between rounded-2xl border border-canvas-border bg-canvas/30 p-4">
              <div>
                <p className="text-white font-medium">Email Notifications</p>
                <p className="text-sm text-slate-400">Receive email alerts for delivery failures</p>
              </div>
              <ToggleSwitch
                checked={prefsLoading ? false : emailNotifications}
                onToggle={() => updatePreference('emailNotifications', !emailNotifications)}
                ariaLabel="Toggle email notifications"
              />
            </div>

            {/* DNS Auto-Check */}
            <div className="flex items-center justify-between rounded-2xl border border-canvas-border bg-canvas/30 p-4">
              <div>
                <p className="text-white font-medium">Auto DNS Verification</p>
                <p className="text-sm text-slate-400">Automatically check DNS records on page load</p>
              </div>
              <ToggleSwitch
                checked={prefsLoading ? false : dnsAutoCheck}
                onToggle={() => updatePreference('dnsAutoCheck', !dnsAutoCheck)}
                ariaLabel="Toggle DNS auto verification"
              />
            </div>

            {/* Dark Mode */}
            <div className="flex items-center justify-between rounded-2xl border border-canvas-border bg-canvas/30 p-4">
              <div>
                <p className="text-white font-medium">Dark Mode</p>
                <p className="text-sm text-slate-400">Always use dark theme</p>
              </div>
              <ToggleSwitch
                checked={prefsLoading ? false : darkMode}
                onToggle={() => updatePreference('darkMode', !darkMode)}
                ariaLabel="Toggle dark mode"
              />
            </div>
          </div>
        </section>
      )}

      {/* ================= Security Tab ================= */}
      {activeTab === 'security' && (
        <section className="rounded-2xl border border-canvas-border bg-canvas-raised p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">Security</h2>
            <p className="text-sm text-slate-400">Email, password, and sign-in methods</p>
          </div>

          <div className="space-y-6">
            {/* Password */}
            <div className="rounded-2xl border border-canvas-border bg-canvas/30 p-4">
              <div className="mb-3">
                <p className="text-white font-medium">Change Password</p>
                {!connectedProviders.includes('email') && (
                  <p className="text-xs text-slate-400 mt-1">
                    You signed in with a social account. Set a password to enable email/password sign in.
                  </p>
                )}
              </div>
              <div className="space-y-3 max-w-md">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={connectedProviders.includes('email') ? 'Current password' : 'Current password (optional)'}
                  disabled={pwLoading}
                  className="w-full border border-canvas-border bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-brand disabled:opacity-50"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  disabled={pwLoading}
                  className="w-full border border-canvas-border bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-brand disabled:opacity-50"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={pwLoading}
                  className="w-full border border-canvas-border bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-brand disabled:opacity-50"
                />
                {pwMsg && (
                  <p className={`text-sm ${pwMsg.type === 'ok' ? 'text-emerald-400' : 'text-red-300'}`}>
                    {pwMsg.text}
                  </p>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={pwLoading || !newPassword || !confirmPassword}
                    className="rounded-lg border border-canvas-border bg-canvas px-4 py-2 text-sm font-medium text-slate-200 transition hover:text-white disabled:opacity-50"
                  >
                    {pwLoading ? 'Updating…' : 'Update Password'}
                  </button>
                </div>
              </div>
            </div>

            {/* Email change */}
            <div className="rounded-2xl border border-canvas-border bg-canvas/30 p-4">
              <div className="mb-3">
                <p className="text-white font-medium">Change Email</p>
                <p className="text-xs text-slate-400 mt-1">
                  Current: <span className="text-slate-300">{user?.email || '—'}</span>
                </p>
              </div>
              <div className="space-y-3 max-w-md">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@email.com"
                  disabled={emailLoading}
                  className="w-full border border-canvas-border bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-brand disabled:opacity-50"
                />
                {emailMsg && (
                  <p className={`text-sm ${emailMsg.type === 'ok' ? 'text-emerald-400' : 'text-red-300'}`}>
                    {emailMsg.text}
                  </p>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleChangeEmail}
                    disabled={emailLoading || !newEmail.trim()}
                    className="rounded-lg border border-canvas-border bg-canvas px-4 py-2 text-sm font-medium text-slate-200 transition hover:text-white disabled:opacity-50"
                  >
                    {emailLoading ? 'Sending…' : 'Send Confirmation'}
                  </button>
                </div>
              </div>
            </div>

            {/* Connected accounts */}
            <div className="rounded-2xl border border-canvas-border bg-canvas/30 p-4">
              <div className="mb-3">
                <p className="text-white font-medium">Connected Accounts</p>
                <p className="text-xs text-slate-400 mt-1">Link a social account to sign in without a password.</p>
              </div>
              <div className="space-y-2 max-w-md">
                <div className="flex items-center justify-between rounded-2xl border border-canvas-border bg-canvas/30 p-3">
                  <span className="text-sm text-white">Google</span>
                  {connectedProviders.includes('google') ? (
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                      Connected
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleLinkProvider('google')}
                      disabled={socialLoading}
                      className="rounded-lg border border-canvas-border bg-canvas px-3 py-1 text-xs font-medium text-slate-200 transition hover:text-white disabled:opacity-50"
                    >
                      Connect
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-canvas-border bg-canvas/30 p-3">
                  <span className="text-sm text-white">GitHub</span>
                  {connectedProviders.includes('github') ? (
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                      Connected
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleLinkProvider('github')}
                      disabled={socialLoading}
                      className="rounded-lg border border-canvas-border bg-canvas px-3 py-1 text-xs font-medium text-slate-200 transition hover:text-white disabled:opacity-50"
                    >
                      Connect
                    </button>
                  )}
                </div>

                {socialMsg && (
                  <p className={`text-sm ${socialMsg.type === 'ok' ? 'text-emerald-400' : 'text-red-300'}`}>
                    {socialMsg.text}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= Resources Tab ================= */}
      {activeTab === 'resources' && (
        <>
          <section className="rounded-2xl border border-canvas-border bg-canvas-raised p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">More</h2>
              <p className="text-sm text-slate-400">Additional resources and information</p>
            </div>

            <div className="space-y-3">
              <a
                href="https://docs.mailenvoy.qd.je"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-2xl border border-canvas-border bg-canvas/30 p-4 hover:bg-brand/5 transition-colors group"
              >
                <div>
                  <p className="text-white font-medium">Documentation</p>
                  <p className="text-sm text-slate-400">Read the API docs and guides</p>
                </div>
                <MoreIcon />
              </a>

              <a
                href="https://github.com/maskedes233/email-resending-service"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-2xl border border-canvas-border bg-canvas/30 p-4 hover:bg-brand/5 transition-colors group"
              >
                <div>
                  <p className="text-white font-medium">Open Source</p>
                  <p className="text-sm text-slate-400">View source code on GitHub</p>
                </div>
                <MoreIcon />
              </a>

              <div className="rounded-2xl border border-canvas-border bg-canvas/30 p-4">
                <div>
                  <p className="text-white font-medium">Version</p>
                  <p className="text-sm text-slate-400">E-NVOY v1.0.0 — Open Source Email Service</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-canvas-border bg-canvas-raised p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">Follow Us</h2>
              <p className="text-sm text-slate-400">Stay connected with E-NVOY</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <a
                href="https://github.com/maskedes233"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-2xl border border-canvas-border bg-canvas/30 p-4 hover:bg-brand/5 transition-colors group"
              >
                <div>
                  <p className="text-white font-medium text-sm">GitHub</p>
                  <p className="text-xs text-slate-500">@maskedes233</p>
                </div>
                <MoreIcon />
              </a>

              <a
                href="https://twitter.com/mailenvoy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-2xl border border-canvas-border bg-canvas/30 p-4 hover:bg-brand/5 transition-colors group"
              >
                <div>
                  <p className="text-white font-medium text-sm">X (Twitter)</p>
                  <p className="text-xs text-slate-500">@mailenvoy</p>
                </div>
                <MoreIcon />
              </a>

              <a
                href="mailto:support@mailenvoy.qd.je"
                className="flex items-center justify-between rounded-2xl border border-canvas-border bg-canvas/30 p-4 hover:bg-brand/5 transition-colors group"
              >
                <div>
                  <p className="text-white font-medium text-sm">Email</p>
                  <p className="text-xs text-slate-500">support@mailenvoy.qd.je</p>
                </div>
                <MoreIcon />
              </a>
            </div>
          </section>
        </>
      )}

      {/* ================= Danger Zone Tab ================= */}
      {activeTab === 'danger' && (
        <section className="border border-red-500/30 bg-red-500/5 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-400">Delete Account</h2>
              <p className="text-sm text-slate-400">Permanently delete your account and all data</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border border-red-500/20 bg-red-500/5 p-4 text-sm">
              <p className="font-medium mb-1">⚠️ This action is irreversible</p>
              <p className="text-slate-400">
                All API keys, domains, and email history are permanently deleted.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1.5 block text-sm text-slate-400">
                  Type <span className="text-red-400 font-mono">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  disabled={deleting}
                  className="w-full border border-red-500/30 bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-red-500 disabled:opacity-50"
                />
              </div>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== 'DELETE' || deleting}
                className="bg-red-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {deleting ? 'Deleting…' : 'Delete Account'}
              </button>
            </div>

            {deleteError && (
              <div className="border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {deleteError}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Edit account modal (profile fields only) */}
      {editOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !savingProfile && setEditOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit account"
            className="w-full max-w-md rounded-2xl border border-canvas-border bg-canvas-raised p-6 shadow-2xl shadow-black/40 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">Edit Account</h3>
            <p className="mb-5 text-sm text-slate-400">Update your display name and avatar.</p>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-slate-400">Display Name</label>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Your name"
                  disabled={savingProfile}
                  className="w-full border border-canvas-border bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-brand disabled:opacity-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-slate-400">Avatar URL</label>
                <input
                  type="url"
                  value={draftAvatar}
                  onChange={(e) => setDraftAvatar(e.target.value)}
                  placeholder="https://…"
                  disabled={savingProfile}
                  className="w-full border border-canvas-border bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-brand disabled:opacity-50"
                />
              </div>

              {profileError && (
                <p className="text-sm text-red-300">{profileError}</p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-lg border border-canvas-border bg-canvas px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-brand/90 disabled:opacity-50"
                >
                  {savingProfile ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onToggle,
  ariaLabel,
}: {
  checked: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={checked}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
        checked ? 'border-white bg-white/5' : 'border-slate-600 bg-canvas/30'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full shadow-sm transition-transform ${
          checked ? 'translate-x-5 bg-emerald-400' : 'translate-x-0.5 bg-white'
        }`}
      />
    </button>
  );
}

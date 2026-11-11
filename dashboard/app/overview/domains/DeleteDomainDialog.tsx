'use client';

import { useEffect, useState } from 'react';

/**
 * Delete-domain confirmation with a typed cross-check.
 *
 * Deleting a domain is destructive and quietly disables things that depend on
 * it (DNS record guidance, DKIM keys, and any email-forwarding rules — mail
 * stops being forwarded). A bare confirm() click-through is not enough, so
 * the dialog requires the user to type the exact domain name before the
 * Delete button enables. The parent owns the delete API call via onConfirm.
 */
export function DeleteDomainDialog({
  domainName,
  onConfirm,
  onClose,
}: {
  domainName: string;
  /** Parent-performed delete; resolves when the domain is gone. */
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Escape closes (unless a request is in flight).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !deleting) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleting, onClose]);

  const matches = typed.trim().toLowerCase() === domainName.toLowerCase();

  async function handleDelete() {
    if (!matches || deleting) return;
    setDeleting(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Could not delete the domain.');
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={() => !deleting && onClose()}
    >
      <div
        className="w-full max-w-md border border-canvas-border bg-canvas-raised p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined mt-0.5 text-2xl text-danger">warning</span>
          <div>
            <h3 className="text-lg font-bold text-white">Delete {domainName}?</h3>
            <p className="mt-1.5 text-sm text-slate-400">
              This cannot be undone. The domain&apos;s DNS record setup, DKIM keys,
              and any <span className="text-slate-200">email-forwarding rules</span> are removed —
              mail to this domain will stop being forwarded immediately.
            </p>
          </div>
        </div>

        <label className="mt-5 block">
          <span className="text-xs uppercase tracking-wider text-slate-500">
            Type <span className="font-mono text-slate-200">{domainName}</span> to confirm
          </span>
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={deleting}
            spellCheck={false}
            autoComplete="off"
            placeholder={domainName}
            className="mt-1.5 w-full border border-canvas-border bg-canvas px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600 focus:border-brand focus:outline-none disabled:opacity-50"
          />
        </label>

        {error && <p className="mt-2 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="border border-canvas-border px-4 py-2 text-sm font-medium text-slate-300 hover:bg-canvas-border/40 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!matches || deleting}
            className="bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? 'Deleting…' : 'Delete domain'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { COUNTRIES } from './countries';

function flagUrl(iso2: string): string {
  return `https://flagcdn.com/w20/${iso2.toLowerCase()}.png`;
}

/**
 * Compact country-code picker: collapsed shows only the selected country's
 * real flag (tiny image, not emoji — Windows renders flag emoji as letters).
 * The dropdown shows a flag grid; hovering reveals "Name +cc". The chosen
 * dial code rides in a hidden `cc` input for the server action.
 */
export default function PhoneCountrySelect() {
  const [open, setOpen] = useState(false);
  const [iso, setIsIso] = useState('UG');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const sel = COUNTRIES.find((c) => c.iso2 === iso) || COUNTRIES[0];

  return (
    <div ref={ref} className="flex flex-col justify-end">
      <label htmlFor="sms-cc" className="block text-xs text-slate-400 mb-1">
        Country code
      </label>
      <input type="hidden" name="cc" value={sel.cc} />
      <div className="relative">
        <button
          id="sms-cc"
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Country code: ${sel.name} +${sel.cc}`}
          title={`${sel.name} +${sel.cc}`}
          onClick={() => setOpen((o) => !o)}
          className="flex h-[42px] w-14 items-center justify-center gap-0.5 rounded border border-input bg-transparent transition hover:bg-white/5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={flagUrl(sel.iso2)}
            width={20}
            height={15}
            alt=""
            className="rounded-[2px]"
          />
          <span className="text-[9px] leading-none text-slate-400">▾</span>
        </button>
        {open && (
          <div
            role="listbox"
            aria-label="Select country"
            className="grid absolute z-40 mt-1 w-72 max-h-72 grid-cols-7 gap-1 overflow-y-auto rounded border border-canvas-border bg-canvas-raised p-2 shadow-2xl"
          >
            {COUNTRIES.map((c) => (
              <button
                key={`${c.iso2}-${c.cc}`}
                type="button"
                title={`${c.name} +${c.cc}`}
                aria-selected={c.iso2 === sel.iso2}
                onClick={() => {
                  setIsIso(c.iso2);
                  setOpen(false);
                }}
                className={`flex items-center justify-center rounded p-1.5 transition ${
                  c.iso2 === sel.iso2 ? 'bg-blue-600/30 ring-1 ring-blue-400/40' : 'hover:bg-white/10'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={flagUrl(c.iso2)}
                  width={20}
                  height={15}
                  alt={c.name}
                  loading="lazy"
                  className="rounded-[2px]"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

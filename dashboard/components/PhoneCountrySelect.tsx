'use client';

import { useEffect, useRef, useState } from 'react';

/** Dial codes for the country-selector flags (calling code without "+"). */
const COUNTRIES = [
  { iso2: 'UG', name: 'Uganda', cc: '256' },
  { iso2: 'KE', name: 'Kenya', cc: '254' },
  { iso2: 'TZ', name: 'Tanzania', cc: '255' },
  { iso2: 'RW', name: 'Rwanda', cc: '250' },
  { iso2: 'BI', name: 'Burundi', cc: '257' },
  { iso2: 'CD', name: 'DR Congo', cc: '243' },
  { iso2: 'SS', name: 'South Sudan', cc: '211' },
  { iso2: 'ET', name: 'Ethiopia', cc: '251' },
  { iso2: 'SO', name: 'Somalia', cc: '252' },
  { iso2: 'SD', name: 'Sudan', cc: '249' },
  { iso2: 'EG', name: 'Egypt', cc: '20' },
  { iso2: 'NG', name: 'Nigeria', cc: '234' },
  { iso2: 'GH', name: 'Ghana', cc: '233' },
  { iso2: 'ZA', name: 'South Africa', cc: '27' },
  { iso2: 'GB', name: 'United Kingdom', cc: '44' },
  { iso2: 'US', name: 'United States', cc: '1' },
  { iso2: 'AE', name: 'UAE', cc: '971' },
  { iso2: 'SA', name: 'Saudi Arabia', cc: '966' },
  { iso2: 'IN', name: 'India', cc: '91' },
  { iso2: 'CN', name: 'China', cc: '86' },
  { iso2: 'DE', name: 'Germany', cc: '49' },
  { iso2: 'FR', name: 'France', cc: '33' },
  { iso2: 'IT', name: 'Italy', cc: '39' },
  { iso2: 'ES', name: 'Spain', cc: '34' },
  { iso2: 'NL', name: 'Netherlands', cc: '31' },
  { iso2: 'PL', name: 'Poland', cc: '48' },
  { iso2: 'TR', name: 'Turkey', cc: '90' },
  { iso2: 'RU', name: 'Russia', cc: '7' },
  { iso2: 'JP', name: 'Japan', cc: '81' },
  { iso2: 'KR', name: 'South Korea', cc: '82' },
  { iso2: 'SG', name: 'Singapore', cc: '65' },
  { iso2: 'MY', name: 'Malaysia', cc: '60' },
  { iso2: 'ID', name: 'Indonesia', cc: '62' },
  { iso2: 'PH', name: 'Philippines', cc: '63' },
  { iso2: 'BR', name: 'Brazil', cc: '55' },
  { iso2: 'MX', name: 'Mexico', cc: '52' },
  { iso2: 'AR', name: 'Argentina', cc: '54' },
  { iso2: 'CA', name: 'Canada', cc: '1' },
  { iso2: 'AU', name: 'Australia', cc: '61' },
  { iso2: 'NZ', name: 'New Zealand', cc: '64' },
] as const;

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

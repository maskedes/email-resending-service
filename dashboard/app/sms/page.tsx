import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendSmsAction } from './actions';

type Sms = {
  id: string;
  to_phone: string;
  body: string;
  status: string;
  parts: number;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  queued: 'text-amber-400',
  sent: 'text-sky-400',
  delivered: 'text-emerald-400',
  failed: 'text-rose-400',
};

/** Dial codes for the country selector (calling code without "+"). */
const COUNTRIES: Array<{ code: string; cc: string }> = [
  { code: '🇺🇬 Uganda', cc: '256' },
  { code: '🇰🇪 Kenya', cc: '254' },
  { code: '🇹🇿 Tanzania', cc: '255' },
  { code: '🇷🇼 Rwanda', cc: '250' },
  { code: '🇧🇮 Burundi', cc: '257' },
  { code: '🇨🇩 DR Congo', cc: '243' },
  { code: '🇸🇸 South Sudan', cc: '211' },
  { code: '🇪🇹 Ethiopia', cc: '251' },
  { code: '🇸🇴 Somalia', cc: '252' },
  { code: '🇸🇩 Sudan', cc: '249' },
  { code: '🇪🇬 Egypt', cc: '20' },
  { code: '🇳🇬 Nigeria', cc: '234' },
  { code: '🇬🇭 Ghana', cc: '233' },
  { code: '🇿🇦 South Africa', cc: '27' },
  { code: '🇬🇧 United Kingdom', cc: '44' },
  { code: '🇺🇸 United States', cc: '1' },
  { code: '🇦🇪 UAE', cc: '971' },
  { code: '🇸🇦 Saudi Arabia', cc: '966' },
  { code: '🇮🇳 India', cc: '91' },
  { code: '🇨🇳 China', cc: '86' },
  { code: '🇩🇪 Germany', cc: '49' },
  { code: '🇫🇷 France', cc: '33' },
  { code: '🇮🇹 Italy', cc: '39' },
  { code: '🇪🇸 Spain', cc: '34' },
  { code: '🇳🇱 Netherlands', cc: '31' },
  { code: '🇵🇱 Poland', cc: '48' },
  { code: '🇹🇷 Turkey', cc: '90' },
  { code: '🇷🇺 Russia', cc: '7' },
  { code: '🇯🇵 Japan', cc: '81' },
  { code: '🇰🇷 South Korea', cc: '82' },
  { code: '🇸🇬 Singapore', cc: '65' },
  { code: '🇲🇾 Malaysia', cc: '60' },
  { code: '🇮🇩 Indonesia', cc: '62' },
  { code: '🇵🇭 Philippines', cc: '63' },
  { code: '🇧🇷 Brazil', cc: '55' },
  { code: '🇲🇽 Mexico', cc: '52' },
  { code: '🇦🇷 Argentina', cc: '54' },
  { code: '🇨🇦 Canada', cc: '1' },
  { code: '🇦🇺 Australia', cc: '61' },
  { code: '🇦🇺 New Zealand', cc: '64' },
];

/** SMS inbox + send form. Fully server-rendered — the browser never calls the SMS API. */
export default async function SmsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const admin = createAdminClient();
  const { data: userKeys } = await admin
    .from('api_keys')
    .select('id')
    .eq('user_id', user.id);

  const keyIds = (userKeys || []).map((k) => k.id);

  let smsList: Sms[] = [];
  if (keyIds.length > 0) {
    const { data } = await admin
      .from('sms_messages')
      .select('id, to_phone, body, status, parts, created_at')
      .in('api_key_id', keyIds)
      .order('created_at', { ascending: false })
      .limit(50);
    smsList = (data || []) as Sms[];
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Send SMS</h1>
      <p className="text-sm text-muted-foreground">
        Queue a test SMS through your server. Your Android gateway phone delivers the message.
      </p>

      {/* ── Send test SMS: compact inline form, aligned boxes, blue send button ── */}
      <form action={sendSmsAction} className="flex flex-col sm:flex-row sm:items-stretch gap-2">
        <div className="flex flex-col justify-end sm:w-52">
          <label htmlFor="sms-cc" className="block text-xs text-slate-400 mb-1">
            Country code
          </label>
          <select
            id="sms-cc"
            name="cc"
            defaultValue="256"
            required
            className="h-[42px] border border-input rounded px-2 text-sm w-full bg-transparent"
          >
            {COUNTRIES.map((c) => (
              <option key={`${c.cc}-${c.code}`} value={c.cc}>
                {c.code} +{c.cc}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col justify-end sm:w-44">
          <label htmlFor="sms-phone" className="block text-xs text-slate-400 mb-1">
            Number
          </label>
          <input
            id="sms-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="756924177"
            required
            className="h-[42px] border border-input rounded px-3 text-sm w-full bg-transparent"
          />
        </div>
        <div className="flex-[2] flex flex-col justify-end">
          <label htmlFor="sms-body" className="block text-xs text-slate-400 mb-1">
            Message
          </label>
          <textarea
            id="sms-body"
            name="body"
            placeholder="Type your message here"
            rows={1}
            required
            maxLength={1600}
            className="h-[42px] min-h-[42px] max-h-40 border border-input rounded px-3 py-2 text-sm w-full bg-transparent resize-y"
          ></textarea>
        </div>
        <button
          type="submit"
          className="h-[42px] border-0 bg-blue-600 text-white rounded px-6 text-sm font-semibold whitespace-nowrap transition hover:bg-blue-500"
        >
          Send SMS
        </button>
      </form>
      <p className="text-xs text-muted-foreground -mt-3">
        Queued on your server and delivered by your Android gateway phone. Requires SMS enabled on your API key.
      </p>

      {/* ── Recent messages ── */}
      <section className="border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Recent messages</h2>
        {smsList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <div className="space-y-2">
            {smsList.map((s) => (
              <div key={s.id} className="border rounded p-2 text-sm flex justify-between gap-2">
                <span className="break-all">
                  <b>{s.to_phone}</b> — {s.body.slice(0, 80)}
                </span>
                <span className="text-xs whitespace-nowrap">
                  <span className={STATUS_STYLES[s.status] || ''}>{s.status}</span>
                  {s.parts > 1 ? ` · ${s.parts} parts` : ''} ·{' '}
                  {new Date(s.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

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

      {/* ── Send test SMS ── */}
      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Send test SMS</h2>
        <form action={sendSmsAction} className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <label htmlFor="sms-to" className="block text-xs text-slate-400 mb-1">
              Phone number
            </label>
            <input
              id="sms-to"
              name="to"
              type="tel"
              placeholder="+2567XXXXXXXX"
              required
              className="border rounded px-3 py-2 text-sm w-full bg-transparent"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="sms-body" className="block text-xs text-slate-400 mb-1">
              Message
            </label>
            <textarea
              id="sms-body"
              name="body"
              placeholder="Type your message here"
              rows={4}
              required
              maxLength={1600}
              className="border rounded px-3 py-2 text-sm w-full bg-transparent"
            ></textarea>
          </div>
          <button
            type="submit"
            className="bg-primary text-primary-foreground rounded px-6 py-2 text-sm whitespace-nowrap self-start"
          >
            Send SMS
          </button>
        </form>
        <p className="text-xs text-muted-foreground">
          Queued on your server and delivered by your Android gateway phone. Requires SMS enabled on your API key.
        </p>
      </section>

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

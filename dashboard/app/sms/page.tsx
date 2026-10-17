import { cookies } from 'next/headers';
import { expressFetch } from '@/lib/api';
import { revalidatePath } from 'next/cache';

type Sms = { id: string; to: string; body: string; status: string; parts: number; created_at: string; sent_at?: string };

async function getSessionToken(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('fms_dashboard')?.value;
  } catch {
    return undefined;
  }
}

/** Send SMS — runs entirely on the server. Browser never calls the SMS API directly. */
export async function sendSmsAction(formData: FormData): Promise<void> {
  const to = String(formData.get('to') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();

  if (!to || !body) {
    throw new Error('Phone number and message are both required.');
  }

  const sessionToken = await getSessionToken();
  const { status, data } = await expressFetch('/api/sms/send', {
    method: 'POST',
    body: { to, body },
    sessionToken,
  });

  if (status >= 400) {
    throw new Error(data?.error?.message || 'Send failed.');
  }

  revalidatePath('/sms');
}

/** ---------- Page (Server Component) ---------- */

export default async function SmsPage() {
  const sessionToken = await getSessionToken();

  // All data fetched on the server — nothing hits the SMS API from the browser.
  const smsResult = await expressFetch('/api/sms?limit=50', { sessionToken });

  const smsList: Sms[] = Array.isArray(smsResult.data?.data)
    ? smsResult.data.data
    : Array.isArray(smsResult.data)
      ? smsResult.data
      : [];

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
            <label className="block text-xs text-slate-400 mb-1">Phone number</label>
            <input
              name="to"
              type="tel"
              placeholder="+2567XXXXXXXX"
              required
              className="border rounded px-3 py-2 text-sm w-full"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Message</label>
            <textarea
              name="body"
              placeholder="Type your message here"
              rows={4}
              required
              maxLength={1600}
              className="border rounded px-3 py-2 text-sm w-full"
            ></textarea>
          </div>
          <button
            type="submit"
            className="bg-primary text-primary-foreground rounded px-6 py-2 text-sm whitespace-nowrap"
          >
            Send SMS
          </button>
        </form>
        <p className="text-xs text-muted-foreground">
          Submitted to your backend API — queued on your server, delivered by your Android gateway phone.
        </p>
      </section>

      {/* ── Recent messages ── */}
      <section className="border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Recent messages</h2>
        {smsList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <div className="space-y-2">
            {smsList.slice(0, 50).map((s) => (
              <div key={s.id} className="border rounded p-2 text-sm flex justify-between gap-2">
                <span><b>{s.to}</b> — {s.body.slice(0, 80)}</span>
                <span className="text-xs whitespace-nowrap">
                  {s.status} · {new Date(s.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

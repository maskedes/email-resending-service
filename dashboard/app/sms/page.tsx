'use client';
import { useEffect, useState } from 'react';

type Sms = { id: string; to: string; body: string; status: string; parts: number; created_at: string; sent_at?: string };
type Gateway = { id: string; name: string; phone_number?: string; is_online: boolean; last_seen_at?: string };

export default function SmsPage() {
  const [sms, setSms] = useState<Sms[]>([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [to, setTo] = useState(''); const [body, setBody] = useState(''); const [sending, setSending] = useState(false);
  const [gwName, setGwName] = useState(''); const [gwToken, setGwToken] = useState('');

  const load = async () => {
    try {
      const [a, b] = await Promise.all([fetch('/api/sms', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})), fetch('/api/sms/gateway/status', { cache: 'no-store' }).then(r => r.json()).catch(() => ({}))]);
      setSms(a.data || a || []); const gws = (b.data || b || []); setGateways(Array.isArray(gws) ? gws : []);
    } catch {}
  };
  useEffect(() => { load(); const id = setInterval(load, 5000); return () => clearInterval(id); }, []);

  const send = async () => {
    if (!to || !body) return;
    setSending(true);
    const r = await fetch('/api/sms/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, body }) });
    setSending(false);
    if (!r.ok) { alert((await r.json()).error?.message || 'Send failed'); return; }
    setBody(''); load();
  };
  const registerGw = async () => {
    const r = await fetch('/api/sms/gateway/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: gwName || 'Android gateway', phoneNumber: undefined }) });
    const j = await r.json();
    if (!r.ok) { alert(j.error?.message || 'Register failed'); return; }
    setGwToken(j.gatewayToken); load();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">SMS — via your Android phone</h1>
      <p className="text-sm text-muted-foreground">Your phone is the sender. Queue with the API; the gateway app delivers. No Twilio needed.</p>

      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Gateways</h2>
        {gateways.length === 0 ? <p className="text-sm text-muted-foreground">No gateways registered yet.</p> : <ul className="text-sm space-y-1">{gateways.map(g => <li key={g.id} className="flex justify-between border-b py-1"><span>{g.name} {g.phone_number ? `(${g.phone_number})` : ''}</span><span className={g.is_online ? 'text-green-600' : 'text-amber-600'}>{g.is_online ? 'online' : 'offline'} · {g.id.slice(0,8)}</span></li>)}</ul>}
        <div className="flex gap-2">
          <input placeholder="Gateway name (optional)" value={gwName} onChange={e=>setGwName(e.target.value)} className="border rounded px-3 py-1 text-sm flex-1" />
          <button onClick={registerGw} className="bg-primary text-primary-foreground rounded px-4 py-1 text-sm">Register &amp; get token</button>
        </div>
        {gwToken && <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm break-all"><b>Gateway token (copy to phone — shown only once):</b><br/><code>{gwToken}</code></div>}
        <p className="text-xs text-muted-foreground">Install <code>android-gateway/app/build/outputs/apk/debug/app-debug.apk</code> on the phone, paste the token + server URL, grant SMS permission, tap Start.</p>
      </section>

      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Send test SMS</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input placeholder="To (+2567...)" value={to} onChange={e=>setTo(e.target.value)} className="border rounded px-3 py-2 text-sm flex-1" />
        </div>
        <textarea placeholder="Message body (≤1600 chars)" value={body} onChange={e=>setBody(e.target.value)} maxLength={1600} rows={3} className="border rounded px-3 py-2 text-sm w-full" />
        <button onClick={send} disabled={sending} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm disabled:opacity-50">{sending ? 'Queuing…' : 'Queue SMS'}</button>
      </section>

      <section className="border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Recent messages</h2>
        {sms.length === 0 ? <p className="text-sm text-muted-foreground">No messages yet.</p> : <div className="space-y-2">{(Array.isArray(sms)?sms:[]).slice(0,50).map(s=> <div key={s.id} className="border rounded p-2 text-sm flex justify-between gap-2"><span><b>{s.to}</b> — {s.body.slice(0,80)}</span><span className="text-xs whitespace-nowrap">{s.status} · {new Date(s.created_at).toLocaleString()}</span></div>)}</div>}
      </section>
    </div>
  );
}

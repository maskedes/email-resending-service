const fs = require('fs');
const env = fs.readFileSync('dashboard/.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1];
const URL = get('NEXT_PUBLIC_SUPABASE_URL');
const ANON = get('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const TABLES = ['emails', 'api_keys', 'sites', 'links', 'link_logs', 'domains', 'templates', 'webhooks', 'email_events', 'profiles', 'user_preferences', 'sms_messages', 'sms_gateways'];

(async () => {
  console.log('Probing', URL);
  for (const t of TABLES) {
    try {
      const r = await fetch(`${URL}/rest/v1/${t}?select=*&limit=2`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
      const j = r.status === 200 ? await r.json() : await r.json().catch(() => null);
      const rows = r.status === 200 && Array.isArray(j) ? j.length : 0;
      const msg = j && j.message ? String(j.message).slice(0, 90) : null;
      const hint = j && j.hint ? String(j.hint).slice(0, 60) : null;
      console.log(`${t}: HTTP ${r.status} rows=${rows}${msg ? ' | ' + msg + (hint ? ' | ' + hint : '') : ''}`);
    } catch (e) {
      console.log(`${t}: ERROR ${e.message}`);
    }
  }
})();

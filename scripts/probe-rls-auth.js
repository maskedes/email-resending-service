const fs = require('fs');
const env = fs.readFileSync('dashboard/.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1];
const URL = get('NEXT_PUBLIC_SUPABASE_URL');
const ANON = get('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const email = `rls-probe-${Date.now()}@example.com`;
const password = 'RlsProbe#2026x';

async function main() {
  // 1. Sign up a probe account
  const su = await fetch(`${URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const sj = await su.json().catch(() => null);
  const token = sj && sj.access_token;
  console.log('signup:', su.status, sj && sj.user ? 'user created' + (sj.user.email_confirmed_at ? ' (confirmed)' : ' (needs confirmation)') : JSON.stringify(sj).slice(0, 200));

  if (!token) return console.log('No token — signup blocked or needs confirmation.');

  const H = { apikey: ANON, Authorization: `Bearer ${token}` };

  // 2. What can the probe account see?
  for (const t of ['emails', 'api_keys', 'sites', 'links', 'domains', 'templates', 'webhooks']) {
    const r = await fetch(`${URL}/rest/v1/${t}?select=*&limit=5`, { headers: H });
    const rows = r.status === 200 ? await r.json() : null;
    console.log(`${t}: HTTP ${r.status} rows=${Array.isArray(rows) ? rows.length : '?'}${Array.isArray(rows) && rows.length ? ' sample=' + JSON.stringify(rows[0]).slice(0, 90) : ''}`);
  }

  // 3. Can it EDIT someone else's rows? (try renaming one of your api keys)
  const mine = await fetch(`${URL}/rest/v1/api_keys?select=id&limit=5`, { headers: H });
  const allMine = mine.status === 200 ? await mine.json() : [];
  if (allMine.length > 0) {
    const other = allMine.find((k) => k.id !== allMine[0].id) || allMine[0];
    const up = await fetch(`${URL}/rest/v1/api_keys?id=eq.${other.id}`, {
      method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'HACKED-PROBE' }),
    });
    const ures = await up.json().catch(() => null);
    console.log(`patch other's api_key: HTTP ${up.status} updated=${Array.isArray(ures) ? ures.length : sessionStorage}(h)`);
  }

  // 4. Can it READ another user's emails?
  const em = await fetch(`${URL}/rest/v1/emails?select=id,to_email,subject&limit=5`, { headers: H });
  const ems = em.status === 200 ? await em.json() : null;
  console.log(`emails: HTTP ${em.status} rows=${Array.isArray(ems) ? ems.length : '?'}`);
}

main().catch((e) => console.log('ERR', e.message));

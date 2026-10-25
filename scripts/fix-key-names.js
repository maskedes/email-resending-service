const fs = require('fs');
const env = fs.readFileSync('dashboard/.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1];
const URL = get('NEXT_PUBLIC_SUPABASE_URL');
const KEY = get('SUPABASE_SERVICE_ROLE_KEY');
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const ORIGINAL = {
  '74202ba4-0d0d-4c82-b53a-8c6281dbfb34': 'eeee',
  '074a7660-07f5-4e06-89c4-06940e6aae64': 'load60',
  'eefc35db-27e7-4d35-babb-962cab5552a5': 'enf-test',
  'e2f4b008-b8ae-458f-88b0-1bb33cfac924': 'delivery-test',
};

(async () => {
  const r = await fetch(`${URL}/rest/v1/api_keys?select=id,name,user_id`, { headers: H });
  const keys = await r.json();
  for (const k of keys) {
    const orig = ORIGINAL[k.id];
    if (k.user_id?.startsWith('10423c76') && orig && k.name !== orig) {
      const p = await fetch(`${URL}/rest/v1/api_keys?id=eq.${k.id}`, {
        method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orig }),
      });
      console.log(`restored ${k.id}: '${k.name}' -> '${orig}' (HTTP ${p.status})`);
    } else {
      console.log(`${k.id} name='${k.name}' ok`);
    }
  }
  // Also confirm the throwaway probe user row / any rows it created
  const t = await fetch(`${URL}/rest/v1/emails?select=id,api_key_id&limit=200`, { headers: H });
  const ems = await t.json();
  const eefc = ems.filter((e) => e.api_key_id === 'eefc35db-27e7-4d35-babb-962cab5552a5').length;
  console.log('emails on eefc35db (enf-test):', eefc);
})();

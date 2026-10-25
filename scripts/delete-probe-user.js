const fs = require('fs');
const env = fs.readFileSync('dashboard/.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1];
const URL = get('NEXT_PUBLIC_SUPABASE_URL');
const KEY = get('SUPABASE_SERVICE_ROLE_KEY');
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

(async () => {
  // Find probe users by email pattern
  const r = await fetch(`${URL}/auth/v1/admin/users?per_page=50&email=rls-probe-`, { headers: H });
  const j = await r.json();
  const users = (j.users || []).filter((u) => (u.email || '').startsWith('rls-probe-'));
  console.log('probe users found:', users.length);
  for (const u of users) {
    const d = await fetch(`${URL}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: H });
    console.log(`deleted ${u.id} (${u.email}): HTTP ${d.status}`);
  }
})();

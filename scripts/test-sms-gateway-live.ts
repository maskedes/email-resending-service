/**
 * Quick live test: starts the backend in-process (embedded PG+Redis)
 * and runs the full SMS gateway flow end-to-end (register → send → poll → report).
 * No real phone or Supabase needed. Run with:
 *   npx ts-node --compiler-options "{\"module\":\"commonjs\"}" scripts/test-sms-gateway-live.ts
 * Env: set USE_EMBEDDED=true (default). No SUPABASE_* required — we stub it.
 */
import { createHmac, randomBytes } from 'crypto';

process.env.USE_EMBEDDED = 'true';
process.env.SMS_GATEWAY_TOKEN_SECRET = process.env.SMS_GATEWAY_TOKEN_SECRET || 'test-secret-for-live-run';
process.env.SMS_GATEWAY_POLL_TIMEOUT_MS = '2000';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://dummy.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

async function boot() {
  const db = await import('../src/database/db');
  await db.initDatabase();
  console.log('[test] DB ready');

  // Build a tiny Supabase-like shim over PG for the SMS tables + api_keys
  const pool: import('pg').Pool = (db as unknown as { getPool: () => import('pg').Pool }).getPool();
  type Row = Record<string, unknown>;

  const makeShim = () => {
    const from = (table: string) => {
      let where: Array<{ col: string; op: string; val: unknown }> = [];
      let updatePayload: Row | null = null;
      let insertPayload: Row | Row[] | null = null;
      let orderCol: string | null = null;
      let orderAsc = true;
      let rangeFrom: number | null = null;
      let rangeTo: number | null = null;
      let limitN: number | null = null;
      let orExpr: string | null = null;

      const api: Record<string, unknown> = {
        select: (_cols?: string) => api,
        insert: (payload: Row | Row[]) => { insertPayload = payload; return api; },
        update: (payload: Row) => { updatePayload = payload; return api; },
        delete: () => api,
        eq: (col: string, val: unknown) => { where.push({ col, op: '=', val }); return api; },
        in: (col: string, vals: unknown[]) => { where.push({ col, op: 'IN', val: vals }); return api; },
        or: (expr: string) => { orExpr = expr; return api; },
        order: (col: string, opts?: { ascending?: boolean }) => { orderCol = col; orderAsc = opts?.ascending ?? true; return api; },
        range: (a: number, b: number) => { rangeFrom = a; rangeTo = b; return api; },
        limit: (n: number) => { limitN = n; return api; },
        single: async () => {
          if (insertPayload) {
            const rows2 = Array.isArray(insertPayload) ? insertPayload : [insertPayload];
            const results: Row[] = [];
            for (const payload of rows2) {
              const cols = Object.keys(payload);
              const vals = Object.values(payload);
              const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
              const { rows } = await pool.query(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${ph}) RETURNING *`, vals);
              results.push(rows[0]);
            }
            return { data: results[0] || null, error: null };
          }
          if (updatePayload) {
            const setCols = Object.keys(updatePayload);
            const setVals: unknown[] = Object.values(updatePayload);
            const setExpr = setCols.map((c, i) => `${c} = $${i + 1}`).join(', ');
            const whereClauses = where.map((w, i) => w.op === 'IN' ? `${w.col} IN (${(w.val as unknown[]).map((_, j) => `$${setCols.length + i * 10 + j + 1}`).join(', ')})` : `${w.col} = $${setCols.length + i + 1}`).join(' AND ');
            // Flatten IN vals
            const flatWhere: unknown[] = [];
            for (const w of where) {
              if (w.op === 'IN') flatWhere.push(...(w.val as unknown[]));
              else flatWhere.push(w.val);
            }
            const vals = [...setVals, ...flatWhere];
            const sql = `UPDATE ${table} SET ${setExpr} ${whereClauses ? `WHERE ${whereClauses}` : ''} RETURNING *`;
            const { rows } = await pool.query(sql, vals);
            return { data: rows[0] || null, error: null };
          }
          // DELETE path used by apiKeyService (not hit in this test but supported)
          if ((api as { _isDelete?: boolean })._isDelete) {
            const whereClauses2 = where.map((w, i) => `${w.col} = $${i + 1}`).join(' AND ');
            const vals2 = where.map(w => w.val);
            const del = await pool.query(`DELETE FROM ${table} ${whereClauses2 ? `WHERE ${whereClauses2}` : ''}`, vals2);
            return { data: null, error: del.rowCount != null ? null : null } as unknown as { data: Row | null; error: null };
          }
          // SELECT single
          const whereClauses = where.map((w, i) => `${w.col} = $${i + 1}`).join(' AND ');
          const vals = where.map(w => w.val);
          const order = orderCol ? ` ORDER BY ${orderCol} ${orderAsc ? 'ASC' : 'DESC'}` : '';
          const sql2 = `SELECT * FROM ${table} ${whereClauses ? `WHERE ${whereClauses}` : ''}${order} LIMIT 1`;
          const { rows } = await pool.query(sql2, vals);
          return { data: rows[0] || null, error: null };
        },
      };

      // Make the builder thenable so `await sb.from(...).select(...).eq(...).order(...).range(...)` works
      const proxy = new Proxy(api, {
        get(target, prop) {
          if (prop === 'then') {
            return (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
              (async () => {
                try {
                  if (insertPayload) {
                    const rows2 = Array.isArray(insertPayload) ? insertPayload : [insertPayload];
                    const all: Row[] = [];
                    for (const payload of rows2) {
                      const cols = Object.keys(payload);
                      const vals = Object.values(payload);
                      const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
                      const { rows } = await pool.query(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${ph}) RETURNING *`, vals);
                      all.push(rows[0]);
                    }
                    resolve({ data: all, error: null });
                    return;
                  }
                  if (updatePayload) {
                    const setCols = Object.keys(updatePayload);
                    const setVals: unknown[] = Object.values(updatePayload);
                    const setExpr = setCols.map((c, i) => `${c} = $${i + 1}`).join(', ');
                    const where2 = where.map((w, i) => `${w.col} = $${setCols.length + i + 1}`).join(' AND ');
                    const vals = [...setVals, ...where.map(w => w.val)];
                    const { rows } = await pool.query(`UPDATE ${table} SET ${setExpr} ${where2 ? `WHERE ${where2}` : ''} RETURNING *`, vals);
                    resolve({ data: rows, error: null });
                    return;
                  }
                  if ((target as Record<string, unknown>)._isDelete === true) {
                    const whereClauses = where.map((w, i) => `${w.col} = $${i + 1}`).join(' AND ');
                    const vals = where.map(w => w.val);
                    await pool.query(`DELETE FROM ${table} ${whereClauses ? `WHERE ${whereClauses}` : ''}`, vals);
                    resolve({ data: null, error: null });
                    return;
                  }
                  // Regular select
                  let sqlWhere = '';
                  const vals: unknown[] = [];
                  let idx = 1;
                  if (where.length > 0) {
                    sqlWhere = ` WHERE ${where.map(w => `${w.col} = $${idx++}`).join(' AND ')}`;
                    vals.push(...where.map(w => w.val));
                  }
                  // Best-effort OR: if caller used .or(), ignore it and just use eq filters (gateway jobs handles claiming via PG anyway)
                  const order = orderCol ? ` ORDER BY ${orderCol} ${orderAsc ? 'ASC' : 'DESC'}` : '';
                  let lim = '';
                  if (rangeFrom !== null && rangeTo !== null) lim = ` OFFSET ${rangeFrom} LIMIT ${rangeTo - rangeFrom + 1}`;
                  else if (limitN !== null) lim = ` LIMIT ${limitN}`;
                  const sql = `SELECT * FROM ${table}${sqlWhere}${order}${lim}`;
                  const { rows } = await pool.query(sql, vals);
                  resolve({ data: rows, error: null });
                } catch (e) { reject(e); }
              })();
            };
          }
          if (prop === 'delete') {
            return () => { (target as Record<string, unknown>)._isDelete = true; return proxy; };
          }
          return (target as Record<string, unknown>)[prop as string];
        },
      });
      return proxy as unknown as { select: (c?: string) => unknown; insert: (p: Row) => unknown; update: (p: Row) => unknown; delete: () => unknown; eq: (c: string, v: unknown) => unknown; in: (c: string, v: unknown[]) => unknown; or: (e: string) => unknown; order: (c: string, o?: unknown) => unknown; range: (a: number, b: number) => unknown; limit: (n: number) => unknown; single: () => Promise<{ data: Row | null; error: unknown }> };
    };
    return { from } as unknown as ReturnType<typeof import('../src/database/supabase').getSupabase>;
  };

  const shim = makeShim();
  // Patch before importing anything that uses getSupabase
  const supa = await import('../src/database/supabase');
  (supa as unknown as { getSupabase: unknown }).getSupabase = () => shim;

  // Now import app
  const appMod = await import('../src/index');
  const app: import('express').Express = (appMod as unknown as { default: import('express').Express }).default;

  const server = await new Promise<import('http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const addr = server.address() as import('net').AddressInfo;
  const base = `http://127.0.0.1:${addr.port}`;
  console.log(`[test] Server @ ${base}`);

  const fetchJson = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const r = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    return { status: r.status, data };
  };

  // 0) Create a real PG api_key row (bypass bcrypt by inserting a known hash we can auth with)
  // Easier: use the HTTP create route, then read back the raw key for auth.
  // But the create route uses Supabase shim too — so it will work.

  console.log('[test] Creating API key via POST /api/apikeys ...');
  let apiKey: string;
  {
    const { status, data } = await fetchJson('POST', '/api/apikeys', { name: 'sms-test-key', email: 'test@example.com' });
    if (status !== 201 || !(data as { key?: string }).key) {
      console.error('Failed to create API key:', status, data);
      server.close(); process.exit(1);
    }
    apiKey = (data as { key: string }).key;
    console.log(`[test] API key: ${apiKey.slice(0, 8)}...`);
  }

  // 1) Register gateway (requires x-api-key)
  console.log('[test] Registering SMS gateway ...');
  const { status: regStatus, data: regData } = await fetchJson('POST', '/api/sms/gateway/register', { name: 'Test Phone' }, { 'x-api-key': apiKey });
  if (regStatus !== 201) { console.error('Register failed', regStatus, regData); server.close(); process.exit(1); }
  const gatewayId = (regData as { gateway: { id: string } }).gateway.id;
  const gatewayToken = (regData as { gatewayToken: string }).gatewayToken;
  console.log(`[test] Gateway ${gatewayId} token ${gatewayToken.slice(0, 10)}...`);

  // 2) Queue an SMS
  console.log('[test] POST /api/sms/send ...');
  const { status: sendStatus, data: sendData } = await fetchJson('POST', '/api/sms/send', { to: '+14155550199', body: 'Hello from live gateway test' }, { 'x-api-key': apiKey });
  if (sendStatus !== 200) { console.error('Send failed', sendStatus, sendData); server.close(); process.exit(1); }
  const smsId = (sendData as { id: string }).id;
  console.log(`[test] SMS queued id=${smsId} status=${(sendData as { status: string }).status}`);

  // Small delay so BullMQ enqueues and gateway poll can see it
  await new Promise(r => setTimeout(r, 800));

  // 3) Gateway polls jobs (long-poll returns quickly because we have a queued SMS)
  console.log('[test] GET /api/sms/gateway/jobs (phone poll) ...');
  {
    const r = await fetch(`${base}/api/sms/gateway/jobs`, { headers: { 'x-gateway-token': gatewayToken } });
    const data = await r.json().catch(() => ({}));
    console.log(`[test] Jobs status=${r.status} data=`, JSON.stringify(data).slice(0, 500));
    if (r.status !== 200 || !(data as { jobs?: unknown[] }).jobs?.length) {
      console.error('No jobs returned — poll failed');
      server.close(); process.exit(1);
    }
    const job = (data as { jobs: Array<{ id: string; to: string; body: string }> }).jobs[0];
    if (job.id !== smsId) console.warn(`[test] WARN job.id ${job.id} != smsId ${smsId} (may be race)`);

    // 4) Phone reports sent
    console.log('[test] POST /api/sms/gateway/result {sent} ...');
    const { status: resStatus, data: resData } = await fetchJson('POST', '/api/sms/gateway/result', { smsId: job.id, status: 'sent' }, { 'x-gateway-token': gatewayToken });
    console.log(`[test] Result status=${resStatus}`, resData as unknown);
    if (resStatus !== 200) { console.error('Result failed'); server.close(); process.exit(1); }

    // 5) Report delivered
    await new Promise(r => setTimeout(r, 200));
    const { status: delStatus } = await fetchJson('POST', '/api/sms/gateway/result', { smsId: job.id, status: 'delivered' }, { 'x-gateway-token': gatewayToken });
    console.log(`[test] Delivered status=${delStatus}`);
  }

  // 6) Confirm SMS is now delivered
  await new Promise(r => setTimeout(r, 300));
  {
    const r = await fetch(`${base}/api/sms/${smsId}`, { headers: { 'x-api-key': apiKey } });
    const data = await r.json().catch(() => ({}));
    console.log(`[test] GET /api/sms/${smsId} → status=${r.status}`, `sms.status=${(data as { status?: string }).status}`, `events=${JSON.stringify((data as { events?: unknown[] }).events)}`.slice(0, 500));
    if (r.status !== 200 || (data as { status: string }).status !== 'delivered') {
      console.error('Final status not delivered');
      server.close(); process.exit(1);
    }
  }

  // 7) Auth negative: invalid phone
  {
    const { status, data } = await fetchJson('POST', '/api/sms/send', { to: 'not-a-phone', body: 'hi' }, { 'x-api-key': apiKey });
    console.log(`[test] Invalid phone status=${status} (expect 400)`, data as unknown);
    if (status !== 400) { console.error('Should have been 400'); server.close(); process.exit(1); }
  }
  // 8) Invalid gateway token should 401
  {
    const r = await fetch(`${base}/api/sms/gateway/jobs`, { headers: { 'x-gateway-token': 'gw_invalid' } });
    console.log(`[test] Invalid gateway token status=${r.status} (expect 401)`);
    if (r.status !== 401) { console.error('Should have been 401'); server.close(); process.exit(1); }
  }

  console.log('\n✅ SMS gateway live test PASSED');
  server.close();
  setTimeout(() => process.exit(0), 500);
}

boot().catch(e => { console.error(e); process.exit(1); });

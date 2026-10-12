#!/usr/bin/env ts-node
/**
 * End-to-end test of the Android SMS gateway WITHOUT a real phone.
 * Boots the real Express app in-process (embedded PG + Redis), then
 * simulates the phone: register → send → gateway polls → reports.
 *
 * Run:  npx ts-node scripts/test-android-gateway.ts
 * Env:  SUPABASE_* not needed — bypassed; uses local PG for SMS tables.
 *       Set USE_EMBEDDED=true (default) so no external DB is required.
 */
import fetch from 'node-fetch' as unknown as typeof globalThis.fetch;

async function main() {
  process.env.USE_EMBEDDED = 'true';
  // Supabase client is lazy — give it dummy values so smsService doesn't explode
  // on other paths, but we actually use PG pool directly in tests.
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://dummy.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJdummy';

  // Patch supabase to use PG pool for sms tests so we don't need a real Supabase
  const dbMod = await import('../src/database/db');
  const supabaseMod = await import('../src/database/supabase');
  // Monkey-patch getSupabase to return a minimal in-memory-ish adapter that delegates to PG
  // Instead: we stub the sms flows to use PG directly — easiest: mock the module before importing services
  // To keep it simple, we import services AFTER boot and let them talk to PG via a tiny supabase shim.

  // Minimal shim: intercept supabase import
  // We do this by setting up a fake client that proxies to PG
  const { getPool } = dbMod as any;
  const fakeSupabase = () => {
    const pool = getPool();
    const makeBuilder = (table: string) => {
      let filters: Array<{ col: string; val: unknown }> = [];
      let updatePayload: Record<string, unknown> | null = null;
      let insertPayload: Record<string, unknown> | null = null;
      let orderCol: string | null = null;
      let orderAsc = true;
      let rangeFrom: number | null = null;
      let rangeTo: number | null = null;
      const api: any = {
        select: (_cols = '*') => api,
        insert: (payload: Record<string, unknown>) => { insertPayload = payload; return api; },
        update: (payload: Record<string, unknown>) => { updatePayload = payload; return api; },
        eq: (col: string, val: unknown) => { filters.push({ col, val }); return api; },
        or: (_expr: string) => api,
        order: (col: string, opts?: { ascending?: boolean }) => { orderCol = col; orderAsc = opts?.ascending ?? true; return api; },
        range: (from: number, to: number) => { rangeFrom = from; rangeTo = to; return api; },
        limit: (n: number) => { rangeFrom = 0; rangeTo = n - 1; return api; },
        single: async () => {
          if (insertPayload) {
            const cols = Object.keys(insertPayload);
            const vals = Object.values(insertPayload);
            const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
            const { rows } = await pool.query(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`, vals);
            return { data: rows[0] || null, error: null };
          }
          if (updatePayload) {
            const setCols = Object.keys(updatePayload);
            const setVals = Object.values(updatePayload);
            const setExpr = setCols.map((c, i) => `${c} = $${i + 1}`).join(', ');
            const where = filters.map((f, i) => `${f.col} = $${setCols.length + i + 1}`).join(' AND ');
            const vals = [...setVals, ...filters.map(f => f.val)];
            const { rows } = await pool.query(`UPDATE ${table} SET ${setExpr} ${where ? `WHERE ${where}` : ''} RETURNING *`, vals);
            return { data: rows[0] || null, error: null };
          }
          const where = filters.map((f, i) => `${f.col} = $${i + 1}`).join(' AND ');
          const vals = filters.map(f => f.val);
          const order = orderCol ? ` ORDER BY ${orderCol} ${orderAsc ? 'ASC' : 'DESC'}` : '';
          const sql = `SELECT * FROM ${table} ${where ? `WHERE ${where}` : ''}${order} LIMIT 1`;
          const { rows } = await pool.query(sql, vals);
          return { data: rows[0] || null, error: null };
        },
        then: undefined as unknown,
      };
      // Make builder thenable so `await sb.from(...).select(...).eq(...).order(...).range(...)` works
      const thenable = new Proxy(api, {
        get(target, prop) {
          if (prop === 'then') {
            return (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
              (async () => {
                try {
                  if (insertPayload) {
                    const cols = Object.keys(insertPayload!);
                    const vals = Object.values(insertPayload!);
                    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
                    const { rows } = await pool.query(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`, vals);
                    resolve({ data: rows, error: null });
                  } else if (updatePayload) {
                    const setCols = Object.keys(updatePayload!);
                    const setVals = Object.values(updatePayload!);
                    const setExpr = setCols.map((c, i) => `${c} = $${i + 1}`).join(', ');
                    const where = filters.map((f, i) => `${f.col} = $${setCols.length + i + 1}`).join(' AND ');
                    const vals = [...setVals, ...filters.map(f => f.val)];
                    const { rows } = await pool.query(`UPDATE ${table} SET ${setExpr} ${where ? `WHERE ${where}` : ''} RETURNING *`, vals);
                    resolve({ data: rows, error: null });
                  } else {
                    const where = filters.map((f, i) => `${f.col} = $${i + 1}`).join(' AND ');
                    const vals = filters.map(f => f.val);
                    const order = orderCol ? ` ORDER BY ${orderCol} ${orderAsc ? 'ASC' : 'DESC'}` : '';
                    const rangeSql = rangeFrom !== null ? ` OFFSET ${rangeFrom} LIMIT ${rangeTo! - rangeFrom! + 1}` : '';
                    const sql = `SELECT * FROM ${table} ${where ? `WHERE ${where}` : ''}${order}${rangeSql}`;
                    const { rows } = await pool.query(sql, vals);
                    resolve({ data: rows, error: null });
                  }
                } catch (e) { reject(e); }
              })();
            };
          }
          return (target as Record<string, unknown>)[prop as string];
        },
      });
      return thenable;
    };
    return { from: (table: string) => makeBuilder(table) } as unknown as ReturnType<typeof supabaseMod.getSupabase>;
  };

  // Boot DB before hijacking
  const { initDatabase } = dbMod as any;
  await initDatabase();
  // Hijack getSupabase for all later imports
  (supabaseMod as { getSupabase: unknown }).getSupabase = fakeSupabase;
}

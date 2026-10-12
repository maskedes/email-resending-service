/**
 * Minimal Android gateway test — no phone, no Supabase, uses embedded PG.
 * Run:  node scripts/test-sms-gateway-simple.js
 * (built JS can import TS via ts-node/transpile-only for src/database/db)
 */
process.env.USE_EMBEDDED = 'true';
process.env.SMS_GATEWAY_TOKEN_SECRET = 'test-secret-simple';

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'commonjs', moduleResolution: 'node', esModuleInterop: true, target: 'ES2020' },
});

async function main() {
  const { initDatabase, getPool } = require('../src/database/db');
  await initDatabase();
  const pool = getPool();
  console.log('[test] DB ready');

  const smsSvc = require('../src/services/smsService');
  const gwSvc = require('../src/services/smsGatewayService');

  console.log('\n[1] SMS helpers');
  const cases = [
    ['+14155550199', true],
    ['14155550199', true],
    ['(415) 555-0199', true],
    ['not-a-phone', false],
    ['123', false],
  ];
  for (const [p, exp] of cases) {
    const ok = smsSvc.isValidPhone(p);
    console.log(`  isValidPhone(${JSON.stringify(p)}) = ${ok} (expect ${exp}) ${ok === exp ? '✓' : '✗'}`);
    if (ok !== exp) process.exit(1);
  }
  console.log(`  normalizePhone("(415) 555-0199") = ${smsSvc.normalizePhone('(415) 555-0199')}`);
  console.log(`  smsParts("hello")=${smsSvc.smsParts('hello')} (expect 1)`);
  console.log(`  smsParts("a".repeat(200))=${smsSvc.smsParts('a'.repeat(200))} (expect 2)`);
  if (smsSvc.smsParts('hello') !== 1 || smsSvc.smsParts('a'.repeat(200)) !== 2) {
    console.error('smsParts failed'); process.exit(1);
  }

  console.log('\n[2] Create gateway');
  const { v4: uuidv4 } = require('uuid');
  const fakeKeyId = uuidv4();
  await pool.query('INSERT INTO api_keys (id, key, name, email, is_active) VALUES ($1,$2,$3,$4,true)', [fakeKeyId, 'hashed_dummy', 'test-key', 'test@example.com']);
  console.log(`  api_key ${fakeKeyId}`);

  const { gateway, rawToken } = await gwSvc.createGateway({ apiKeyId: fakeKeyId, name: 'Test Phone', phoneNumber: '+14155550199' });
  console.log(`  gateway id=${gateway.id} token=${rawToken.slice(0, 12)}...`);

  const verified = await gwSvc.verifyGatewayToken(rawToken);
  if (!verified || verified.id !== gateway.id) { console.error('verify failed'); process.exit(1); }
  console.log('  verifyGatewayToken ✓');
  const bad = await gwSvc.verifyGatewayToken('gw_invalid');
  if (bad) { console.error('bad token should be null'); process.exit(1); }
  console.log('  bad token correctly rejected ✓');
  await gwSvc.touchGatewayHeartbeat(gateway.id);
  const list = await gwSvc.listGateways(fakeKeyId);
  console.log(`  listGateways → ${list.length} gateway(s), first online=${list[0]?.is_online}`);

  console.log('\n[3] Simulate SMS queue → phone poll → report');
  const smsId = uuidv4();
  await pool.query('INSERT INTO sms_messages (id, api_key_id, gateway_id, to_phone, body, parts, status) VALUES ($1,$2,$3,$4,$5,$6,\'queued\')', [smsId, fakeKeyId, null, '+14155550199', 'Hello from gateway test', 1]);
  await pool.query('INSERT INTO sms_events (sms_id, event, details) VALUES ($1,\'queued\',\'test\')', [smsId]);
  console.log(`  inserted sms ${smsId} status=queued`);

  {
    const { rows } = await pool.query('SELECT * FROM sms_messages WHERE status=\'queued\' AND (gateway_id IS NULL OR gateway_id=$1) ORDER BY created_at LIMIT 5', [gateway.id]);
    console.log(`  poll found ${rows.length} job(s)`);
    if (rows.length === 0) { console.error('poll should have found 1'); process.exit(1); }
    await pool.query('UPDATE sms_messages SET gateway_id=$1 WHERE id=$2 AND gateway_id IS NULL', [gateway.id, smsId]);
    console.log('  phone claimed job ✓');
  }
  await pool.query('UPDATE sms_messages SET status=\'sent\', sent_at=now() WHERE id=$1', [smsId]);
  await pool.query('INSERT INTO sms_events (sms_id, event, details) VALUES ($1,\'sent\',\'via gateway\')', [smsId]);
  console.log('  phone reported sent ✓');
  await pool.query('UPDATE sms_messages SET status=\'delivered\', delivered_at=now() WHERE id=$1', [smsId]);
  await pool.query('INSERT INTO sms_events (sms_id, event, details) VALUES ($1,\'delivered\',\'confirm\')', [smsId]);
  console.log('  phone reported delivered ✓');
  const { rows: finalRows } = await pool.query('SELECT status FROM sms_messages WHERE id=$1', [smsId]);
  console.log(`  final status=${finalRows[0].status} (expect delivered) ${finalRows[0].status === 'delivered' ? '✓' : '✗'}`);
  if (finalRows[0].status !== 'delivered') process.exit(1);
  const { rows: events } = await pool.query('SELECT event FROM sms_events WHERE sms_id=$1 ORDER BY timestamp', [smsId]);
  console.log(`  events: ${events.map(r => r.event).join(' → ')}`);

  await pool.query('DELETE FROM sms_events WHERE sms_id=$1', [smsId]);
  await pool.query('DELETE FROM sms_messages WHERE id=$1', [smsId]);
  await gwSvc.deleteGateway(gateway.id);
  await pool.query('DELETE FROM api_keys WHERE id=$1', [fakeKeyId]);
  console.log('\n✅ Android gateway test PASSED (no real phone needed)');
  console.log('\nNext with a real phone + Supabase:');
  console.log('  curl -X POST http://localhost:3000/api/sms/gateway/register -H "x-api-key: fms_..." -d \'{"name":"My Redmi"}\'');
  console.log('  → paste gatewayToken into android-gateway app → Start → POST /api/sms/send');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

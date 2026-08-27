/**
 * Local integration test for the webhook dispatch pipeline.
 *
 * This exercises the REAL `dispatchWebhooks` code in
 * `src/services/webhookService.ts` against:
 *   1. An in-memory mock of the Supabase client (so no live DB / credentials /
 *      realtime-WebSocket issues are involved) that returns a fixture email and
 *      one active subscribed webhook.
 *   2. A real local webhook receiver that verifies the HMAC-SHA256 signature of
 *      the actual HTTP POST the service makes.
 *
 * Proves: given an email + an active subscribed webhook, the service signs the
 * payload, POSTs it with the right headers, and records `last_triggered_at`.
 */
import http from 'http';
import { createHmac } from 'crypto';

const SECRET = 'whsec_' + 'a'.repeat(48);
const EMAIL_ID = '11111111-1111-1111-1111-111111111111';
const API_KEY_ID = '22222222-2222-2222-2222-222222222222';
const WEBHOOK_ID = '33333333-3333-3333-3333-333333333333';
const RECEIVER_PATH = '/hook';

let received: {
  body: any;
  signature: string;
  event: string | null;
  id: string | null;
  raw: string;
} | null = null;

let lastTriggeredPatchSeen = false;

// --- Fixture rows returned by the mock Supabase client -------------------
const EMAIL_ROW = {
  id: EMAIL_ID,
  api_key_id: API_KEY_ID,
  from_email: 'sender@example.com',
  from_name: 'E-NVOY',
  to_email: 'receiver@example.com',
  subject: 'Test Subject',
  status: 'sent',
};

const WEBHOOK_ROW = {
  id: WEBHOOK_ID,
  url: '', // set once the receiver port is known
  secret: SECRET,
  events: 'queued,sent,delivered,bounced,failed',
};

// --- Minimal thenable query builder mocking the Supabase JS chain --------
class QB {
  table: string;
  patch: any = null;
  constructor(table: string) {
    this.table = table;
  }
  select(_cols?: string) {
    return this;
  }
  eq(_col?: string, _val?: any) {
    return this;
  }
  order() {
    return this;
  }
  single() {
    return this;
  }
  update(patch: any) {
    this.patch = patch;
    return this;
  }
  insert(_row: any) {
    return this;
  }
  delete() {
    return this;
  }
  then(resolve: any) {
    if (this.table === 'emails') return resolve({ data: EMAIL_ROW, error: null });
    if (this.table === 'webhooks') {
      if (this.patch) {
        lastTriggeredPatchSeen = true;
        return resolve({ data: null, error: null });
      }
      return resolve({ data: [WEBHOOK_ROW], error: null });
    }
    return resolve({ data: null, error: null });
  }
}

function makeMockClient() {
  return {
    from(table: string) {
      return new QB(table);
    },
  };
}

// --- Local webhook receiver (the real POST target) ------------------------
let receiverPort = 0;

function startReceiver(): Promise<{ port: number; close: () => void }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end();
        return;
      }
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        const signature = (req.headers['x-webhook-signature'] as string) || '';
        const event = (req.headers['x-webhook-event'] as string) || null;
        const id = (req.headers['x-webhook-id'] as string) || null;
        let body: any = null;
        try {
          body = JSON.parse(raw);
        } catch {
          /* ignore */
        }
        received = { body, signature, event, id, raw };
        res.statusCode = 200;
        res.end('ok');
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      receiverPort = port;
      resolve({ port, close: () => server.close() });
    });
  });
}

async function main() {
  const receiver = await startReceiver();
  receiverPort = receiver.port;
  WEBHOOK_ROW.url = `http://127.0.0.1:${receiverPort}${RECEIVER_PATH}`;

  // Patch the Supabase client BEFORE webhookService is required so its
  // transitive `getSupabase()` uses our in-memory mock instead of a real
  // (realtime-WebSocket) client.
  const sbJs = require('@supabase/supabase-js');
  sbJs.createClient = () => makeMockClient();

  // Require AFTER patching so the cached @supabase/supabase-js module already
  // carries our patched createClient.
  const { dispatchWebhooks } = require('../src/services/webhookService');

  // getSupabase() guards on these env vars being present (values irrelevant).
  process.env.SUPABASE_URL = 'http://mock.local';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy';

  await dispatchWebhooks(EMAIL_ID, 'sent', 'Message ID: test-123');
  await new Promise((r) => setTimeout(r, 300));

  let ok = true;
  const fail = (msg: string) => {
    ok = false;
    console.error('  x ' + msg);
  };

  if (!received) {
    fail('No webhook POST was received by the receiver.');
  } else {
    if (received!.event !== 'sent') fail(`X-Webhook-Event expected "sent" got "${received!.event}"`);
    if (received!.id !== WEBHOOK_ID) fail(`X-Webhook-Id expected ${WEBHOOK_ID} got "${received!.id}"`);
    if (!received!.signature.startsWith('sha256=')) fail('X-Webhook-Signature malformed');

    const expected =
      'sha256=' + createHmac('sha256', SECRET).update(received!.raw, 'utf8').digest('hex');
    if (received!.signature !== expected) fail('HMAC signature does NOT verify against the secret');

    const p = received!.body;
    if (!p || p.event !== 'sent') fail('Payload event mismatch');
    if (!p.data || p.data.email_id !== EMAIL_ID) fail('Payload data.email_id mismatch');
    if (p.data.to !== 'receiver@example.com') fail('Payload data.to mismatch');
    if (p.data.status !== 'sent') fail('Payload data.status mismatch');
    if (p.data.details !== 'Message ID: test-123') fail('Payload data.details mismatch');
  }

  if (!lastTriggeredPatchSeen) fail('last_triggered_at was not updated after successful delivery');

  receiver.close();

  if (ok) {
    console.log('\nWEBHOOK DISPATCH INTEGRATION TEST PASSED');
    console.log('   - signed POST delivered with correct headers');
    console.log('   - HMAC-SHA256 signature verified against secret');
    console.log('   - payload shape correct');
    console.log('   - last_triggered_at bookkeeping invoked');
    process.exit(0);
  } else {
    console.error('\nWEBHOOK DISPATCH INTEGRATION TEST FAILED');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Test crashed:', e);
  process.exit(1);
});

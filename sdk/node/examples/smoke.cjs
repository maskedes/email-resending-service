// Smoke test for @envoy/sdk — sends one real message.
// Usage: ENVOY_API_KEY=fms_... [ENVOY_HOST=http://...] [TEST_TO=you@example.com] node examples/smoke.cjs
const { ENovoy, ENovoyError } = require('../dist/index.js');

async function main() {
  const apiKey = process.env.ENVOY_API_KEY;
  if (!apiKey) {
    console.error('Missing ENVOY_API_KEY.');
    process.exit(1);
  }

  const envoy = new ENovoy({ apiKey, host: process.env.ENVOY_HOST });

  try {
    const result = await envoy.emails.send({
      from: process.env.TEST_FROM || undefined,
      to: process.env.TEST_TO || 'delivered@resend.dev',
      subject: 'E-NVOY Node SDK smoke test',
      html: '<h1>Hello from the Node SDK</h1>',
      tags: { source: 'sdk-smoke' },
    });
    console.log('OK — queued message:', result);
  } catch (err) {
    if (err instanceof ENovoyError) {
      console.error('API error:', err.statusCode, err.type, err.message);
      process.exit(2);
    }
    throw err;
  }
}

main();

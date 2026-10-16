# @envoy/sdk — Node.js / TypeScript

Official E-NVOY SDK for Node.js 18+ and TypeScript.

## Install

Not yet published to npm — install straight from this repository:

```bash
# from the repo root
cd sdk/node
npm install
npm run build
```

Then depend on it from your project with a relative path or `npm pack`:

```json
{ "dependencies": { "@envoy/sdk": "file:../email-resending-service/sdk/node" } }
```

> When a release is published you'll be able to run `npm install @envoy/sdk`.

## Quick start

```ts
import { ENovoy } from '@envoy/sdk';

const envoy = new ENovoy({ apiKey: process.env.ENVOY_API_KEY! });

const result = await envoy.emails.send({
  from: 'hello@yourdomain.com',
  to: ['user@example.com'],
  subject: 'Welcome!',
  html: '<h1>Hello!</h1><p>Your account is ready.</p>',
});

console.log(result.id); // queued message id
```

## Custom host

```ts
const envoy = new ENovoy({
  apiKey: process.env.ENVOY_API_KEY!,
  host: 'http://78.154.103.19:12083',
});
```

The host also falls back to the `ENVOY_HOST` environment variable, then to the
hosted E-NVOY API.

## Parameters

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `to` | `string \| string[]` | yes | Recipients |
| `subject` | `string` | yes | |
| `html` / `text` | `string` | one of | Body |
| `from` | `string` | no | Defaults to your sending domain |
| `reply_to` | `string` | no | |
| `tags` | `Record<string,string>` | no | |
| `scheduleInMs` | `number` | no | Delay delivery |

## Errors

Non-2xx responses throw `ENovoyError` with `statusCode` and `type`:

```ts
import { ENovoy, ENovoyError } from '@envoy/sdk';

try {
  await envoy.emails.send({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>' });
} catch (err) {
  if (err instanceof ENovoyError) console.error(err.statusCode, err.type, err.message);
}
```

## Smoke test

```bash
ENVOY_API_KEY=fms_… node examples/smoke.cjs
```

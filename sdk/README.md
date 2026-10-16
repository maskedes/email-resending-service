# E-NVOY SDKs

Official client libraries for the E-NVOY email API.

| Language | Directory | Package name | Install |
| --- | --- | --- | --- |
| Node.js / TypeScript | [`node/`](./node) | `@envoy/sdk` | `npm install @envoy/sdk` |
| Python | [`python/`](./python) | `envoy-sdk` | `pip install envoy-sdk` |
| Go | [`go/`](./go) | `github.com/maskedes/envoy-go` | `go get github.com/maskedes/envoy-go` |

All three wrap the same endpoint:

```
POST /api/emails/send
Header: x-api-key: fms_…
```

and return the same normalized response:

```json
{
  "id": "a1b2c3d4-…",
  "from": "hello@yourdomain.com",
  "to": ["user@example.com"],
  "subject": "Welcome aboard!",
  "status": "queued",
  "created_at": "2026-08-08T12:00:00.000Z"
}
```

## Configuration

Every SDK reads the API host from the `ENVOY_HOST` environment variable and
falls back to the hosted E-NVOY API. You can also pass the host explicitly when
constructing the client.

```bash
export ENVOY_API_KEY="fms_xxxxxxxxxxxxxxxx"
export ENVOY_HOST="http://78.154.103.19:12083"
```

## Honest status

These SDKs live in this repository (`sdk/`). They are **not** published to the
npm / PyPI / Go registries yet — install them from this repo (see each
sub-directory's README) until a release is published. Every snippet in the docs
is exercised against the real API contract by the smoke tests in each SDK's
`examples/` directory.

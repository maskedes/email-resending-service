# E-NVOY Load Balancer (Vercel Edge)

Reverse-proxy load balancer deployed as a Vercel Edge Function. It fans
requests across all backend servers (WispByte + MonkeyBytes) and keeps
working when any of them crashes or hangs during heavy load.

## Why it works

Every backend is stateless — they all share the same Supabase database
and the same Redis (Layerbase) job queue, so any healthy server can
serve any request.

## Behavior

- **Round-robin** distribution across healthy upstreams.
- **Passive failover**: an upstream that errors or exceeds the 12s
  timeout gets a 30s cooldown; requests are retried on the next upstream.
- **Health probes** hit `GET /health` and require the JSON payload
  `{ status: "ok" }` — hosting-provider "server offline" pages also
  return HTTP 200 with HTML, so a bare status code is not trusted.
- **`GET /__lb/status`** reports the current per-upstream health view.

## Config

| Env var       | Default                                                                           | Purpose            |
| ------------- | --------------------------------------------------------------------------------- | ------------------ |
| `LB_UPSTREAMS` | `http://78-154-103-19.sslip.io:12083,http://212-227-38-182.sslip.io:6113` | Comma-separated upstream base URLs |

Vercel Edge forbids fetching bare IP addresses, so upstreams use
[sslip.io](https://sslip.io) wildcard-DNS hostnames that resolve to the
server allocation IPs. If an allocation IP changes, update the defaults
in `api/lb.ts` (or set the env var) and redeploy. No secrets are
required — both addresses are public allocation IPs.

## Deploy

```powershell
cd load-balancer
vercel deploy --prod --yes
```

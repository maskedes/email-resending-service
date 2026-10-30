# Deploying E-NVOY to WispByte

> Backend stack for the **WispByte free container** (`FREE-EU-RO-14`, 512 MiB RAM,
> Node.js 22, no Redis/DB on the box, **SMTP ports blocked**).
> Related: `../CONFIDENTIAL-PIPELINE.md` (internal, gitignored) for secret values.

## Server facts

| Item | Value |
|---|---|
| Server | WispByte `Email-sms-backend` (FREE-EU-RO-14) |
| Public endpoint | `http://78.154.103.19:12083` |
| Runtime | Node.js 22 (`nodejs_22`) |
| Disk | 1 GiB — keep **5 GB+ free on C:** locally before builds |
| Data | No DB/Redis on box → Supabase (data) + Upstash Redis (queue, TLS) |
| Email delivery | **Brevo HTTPS API** (`api.brevo.com:443`) — do NOT use SMTP/nodemailer |

## What's different from a VPS deployment

- **No Docker** — deploy a zip of the built app; WispByte's console runs the boot command.
- **No SMTP** — WispByte blocks SMTP ports, so all email goes over HTTPS via
  `src/services/brevo.ts` (Brevo API key required).
- **No local Postgres/Redis** — `.env` points at Supabase + `REDIS_URL` (`rediss://…`, TLS).
- **512 MiB RAM** — `npm install + build` can OOM at boot; the boot script includes a
  rate limiter tuned for a single instance (`src/services/rateLimiter.ts`).
- **`EDGE_PROXY_SECRET` must stay EMPTY/UNSET** on this host — the public SDKs hit the
  origin directly; setting it makes every request 403.

## Deployment (manual zip — no git on server)

1. **Build locally:** `npm run build` (repo root; must complete clean).
2. **Zip** `dist/`, `src/`, `package.json`, `package-lock.json`, `tsconfig.json` —
   using **forward slashes** in the archive paths (backslashes create undeletable
   junk files; the boot cleanup loop removes them, but don't make them).
3. **Upload:** WispByte console → Files → Upload Files → drop the zip →
   select it → **Unarchive** → delete the zip.
4. **Restart:** Console → Restart. Boot command runs:
   junk-cleanup loop → append `REDIS_URL` / `BREVO_API_KEY` to `.env` if missing →
   `npm install --include=dev` → `npm run build` → `node dist/index.js`.
5. **Verify:**
   - `GET /health` → `{"status":"ok"}`
   - `POST /api/emails/send` with a bad key → `401`
   - Send with a spoofed `from` → response `from` is the platform domain
     (`ENFORCE_PLATFORM_FROM=true`).

## Required `.env` keys ( Secrets — values live in server `.env`)

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, `REDIS_URL`
(`rediss://…` TLS), `DEFAULT_FROM_EMAIL`, `ENFORCE_PLATFORM_FROM=true`,
`DASHBOARD_SERVICE_SECRET`, `INBOUND_EMAIL_SECRET`, `SMS_GATEWAY_TOKEN_SECRET`.
Do **not** set `EDGE_PROXY_SECRET` here. Full key list: `.env.example`.

## Operations & troubleshooting

| Symptom | Cause → Fix |
|---|---|
| Email `failed: Connection timeout` | SMTP attempted → use Brevo HTTPS only |
| Email `failed: sender invalid` | Brevo sender/domain unverified → verify in Brevo or fix DNS |
| Email `queued` forever | Upstash/Brevo down or key invalid → check logs |
| `403 Direct access…` | `EDGE_PROXY_SECRET` set on server → unset + restart |
| `401` | Bad/missing `x-api-key` |
| `Missing Package: nodemailer` modal | Stale lockfile/junk files → boot loop cleans; dismiss if overlay is stale |
| Offline after boot | OOM during install/build (512 MiB) or crash loop → Stop, then Start |
| WispByte asks maintenance login | Free tier requires login every ~2 weeks |

## Limits & upkeep

- WispByte free: 512 MiB RAM / 1 GiB disk — **log in every 2 weeks** or the box is recycled.
- Brevo free: 300 emails/day (402 = cap reached).
- Upstash free: 500k commands/day.
- Container is **disposable** — rebuild from `CONFIDENTIAL-PIPELINE.md` §5A + `.env` values.

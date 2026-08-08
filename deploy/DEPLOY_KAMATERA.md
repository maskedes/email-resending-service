# Deploying E-NVOY to Kamatera (Docker Compose)

Everything you need to run the full stack on your Kamatera VM:

| Component  | Tech            | Container        | Port (internal) |
|------------|-----------------|------------------|-----------------|
| Database   | PostgreSQL 16   | `postgres:16-alpine` | 5432 |
| Cache/Queue| Redis 7         | `redis:7-alpine` | 6379 |
| API        | Express + TS    | `backend`        | 3000 |
| Dashboard  | Next.js 14      | `dashboard`      | 3001 |
| Proxy/HTTPS| Caddy 2         | `caddy:2-alpine` | 80 / 443 |

Your VM (from Kamatera): **185.227.111.25** · Ubuntu · 2 CPU · 4 GB RAM · 50 GB disk

---

## 1. SSH into the VM

```bash
ssh root@185.227.111.25
```

(Or the username Kamatera gave you, e.g. `ssh ubuntu@185.227.111.25`.)

---

## 2. Install Docker + Compose plugin

```bash
# Update & install prerequisites
apt-get update && apt-get install -y ca-certificates curl

# Add Docker's official repo
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Compose plugin
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify
docker --version
docker compose version
```

---

## 3. Copy the project to the VM

From **your local machine**, copy the project up. Run this from the folder that
contains this `deploy/` directory:

```bash
# Option A — git clone (cleanest)
cd /opt
git clone YOUR_REPO_URL envoy
cd envoy

# Option B — scp (if no git remote)
scp -r . root@185.227.111.25:/opt/envoy
```

The `.dockerignore` in the repo root keeps `node_modules`, `pgdata`, `.next`, etc.
out of the Docker build context.

---

## 4. Configure the environment

```bash
cd /opt/envoy/deploy
cp .env.production .env
nano .env
```

Fill in at minimum:
- `PGPASSWORD` — strong DB password
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` — your provider's sending creds
- `DEFAULT_FROM_EMAIL` — the "from" address recipients see
- `DASHBOARD_SESSION_SECRET` / `DASHBOARD_SERVICE_SECRET` — `openssl rand -hex 32`
- `DASHBOARD_PASSWORD` — admin login for the dashboard

> ⚠️ `DASHBOARD_SERVICE_SECRET` is shared by the backend AND the dashboard — the two
> must match exactly, which this single `.env` guarantees.

---

## 5. Start the stack

```bash
cd /opt/envoy/deploy
docker compose up -d --build
```

First build takes a few minutes (downloads images, compiles TypeScript, builds Next.js).
Watch progress:

```bash
docker compose logs -f
```

Check status:

```bash
docker compose ps
```

Wait for `postgres` and `redis` to show `healthy`, then `backend` and `dashboard`
to start.

---

## 6. Verify

```bash
# API health
curl -i http://185.227.111.25/health

# Dashboard (should return the Next.js HTML)
curl -I http://185.227.111.25/

# Create your first API key
curl -X POST http://185.227.111.25/api/apikeys \
  -H 'Content-Type: application/json' \
  -H 'X-Dashboard-Service-Secret: <DASHBOARD_SERVICE_SECRET>' \
  -d '{"name":"prod-key"}'
```

Open **http://185.227.111.25** in your browser → login with `DASHBOARD_USERNAME` /
`DASHBOARD_PASSWORD` (because `SKIP_AUTH=true`, it skips Supabase login for now).

---

## 7. Firewall (recommended)

Allow SSH, HTTP, HTTPS — keep everything else closed:

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

> Only port 22/80/443 need to be open. The DB and Redis never leave the Docker
> network, and SMTP is **outbound** (see below).

---

## 8. SMTP notes (important for sending email)

- Your VM can send SMTP **outbound** on ports **587 (STARTTLS)** and **465 (SMTPS)**.
- Port **25 is typically blocked** by cloud providers — don't rely on it.
- Use a real SMTP provider (your hosting mail server, Postmark, SendGrid, etc.) and
  set `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` accordingly.
- Test sending from the dashboard after you've added a verified domain + API key.

---

## 9. Optional — domain + automatic HTTPS

1. Point a DNS record at your server:
   - **A record**: `mail.yourdomain.com  →  185.227.111.25`
2. Edit `.env`:
   ```
   SITE_ADDRESS=mail.yourdomain.com
   ```
3. Reload:
   ```bash
   docker compose up -d
   docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
   ```
   Caddy will automatically obtain a Let's Encrypt certificate and serve HTTPS.
4. If you use **Cloudflare** in front, either use a grey-cloud DNS record (DNS only)
   and let Caddy do HTTPS, or configure Cloudflare SSL to "Full (strict)".

---

## 10. Updating the app

```bash
cd /opt/envoy/deploy
git pull                      # pull new code
docker compose up -d --build  # rebuild + restart changed services
```

---

## 11. Backups

Postgres data lives in the `pgdata` volume. Snapshot it regularly:

```bash
docker compose exec postgres pg_dump -U envoy envoy > backup_$(date +%F).sql
```

Restore:

```bash
docker compose exec -T postgres psql -U envoy envoy < backup_2025-01-01.sql
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `backend` keeps restarting | `docker compose logs backend` — check DB creds in `.env`, wait for `postgres` `healthy` |
| `dashboard` restarts | Make sure `backend` is healthy first (`depends_on`) |
| Can't reach site | Firewall: `ufw allow 80` / `443`; check `docker compose ps` for `caddy` running |
| Caddy 502 on `/api/emails` | Backend not ready yet — `docker compose logs backend` |
| "No API keys" in dashboard | The Next.js dashboard proxies `/api/*` to the backend — confirm `NEXT_PUBLIC_API_URL=http://backend:3000` and the service secret matches |
| Emails not sending | Check SMTP creds + that your provider allows the sender; try port 587 |

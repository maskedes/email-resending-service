# 🌐 Cloudflare Zero Trust Access — Setup Guide

This document explains how to protect your FreeMailSend dashboard with
**Cloudflare Zero Trust Access** (formerly Cloudflare Access). This puts a
login/identity gateway in front of your entire app, so only authorized users
can reach it at the network edge — before any request hits your server.

> The Next.js app already contains the code-side check. This guide covers the
> Cloudflare dashboard configuration you must complete on your side.

---

## How it works

1. You point your domain (e.g. `dashboard.example.com`) at Cloudflare.
2. You create a **Cloudflare Access Application** for that domain.
3. Cloudflare challenges visitors (email OTP, Google, GitHub, etc.).
4. On success, Cloudflare injects a signed `Cf-Access-Jwt-Assertion` header.
5. The Next.js middleware (when `CLOUDFLARE_ACCESS_ENABLED=true`) requires that
   header and returns **403** if it's missing.

This means even if the Supabase login is bypassed, no one can reach the app
without passing Cloudflare Access first — defense in depth.

---

## Step 1 — Prerequisites

- A domain on Cloudflare (DNS managed by Cloudflare), e.g. `yourdomain.com`
- The dashboard deployed at a public URL you control, e.g. `https://dashboard.yourdomain.com`
- A Cloudflare account with **Zero Trust** enabled
  (it's free up to 50 users): https://one.dash.cloudflare.com

## Step 2 — Create the Access Application

1. Go to **Zero Trust → Access → Applications**.
2. Click **Add an application** → **Self-hosted**.
3. Configure:
   - **Application name:** `FreeMailSend Dashboard`
   - **Session duration:** your choice (e.g. 24h)
   - **Domain:** `dashboard.yourdomain.com` (path: `/*`)
4. Under **Policies**, create a policy:
   - **Name:** `Allow my team`
   - **Action:** `Allow`
   - **Include:** Select your identity provider / email / group
     (e.g. `Emails ending in @yourdomain.com`, or specific users).
5. **Save** the application.

## Step 3 — (Optional) Validate the JWT in the app

The included code checks for the header's presence. For stronger validation
you can verify the JWT signature using your **Application Audience (AUD) tag**:

1. In the Access application, open the **Overview** tab.
2. Copy the **Application Audience (AUD) Tag**, e.g. `6a1b2c3d-...`.
3. Set it in the dashboard env:
   ```env
   CLOUDFLARE_ACCESS_AUD=6a1b2c3d-...
   ```
4. (Advanced) Fetch Cloudflare's public JWKS from
   `https://<your-team-name>.cloudflareaccess.com/cdn-cgi/access/certs`
   and verify the `Cf-Access-Jwt-Assertion` JWT with the `aud` claim equal to
   your AUD tag.

## Step 4 — Enable the check in the app

In `dashboard/.env.local`:

```env
CLOUDFLARE_ACCESS_ENABLED=true
CLOUDFLARE_ACCESS_AUD=your-aud-tag
```

Restart the Next.js dev server (`npm run dev`). Now any request that does **not**
carry the Cloudflare Access header is rejected with **403**.

> **Local development:** keep `CLOUDFLARE_ACCESS_ENABLED=false` — Cloudflare
> does not inject the header into `localhost` traffic, so the check must be
> disabled locally.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Everything returns 403 even when logged in | Header isn't reaching Next.js — make sure the domain is proxied (orange cloud) in Cloudflare DNS, not DNS-only. |
| `CLOUDFLARE_ACCESS_ENABLED=true` breaks local dev | Set it back to `false` locally; Cloudflare only protects the public domain. |
| Want to bypass for API keys | Keep `x-api-key` API traffic on a separate subdomain or leave `CLOUDFLARE_ACCESS_ENABLED=false` for API-only use. |

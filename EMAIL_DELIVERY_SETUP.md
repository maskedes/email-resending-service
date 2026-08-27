# E-NVOY Email Delivery Setup — lumina.qd.je

> Hand this sheet to whoever manages the DNS for `qd.je` (nameservers: `ns1-4.digitalplat.org`)
> and to Kamatera support for the PTR record. Everything server-side is already configured.

## ✅ Already done on the server (no action needed)
- Open relay closed (Postfix `mynetworks` = localhost + Docker subnet only) + spam queue flushed
- Rate limit: **3 emails / second / API key** (HTTP 429 beyond that)
- OpenDKIM installed, DKIM key generated for `lumina.qd.je` (selector: `lumina`)
- Postfix wired to DKIM milter (fail-open) — messages are being signed
- Backend sends from: **`noreply@lumina.qd.je`**

---

## 📝 DNS records to add (at the qd.je DNS provider)

| # | Type | Host / Name | Value | Purpose |
|---|------|-------------|-------|---------|
| 1 | **A** | `lumina.qd.je` | `185.227.111.25` | Points domain at your server (required for PTR/HELO) |
| 2 | **A** (recommended) | `mail.lumina.qd.je` | `185.227.111.25` | Dedicated mail hostname |
| 3 | **TXT** (SPF) | `lumina.qd.je` | `v=spf1 ip4:185.227.111.25 ~all` | Authorizes your server to send |
| 4 | **TXT** (DKIM) | `lumina._domainkey.lumina.qd.je` | see below | Proves messages are really yours |
| 5 | **TXT** (DMARC) | `_dmarc.lumina.qd.je` | `v=DMARC1; p=none; rua=mailto:dmarc@lumina.qd.je` | Policy + reports |

### DKIM TXT value (record #4) — paste as ONE line:
```
v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApERsjzQ0jeneL5yfvTs0KVFUcr0t3Qtv8jHUKSOIS4vYAkZFyB9HH37w4zZ8VsFlhaWQXDPPOl/oL+SL3WwJLYTchBqXZYYqSLeUVFakzX5EvfZa4YVskj2sSX3NdwbtW7iz3y0gAtf4eb0gxGFlA9W9asI40sn8hR+7t19iKXL40RmpaCiyJEQwzT0WdhjLUSg9Mfd+HB9kdtpKcw0gD80hkoHs3m84uBSBLjzJiX4Aul/heGuyIWISZBXcxdVrGc72Pdj0P8z5Bw5KazSXD6OYAvmh0UG8coRPaZfA0LiC0Drxlsa/N+4tX+LR0kj4PKRYxGTajsMDHKQq+z5a9QIDAQAB
```

---

## 📡 PTR / reverse DNS — request from **Kamatera** (not something you add yourself)

Send Kamatera support a ticket requesting:

> **Request a PTR (reverse DNS) record for IP `185.227.111.25`:**
> `185.227.111.25` → **`mail.lumina.qd.je`**

- This is **required** by Comcast and many other providers ("must have a valid PTR record").
- It must point to a hostname that has an A record → `185.227.111.25` (that's record #2 above),
  so add records #1 & #2 **first**, then request the PTR.

---

## 🔄 After DNS propagates (~5 min – 24 h)

Tell me when the records are live and I'll finish:
1. Set Postfix `myhostname = mail.lumina.qd.je` (matches PTR → better reputation)
2. Re-verify with a real inbox and request de-listing from blacklists (abusix, Spamhaus, etc.)

## 🔍 Verify propagation yourself
```powershell
Resolve-DnsName lumina.qd.je -Type A
Resolve-DnsName lumina._domainkey.lumina.qd.je -Type TXT
Resolve-DnsName _dmarc.lumina.qd.je -Type TXT
```

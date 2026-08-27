# Kamatera PTR (Reverse DNS) Setup — `185.227.111.25`

**Why this matters:** Most mail servers (Gmail, Comcast, Aruba, etc.) reject email from an IP that has **no reverse DNS (PTR)** record. They reply `550 ... DNS reverse lookup failed`. Your server `185.227.111.25` currently has **no PTR record** — this is the #1 remaining blocker for getting email delivered to inboxes.

**Goal:** point the reverse DNS for `185.227.111.25` to `mail.lumina.qd.je` (the hostname your Postfix will present).

---

## ⚠️ Important: Kamatera has NO self-service PTR in the panel

> **Verified (2026-08-10):** There is **no PTR / reverse DNS field anywhere** in the Kamatera console — not under **Server detail → NETWORKS → Network Interfaces → ⚙ (MANAGE / Network Info)**, not in the server **Actions** menu, and not via the API/Terraform provider.
>
> Reverse DNS on Kamatera is set **only by their technical support**, and you request it by opening a **support ticket** in the console. See official FAQ: *"Do you offer reverse DNS lookup?"* → *"This can be done by contacting our technical support … by creating a ticket in the Kamatera console."*

---

## Steps (request a PTR via Kamatera support ticket)

1. **Log in** to your Kamatera account: `https://console.kamatera.com/`
2. Open the **Support → Tickets** area (left navigation).
3. Create a **New Ticket** to technical support with this request:

   > **Subject:** Request reverse DNS (PTR) for IP `185.227.111.25`
   >
   > **Body:**
   > Please set the reverse DNS (PTR) record for public IP **185.227.111.25** to hostname **`mail.lumina.qd.je`**.
   > This IP hosts our mail-sending service (Postfix on Ubuntu 22.04). We have read and agree to Kamatera's TOS/AUP and understand the PTR record will be deleted if the terms are violated.
   > The forward DNS `mail.lumina.qd.je` resolves (A record) to `185.227.111.25`.

4. **Submit** and wait — Kamatera usually applies it within a few hours to ~1 day (sometimes ~10–30 min).
5. If the console ticket path isn't obvious, you can also contact `support@kamatera.com`.

### What Kamatera will check (be ready)
- **Hosted on Kamatera** — your site/mail server must run on their infrastructure (yours does).
- **DNS points to the IP** — an A record must exist from the hostname to `185.227.111.25` (add `mail.lumina.qd.je A 185.227.111.25` at DigitalPlat).
- **Mailing-service clause** — because this is a mail service, they'll require you to acknowledge the **TOS/AUP** and warn the PTR will be removed on abuse. Include that acknowledgment in the ticket (as above).
- **Clean account history** — no prior abuse reports on your account.

---

## Verify it worked

After ~10–30 minutes (sometimes up to a few hours), check from your own computer:

```powershell
nslookup 185.227.111.25
```

You should see a line like:

```
Name:    mail.lumina.qd.je
Address:  185.227.111.25
```

The **Name** must resolve back to `mail.lumina.qd.je` for the check to pass.

---

## Related: matching forward DNS

For best deliverability, add an **A record** so the hostname also resolves forward:

```
mail.lumina.qd.je  A  185.227.111.25
```

and set Postfix to use it as its hostname:

```bash
postconf -e 'myhostname = mail.lumina.qd.je'
postfix reload
```

*(Forward DNS for `qd.je` is managed at DigitalPlat — see `EMAIL_DELIVERY_SETUP.md` for the full record sheet.)*

---

## Checklist

- [ ] **Open Kamatera support ticket** requesting PTR for `185.227.111.25` → `mail.lumina.qd.je`
- [ ] (In ticket) confirm you've read Kamatera **TOS/AUP** (mailing-service clause)
- [ ] `mail.lumina.qd.je A 185.227.111.25` added at DigitalPlat (so forward DNS matches)
- [ ] `nslookup 185.227.111.25` returns `mail.lumina.qd.je` (after Kamatera applies it)
- [ ] Postfix `myhostname` set to `mail.lumina.qd.je` (I can do this for you)
- [ ] SPF / DKIM / DMARC records added per `EMAIL_DELIVERY_SETUP.md`

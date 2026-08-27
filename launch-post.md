# E-NVOY — Launch & Content Drafts

> Copy-paste ready. Replace `{{GITHUB_URL}}` and `{{TWITTER}}` with real links before posting.
> Live URLs: Dashboard → https://mailenvoy.qd.je · Docs → https://envoy-docs-liart.vercel.app

---

## 1. Product Hunt

**Name:** E-NVOY
**Tagline:** Open-source email delivery — self-host it or use the cloud
**Topics:** Developer Tools, Open Source, Email

**Gallery / description (short):**
E-NVOY is an open-source email sending & resending platform. Run it on your own
infrastructure or use the hosted dashboard. Ships with a CLI, a web dashboard, an
SMTP relay, API keys, queue-based workers (BullMQ) for reliable delivery, and
built-in delivery tracking. A self-hostable alternative to Postmark, SendGrid,
and Mailgun — no vendor lock-in.

**Maker comment (first comment, pin it):**
Hey Product Hunt 👋

I built E-NVOY because every email provider I tried either locked me into their
platform or made self-hosting a nightmare. E-NVOY is:

- 🔓 **Open source** — {{GITHUB_URL}}
- 🖥️ **Self-hostable** — docker-compose + dashboard, or use the hosted version
- 💻 **CLI-first** — send, resend, and manage domains from the terminal
- 📊 **Dashboard** — API keys, delivery tracking, domain/DKIM/DNS management
- 🔁 **SMTP relay** — drop-in for existing apps
- ⚙️ **Queued workers** — BullMQ-backed sending that survives crashes
- 📈 **Delivery tracking** — see what actually got delivered

Docs: https://envoy-docs-liart.vercel.app
Hosted dashboard: https://mailenvoy.qd.je

Feedback and roasts welcome 🙏

---

## 2. Show HN (Hacker News)

**Title:** Show HN: E-NVOY – open-source, self-hostable email sending platform (CLI + dashboard + SMTP)

**Body:**
I kept hitting the same wall with email providers: opaque pricing, vendor lock-in,
and self-hosting that needed a PhD in Postfix. So I built E-NVOY.

It's an open-source email sending/resending platform you can run yourself or use
hosted. Highlights:

- CLI for sending, resending, and domain management
- Web dashboard (API keys, delivery tracking, DKIM/DNS setup)
- SMTP relay that drops into existing apps
- Queue-based workers (BullMQ) so a crash doesn't lose emails
- Delivery tracking built in
- Self-host via docker-compose, or use the hosted dashboard

It's a self-hostable alternative to Postmark / SendGrid / Mailgun without the lock-in.

- GitHub: {{GITHUB_URL}}
- Docs: https://envoy-docs-liart.vercel.app
- Hosted: https://mailenvoy.qd.je

Would love HN's feedback — especially on the queue/retry design.

---

## 3. dev.to Article Outline

**Working title:** "I built an open-source, self-hostable alternative to Postmark (and you can run it in 5 minutes)"

**Hook:** The email-provider lock-in problem + why self-hosting is usually painful.

1. **The problem** — vendor lock-in, deliverability black boxes, surprise bills.
2. **What E-NVOY is** — architecture at a glance (Next.js dashboard, Supabase,
   BullMQ workers, CLI, SMTP relay).
3. **Self-host in 5 minutes** — docker-compose walkthrough + screenshots.
4. **Sending your first email** — CLI + API + SMTP relay examples (code blocks).
5. **Delivery tracking & retries** — how the queue keeps mail from getting lost.
6. **DNS / DKIM made boring** — the automated setup helpers.
7. **When to use hosted vs self-hosted** — honest trade-offs.
8. **What's next / call to action** — star the repo, try the dashboard, join Discord.

**CTA footer:** GitHub {{GITHUB_URL}} · Docs https://envoy-docs-liart.vercel.app ·
Hosted https://mailenvoy.qd.je · Follow {{TWITTER}}

---

## 4. Quick-win checklist (free, do in order)
- [ ] Claim **Microsoft Advertising** $100+ credit (you already did Bing Webmaster verify)
- [ ] Publish the **dev.to** post
- [ ] Schedule **Product Hunt** launch (Tue–Thu, 12:01am ET)
- [ ] Post **Show HN** the same week
- [ ] Share in r/selfhosted, r/SideProject, r/devops
- [ ] List on alternativeto.net / SaaSHub as Postmark/SendGrid alternative

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Domains — API — E-NVOY Docs' };

export default function APIDomains() {
  return (
    <div className="prose">
      <h1>Domains API</h1>
      <p>Register, verify, and manage custom sending domains.</p>

      <h2>List Domains</h2>
      <pre><code>{`GET /api/domains`}</code></pre>
      <pre><code>{`{
  "data": [
    {
      "id": "uuid",
      "name": "example.com",
      "status": "verified",
      "spf_verified": true,
      "dkim_verified": true,
      "dmarc_verified": true,
      "verified_at": "2026-08-08T12:00:00.000Z",
      "created_at": "2026-08-08T10:00:00.000Z"
    }
  ]
}`}</code></pre>

      <h2>Add Domain</h2>
      <pre><code>{`POST /api/domains
{ "name": "example.com" }`}</code></pre>
      <pre><code>{`{
  "domain": {
    "id": "uuid",
    "name": "example.com",
    "status": "pending",
    "spf_record": "v=spf1 include:spf.freemailsend.com ~all",
    "dkim_record_name": "fm1a2b3c._domainkey",
    "dkim_record_value": "v=DKIM1; k=rsa; p=...",
    "dmarc_record": "v=DMARC1; p=none; ..."
  }
}`}</code></pre>

      <h2>Verify Domain</h2>
      <pre><code>{`POST /api/domains/:id/verify`}</code></pre>
      <pre><code>{`{
  "domain": { "status": "verified", ... },
  "checks": [
    { "type": "DOMAIN", "verified": true, "detail": "..." },
    { "type": "NS", "verified": true, "detail": "..." },
    { "type": "SPF", "verified": true, "detail": "..." },
    { "type": "DKIM", "verified": true, "detail": "..." },
    { "type": "DMARC", "verified": true, "detail": "..." }
  ],
  "overall": "verified"
}`}</code></pre>

      <h2>Delete Domain</h2>
      <pre><code>{`DELETE /api/domains/:id`}</code></pre>
      <pre><code>{`{ "message": "Domain deleted successfully." }`}</code></pre>

      <h2>Real-time Events (SSE)</h2>
      <pre><code>{`GET /api/domains/events`}</code></pre>
      <p>Server-Sent Events stream for live domain verification updates:</p>
      <pre><code>{`event: connected
data: {"clientId":"abc-123"}

event: domain-updated
data: {"id":"uuid","checks":[...],"overall":"verified"}`}</code></pre>
    </div>
  );
}

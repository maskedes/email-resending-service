import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Domains — CLI — E-NVOY Docs' };

export default function CLIDomains() {
  return (
    <div className="prose">
      <h1>Domains</h1>
      <p>Manage custom domains for sending emails with your own sender address.</p>

      <h2>List Domains</h2>
      <pre><code>{`envoy domains`}</code></pre>
      <p>Output:</p>
      <pre><code>{`  example.com  verified
    ID:      abc-123
    SPF:     ✓  DKIM: ✓  DMARC: ✓
    Verified: 8/8/2026, 12:00:00 PM

  test.com  pending
    ID:      def-456
    SPF:     ✗  DKIM: ✗  DMARC: ✗`}</code></pre>

      <h2>Add a Domain</h2>
      <pre><code>{`envoy domain-add example.com`}</code></pre>
      <p>This registers the domain and outputs the DNS records you need to add:</p>
      <pre><code>{`  Domain example.com registered!

  Add these DNS records to verify your domain:

  SPF (TXT):   v=spf1 include:spf.freemailsend.com ~all
  DKIM (TXT):  fm1a2b3c._domainkey
    Value: v=DKIM1; k=rsa; p=...
  DMARC (TXT): v=DMARC1; p=none; rua=mailto:dmarc@example.com

  Verification will run automatically.`}</code></pre>

      <h2>Verify DNS</h2>
      <pre><code>{`envoy domain-verify <domain-id>`}</code></pre>
      <p>Triggers a fresh DNS check and displays results:</p>
      <pre><code>{`  Verification complete: verified

  ✓ DOMAIN  example.com
    Domain exists in public DNS (A 1.2.3.4).
  ✓ NS  example.com
    NS records found: ns1.example.com
  ✓ SPF  example.com
    SPF record matches expected value.
  ✓ DKIM  fm1a2b3c._domainkey.example.com
    DKIM record matches expected value.
  ✓ DMARC  _dmarc.example.com
    DMARC policy found: p=reject`}</code></pre>

      <h2>Delete a Domain</h2>
      <pre><code>{`envoy domain-delete <domain-id>`}</code></pre>

      <div className="callout callout-warning">
        <strong>Warning:</strong> Deleting a domain is irreversible. All associated DNS records and DKIM keys will be removed.
      </div>

      <h2>DNS Record Types</h2>
      <table>
        <thead>
          <tr><th>Type</th><th>Purpose</th><th>Record Name</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>SPF</strong></td><td>Authorizes E-NVOY to send on your behalf</td><td><code>@</code> (root)</td></tr>
          <tr><td><strong>DKIM</strong></td><td>Cryptographic signing for deliverability</td><td><code>fm..._domainkey</code></td></tr>
          <tr><td><strong>DMARC</strong></td><td>Policy for handling failed authentication</td><td><code>_dmarc</code></td></tr>
        </tbody>
      </table>
    </div>
  );
}

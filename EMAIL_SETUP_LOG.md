# Email Delivery Setup & Troubleshooting Log

## Overview
This document records the full process used to configure the Kamatera Postfix SMTP relay, configure SASL authentication, run the local Node.js email service, debug delivery failures, and successfully send a test email.

## Developer Profile
- Location: Uganda
- Role: Developer for this email delivery service
- Age: 24 years
- Background: Engineer working on concrete, aggregate, and other projects
- Interests: Loves coding and building practical systems
- Profile picture: add a file named `profile.jpg` or `profile.png` in the repository root and reference it from the documentation or README
- Social handles:
  - GitHub: `https://github.com/<your-username>`
  - LinkedIn: `https://www.linkedin.com/in/<your-handle>`
  - X/Twitter: `https://twitter.com/<your-handle>`

## GitHub Token Access
For GitHub repository access and automation:
- Create a personal access token on GitHub:
  1. Go to `https://github.com/settings/tokens`
  2. Click `Generate new token`
  3. Select the appropriate scopes, such as `repo` for repository access
  4. Copy the token immediately (GitHub will not show it again)
- Store the token securely, not in source control. Use one of these options:
  - Local machine: store in an environment variable like `GITHUB_TOKEN`
  - GitHub Actions: add it as a repository secret under `Settings > Secrets and variables > Actions`
- Use the token for push or API access from your local machine with:
  ```powershell
  git remote add origin https://github.com/<your-username>/<repo-name>.git
  git push https://<token>@github.com/<your-username>/<repo-name>.git main
  ```
  > Note: Prefer a Git credential manager or GitHub CLI instead of embedding tokens in commands when possible.
- If you want a direct “GitHub link” to access repository content, use the raw file URL format:
  `https://raw.githubusercontent.com/<your-username>/<repo-name>/main/profile.jpg`
  This is useful for embedding a profile picture in markdown after the image is committed.

## 1. Kamatera / Postfix Setup

### Installed Postfix
```bash
echo "postfix postfix/main_mailer_type select Internet Site" | debconf-set-selections
echo "postfix postfix/mailname string 185.227.111.25" | debconf-set-selections
DEBIAN_FRONTEND=noninteractive apt update
DEBIAN_FRONTEND=noninteractive apt install postfix -y
```

### Opened SMTP ports
```bash
ufw allow 25/tcp
ufw allow 587/tcp
ufw allow 465/tcp
```

### Created mail user
```bash
useradd -m -s /usr/sbin/nologin mailuser
echo "mailuser:MailPass2026!" | chpasswd
```

### Enabled SMTP auth in Postfix
```bash
postconf -e "smtpd_sasl_auth_enable = yes"
postconf -e "smtpd_sasl_security_options = noanonymous"
postconf -e "smtpd_sasl_local_domain = \$myhostname"
postconf -e "smtpd_recipient_restrictions = permit_sasl_authenticated, permit_mynetworks, reject_unauth_destination"
postconf -e "mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128 0.0.0.0/0"
postconf -e "inet_interfaces = all"
```

### Enabled submission port
```bash
sed -i 's/^#submission/submission/' /etc/postfix/master.cf
systemctl restart postfix
```

### Verified listening ports
```bash
ss -tlnp | grep -E '(25|587|465)'
```

## 2. SASL Authentication Setup

### Installed SASL support packages
```bash
apt-get install -y libsasl2-modules sasl2-bin
```

### Created Postfix SASL config
```bash
mkdir -p /etc/postfix/sasl
printf 'pwcheck_method: auxprop\nauxprop_plugin: sasldb\nmech_list: PLAIN LOGIN\n' > /etc/postfix/sasl/smtpd.conf
cat /etc/postfix/sasl/smtpd.conf
```

### Created the SASL password database
```bash
echo 'MailPass2026!' | saslpasswd2 -c -p -f /etc/sasldb2 -u emails mailuser
chown postfix:postfix /etc/sasldb2
chmod 640 /etc/sasldb2
sasldblistusers2 -f /etc/sasldb2
```

### Disabled Postfix chroot for smtp/submission
```bash
sed -i 's/^smtp      inet  n       -       y       -       -       smtpd/smtp      inet  n       -       n       -       -       smtpd/' /etc/postfix/master.cf
sed -i 's/^submission inet n       -       y       -       -       smtpd/submission inet n       -       n       -       -       smtpd/' /etc/postfix/master.cf
systemctl restart postfix
```

## 3. Local App Setup & Run

### Rebuild TypeScript
```powershell
cd "c:\Users\MASK EDES\My App\email resending service"
npx tsc
```

### Start the server
```powershell
cd "c:\Users\MASK EDES\My App\email resending service"
node dist/index.js 2>&1
```

## 4. API Key Creation

### Create API key
```powershell
$body = '{"name":"test-key","email":"maskedes233@gmail.com"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/apikeys" -Method POST -ContentType "application/json" -Body $body | ConvertTo-Json
```

### Result
```json
{
  "id": "14070436-f288-4401-b203-9e95084d0176",
  "key": "fms_E0tqBHokTmKNKTdEI0Y28xvMIoaEYXcC5YaIYygOWqmofcsc",
  "name": "test-key",
  "email": "maskedes233@gmail.com"
}
```

## 5. Test Email Sending

### Initial send attempt
```powershell
$headers = @{ "x-api-key" = "fms_E0tqBHokTmKNKTdEI0Y28xvMIoaEYXcC5YaIYygOWqmofcsc" }
$body = '{"to":"maskedes233@gmail.com","subject":"Hello from FreeMailSend!","html":"<h1>Welcome!</h1><p>This is a test email from FreeMailSend.</p>","text":"Welcome! This is a test email."}'
Invoke-WebRequest -Uri "http://localhost:3000/api/emails/send" -Method POST -ContentType "application/json" -Body $body -Headers $headers
```

### Check email status
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/emails/<email-id>" -Headers $headers | ConvertTo-Json
```

## 6. Errors Encountered & Fixes

### Problems encountered
- `self-signed certificate` error from Postfix TLS connection
- `535 5.7.8 authentication failed` when authenticating to Postfix
- `501 5.1.7 Bad sender address syntax` from the SMTP relay
- stale embedded PostgreSQL `postmaster.pid` lock preventing the local server from starting

### Fixes applied
- Added `tls: { rejectUnauthorized: false }` in `src/services/smtp.ts`
- Created working SASL config and auth account for `mailuser`
- Disabled chroot for Postfix `smtp` and `submission` services so SASL can access `/etc/sasldb2`
- Used valid RFC sender syntax with IP literal form such as `mailuser@[185.227.111.25]`
- Removed stale `data/pgdata/postmaster.pid` and restarted the local server

## 7. Final Verified Results

### Final successful send
- Email ID: `37de91f0-6907-44a8-8b93-cf5cd5792e6e`
- From: `mailuser@[185.227.111.25]`
- To: `maskedes233@gmail.com`
- Status: `sent`
- API: `http://localhost:3000/api/emails/37de91f0-6907-44a8-8b93-cf5cd5792e6e`

### Verified server state
- Local app running on `http://localhost:3000`
- Postfix SMTP relay listening on `185.227.111.25:587`
- SMTP authentication working with `mailuser / MailPass2026!`

## 8. Production Notes
- Replace the IP-based sender address with a real domain address once DNS is configured.
- Add SPF, DKIM, and DMARC records for the sending domain.
- Replace self-signed TLS with a valid certificate for production.
- Use a dedicated production PostgreSQL and Redis service instead of embedded dev instances.

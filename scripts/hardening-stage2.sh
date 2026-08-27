#!/bin/bash
set -u
echo "===== STAGE 2: Postfix postscreen hardening ====="

# ---- Backup ----
BK=/root/backup-hardening-$(date +%Y%m%d)
mkdir -p $BK
cp /etc/postfix/main.cf $BK/main.cf.postscreen.bak
cp /etc/postfix/master.cf $BK/master.cf.postscreen.bak
echo "Backup saved to $BK"

# ---- 1. Edit master.cf: run postscreen on port 25, smtpd on pass 10025 ----
python3 - <<'PYEOF'
import re
mc = '/etc/postfix/master.cf'
with open(mc) as f:
    lines = f.readlines()
out = []
replaced = False
i = 0
while i < len(lines):
    line = lines[i]
    if re.match(r'^smtp\s+inet\s', line) and not replaced:
        out.append("smtp      inet  n       -       y       -       1       postscreen\n")
        out.append("  -o syslog_name=postfix/postscreen\n")
        out.append("  -o smtpd_tls_security_level=none\n")
        out.append("smtpd     pass  -       -       y       -       -       smtpd\n")
        out.append("  -o syslog_name=postfix/smtpd\n")
        out.append("  -o smtpd_tls_security_level=may\n")
        out.append("  -o smtpd_sasl_auth_enable=no\n")
        out.append("  -o smtpd_recipient_restrictions=permit_mynetworks,reject\n")
        out.append("  -o smtpd_relay_restrictions=permit_mynetworks,reject\n")
        replaced = True
        while i+1 < len(lines) and lines[i+1].startswith((' ', '\t')):
            i += 1
        i += 1
        continue
    out.append(line)
    i += 1
with open(mc, 'w') as f:
    f.writelines(out)
print("master.cf replaced:", replaced)
PYEOF

# ---- 2. main.cf postscreen settings ----
postconf -e 'postscreen_dnsbl_sites = zen.spamhaus.org'
postconf -e 'postscreen_dnsbl_threshold = 1'
postconf -e 'postscreen_dnsbl_ttl = 1h'
postconf -e 'postscreen_greet_action = enforce'
postconf -e 'postscreen_bare_newline_action = enforce'
postconf -e 'postscreen_blacklist_action = enforce'
echo "main.cf postscreen settings applied"

# ---- 3. Validate config ----
echo "Running postfix check..."
if postfix check 2>&1 | tee /tmp/postfix-check.out; then
    echo "postfix check: OK"
else
    echo "postfix check FAILED - rolling back"
    cp $BK/main.cf.postscreen.bak /etc/postfix/main.cf
    cp $BK/master.cf.postscreen.bak /etc/postfix/master.cf
    postfix check
    echo "ROLLED BACK"
    exit 1
fi

# ---- 4. Reload postfix ----
postfix reload
sleep 2

# ---- 5. Verify port 25 speaks SMTP (postscreen banner) ----
echo "--- port 25 banner test ---"
timeout 10 bash -c 'exec 3<>/dev/tcp/185.227.111.25/25; echo -e "QUIT\r" >&3; cat <&3' 2>&1 | head -5

echo "--- port 587 still works (submission) ---"
timeout 10 bash -c 'exec 3<>/dev/tcp/185.227.111.25/587; echo -e "EHLO test\r\nQUIT\r" >&3; cat <&3' 2>&1 | head -8

echo "--- postfix processes ---"
ps aux | grep -E "postscreen|master" | grep -v grep | head -6
echo "STAGE2_DONE"

#!/bin/bash
echo "===== CURRENT POSTFIX RELAY RESTRICTIONS ====="
postconf mynetworks
postconf smtpd_relay_restrictions
postconf smtpd_recipient_restrictions
postconf smtpd_client_restrictions
postconf smtpd_sasl_auth_enable
echo ""

echo "===== WHEN DID THE SPAM WAVE OCCUR? (first/last info@21cn.com) ====="
echo "first:"
grep -a "from=<info@21cn.com>" /var/log/mail.log* 2>/dev/null | head -2
echo "last:"
grep -a "from=<info@21cn.com>" /var/log/mail.log* 2>/dev/null | tail -2
echo ""

echo "===== SPAM VOLUME BY DAY ====="
for f in /var/log/mail.log*; do
  echo "--- $f ---"
  grep -a "from=<info@21cn.com>" "$f" 2>/dev/null | awk '{print $1, $2, $3}' | cut -d: -f1-2 | uniq -c | tail -5
done
echo ""

echo "===== MAIL LOG ROTATION (when do logs start) ====="
ls -la /var/log/mail.log* 2>/dev/null
echo ""

echo "===== OPEN RELAY TEST (self-test: try relaying to external via port 25 without auth) ====="
timeout 10 bash -c 'exec 3<>/dev/tcp/185.227.111.25/25; echo -e "EHLO relaytest.com\r\nMAIL FROM:<test@relaytest.com>\r\nRCPT TO:<x@example.com>\r\nQUIT\r" >&3; cat <&3' 2>&1 | head -20
echo ""
echo "===== DONE ====="

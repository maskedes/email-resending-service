#!/bin/bash
echo "===== AUTHORIZED_KEYS (must match YOUR key only) ====="
cat /root/.ssh/authorized_keys
echo ""

echo "===== LAST SSH LOGINS (all) ====="
last -20 2>/dev/null | head -25
echo ""

echo "===== POSTFIX: WHO QUEUED THE OUTBOUND MAIL (sender address) ====="
grep -a "MAILER-DAEMON\|from=<" /var/log/mail.log 2>/dev/null | grep -oE "from=<[^>]+>" | sort | uniq -c | sort -rn | head -20
echo ""

echo "===== POSTFIX: TOP SENDING HOSTS (client=...) ====="
grep -a "client=" /var/log/mail.log 2>/dev/null | grep -oE "client=[^ ]+" | sort | uniq -c | sort -rn | head -15
echo ""

echo "===== POSTFIX: FULL QUEUE (senders & recipients) ====="
postqueue -p 2>/dev/null | grep -E "^\w{10,}|^\(" | tail -40
echo ""

echo "===== BACKEND LOG: RECENT API SEND ACTIVITY (last 500 lines) ====="
docker logs --tail 500 envoy-backend-1 2>&1 | grep -iE "send|api_key|/v1/email|/email|429|401|error" | tail -40
echo ""

echo "===== SUSPICIOUS PROCESSES (miners / reverse shells) ====="
ps aux --sort=-%cpu | head -15
echo ""

echo "===== RECENTLY MODIFIED BINARIES / SUID (7 days) ====="
find / -xdev -type f \( -perm -4000 -o -perm -2000 \) -newermt "7 days ago" 2>/dev/null | head
echo ""

echo "===== OUTBOUND CONNECTIONS (established, non-docker) ====="
ss -tnp 2>/dev/null | grep ESTAB | grep -vE "127.0.0.1|172.18|::1" | head -20
echo ""

echo "===== FAILED SMTP AUTH ATTEMPTS (brute force on submission) ====="
grep -a "SASL authentication failure\|authentication failed\|smtpd.*warning" /var/log/mail.log 2>/dev/null | tail -20
echo ""

echo "===== /tmp AND /var/tmp SUSPICIOUS FILES ====="
ls -la /tmp /var/tmp 2>/dev/null | head -40
echo "DONE"

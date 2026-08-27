#!/bin/bash
echo "===== FINAL VERIFICATION ====="
echo "--- 1. fail2ban ---"
fail2ban-client status sshd 2>&1 | grep -E "Currently banned|Total banned|Banned IP"
echo ""
echo "--- 2. UFW (required ports) ---"
ufw status | grep -E "22|80|443|25|587" | grep ALLOW | head
echo ""
echo "--- 3. Containers ---"
docker ps --format "{{.Names}} {{.Status}}" | grep envoy
echo ""
echo "--- 4. Backend reachable from inside docker network ---"
docker exec envoy-caddy-1 curl -s -o /dev/null -w "backend via network: HTTP %{http_code}\n" http://envoy-backend-1:3000/ 2>&1
echo ""
echo "--- 5. Postfix submission auth (587) - backend can still queue ---"
postconf smtpd_sasl_auth_enable mynetworks | head
echo ""
echo "--- 6. postscreen active on 25? ---"
ss -tlnp | grep -E ":25 |:587 " | head
echo ""
echo "--- 7. Recent mail queue ---"
postqueue -p 2>/dev/null | tail -5
echo ""
echo "--- 8. DNSBL check of own IP (is it still listed?) ---"
echo "Spamhaus ZEN (127.0.0.x = listed):"
getent hosts $(echo 185.227.111.25 | awk -F. '{print $4"."$3"."$2"."$1}').zen.spamhaus.org 2>/dev/null || echo "not resolving = NOT listed on Spamhaus ZEN"
echo ""
echo "Spamhaus PBL (127.0.0.x = listed):"
getent hosts $(echo 185.227.111.25 | awk -F. '{print $4"."$3"."$2"."$1}').pbl.spamhaus.org 2>/dev/null || echo "not resolving = NOT listed on Spamhaus PBL"
echo ""
echo "Abusix (127.0.0.2 = listed):"
getent hosts $(echo 185.227.111.25 | awk -F. '{print $4"."$3"."$2"."$1}').abusix.org 2>/dev/null || echo "not resolving = NOT listed on Abusix"
echo "FINAL_DONE"

#!/bin/bash
# Server health + security audit for envoy VM
echo "===== SYSTEM (uptime/load) ====="
uptime
echo ""

echo "===== OS RELEASE ====="
grep PRETTY /etc/os-release
uname -r
echo ""

echo "===== DOCKER CONTAINERS ====="
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "===== MEMORY ====="
free -h
echo ""

echo "===== DISK ====="
df -h | grep -vE "tmpfs|udev|overlay"
echo ""

echo "===== DOCKER RESTART COUNTS (crashes) ====="
docker inspect --format "{{.Name}} restartCount={{.RestartCount}} startedAt={{.State.StartedAt}}" $(docker ps -aq) 2>/dev/null
echo ""

echo "===== RECENT OOM / KILLED / CRASH EVENTS (3 days) ====="
journalctl --since "3 days ago" --no-pager 2>/dev/null | grep -iE "out of memory|oom-kill|killed process|segfault|panic|trap|crash" | tail -30
echo ""

echo "===== RECENT SERVICE FAILURES / RESTARTS (3 days) ====="
journalctl --since "3 days ago" --no-pager 2>/dev/null | grep -iE "Failed to start|failed|restarting|restart=|supervisor" | grep -viE "failed password|failed for|Failed to connect|Failed to acquire|Failed to create|Failed to remove|Failed to open|Failed to load" | tail -40
echo ""

echo "===== FAILED SSH LOGIN ATTEMPTS (last 7 days) ====="
grep -a "Failed password" /var/log/auth.log 2>/dev/null | tail -20
echo ""
echo "--- failed attempt counts by IP (7 days) ---"
grep -a "Failed password" /var/log/auth.log 2>/dev/null | grep -oE "from [0-9.]+" | sort | uniq -c | sort -rn | head -15
echo ""

echo "===== RECENT ACCEPTED SSH LOGINS ====="
grep -a "Accepted publickey" /var/log/auth.log 2>/dev/null | tail -10
echo ""

echo "===== OPEN LISTENING PORTS ====="
ss -tlnp | grep -vE "127.0.0.1|::1"
echo ""

echo "===== RECENT SUDO USAGE (7 days) ====="
grep -a "sudo" /var/log/auth.log 2>/dev/null | tail -15
echo ""

echo "===== FAIL2BAN STATUS (if installed) ====="
fail2ban-client status 2>/dev/null || echo "fail2ban not installed"
echo ""

echo "===== UFW STATUS (if installed) ====="
ufw status 2>/dev/null || echo "ufw not installed"
echo ""

echo "===== CRON JOBS ====="
crontab -l 2>/dev/null || echo "no crontab for root"
echo ""

echo "===== RECENT KERNEL MESSAGES (errors) ====="
dmesg -T 2>/dev/null | grep -iE "error|fail|oom" | tail -20
echo ""

echo "===== POSTFIX MAIL QUEUE ====="
postqueue -p 2>/dev/null | tail -10 || echo "postfix queue check skipped"
echo ""

echo "===== BACKEND HEARTBEAT (local) ====="
curl -s -o /dev/null -w "backend HTTP %{http_code}\n" http://localhost:3000/ 2>/dev/null || echo "backend not responding"
echo ""

echo "===== LOGIN / AUTH RECENT (api) ====="
tail -5 /var/log/auth.log 2>/dev/null
echo "DONE"

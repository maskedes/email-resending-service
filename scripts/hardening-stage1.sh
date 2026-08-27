#!/bin/bash
set -u
echo "===== STAGE 1: fail2ban + UFW hardening ====="
export DEBIAN_FRONTEND=noninteractive

# ---- Backup current state ----
mkdir -p /root/backup-hardening-$(date +%Y%m%d)

# ---- 1. Install fail2ban ----
echo "[1/4] Installing fail2ban..."
apt-get update -qq >/dev/null 2>&1
apt-get install -y -qq fail2ban >/dev/null 2>&1 || { echo "FAILED to install fail2ban"; }

# ---- 2. Configure fail2ban (SSH jail) ----
echo "[2/4] Configuring fail2ban..."
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
backend  = systemd
# your known admin IPs (never ban these)
ignoreip = 127.0.0.1/8 ::1 41.75.178.100 41.75.191.254 41.210.145.158

[sshd]
enabled = true
port    = ssh
logpath = %(sshd_backend)s
EOF

systemctl enable fail2ban >/dev/null 2>&1
systemctl restart fail2ban
sleep 2
echo "fail2ban status:"
fail2ban-client status sshd 2>&1 | head -12

# ---- 3. UFW ----
echo "[3/4] Configuring UFW..."
# Docker compat: allow forwarding (Docker manages FORWARD rules)
sed -i 's/^DEFAULT_FORWARD_POLICY=.*/DEFAULT_FORWARD_POLICY="ACCEPT"/' /etc/default/ufw
ufw --force reset >/dev/null 2>&1
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 443/udp comment 'HTTP3'
ufw allow 25/tcp comment 'SMTP'
ufw allow 587/tcp comment 'SMTP submission'
ufw --force enable
echo ""

# ---- 4. Verify ----
echo "[4/4] Verifying..."
echo "--- UFW status ---"
ufw status verbose
echo ""
echo "--- fail2ban jails ---"
fail2ban-client status 2>&1 | head -5
echo ""
echo "--- containers still healthy? ---"
docker ps --format "{{.Names}} {{.Status}}" 2>/dev/null
echo "STAGE1_DONE"

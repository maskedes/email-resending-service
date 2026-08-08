#!/usr/bin/env bash
set -e

echo "==> apt update + prerequisites"
apt-get update -qq
apt-get install -y -qq ca-certificates curl >/dev/null 2>&1

echo "==> add Docker apt repo"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

ARCH="$(dpkg --print-architecture)"
CODENAME="$(. /etc/os-release && echo "$VERSION_CODENAME")"
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" > /etc/apt/sources.list.d/docker.list

echo "==> install docker"
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null 2>&1

echo "==> enable + start"
systemctl enable docker >/dev/null 2>&1 || true
systemctl start docker || true

echo "==> INSTALL_DONE"
docker --version
docker compose version

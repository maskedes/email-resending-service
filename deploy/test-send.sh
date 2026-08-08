#!/usr/bin/env bash
set -e
cd /opt/envoy/deploy

# Rotate the weak edge proxy secret to a strong random value
NEW_EDGE="$(openssl rand -hex 24)"
sed -i "s/^EDGE_PROXY_SECRET=.*/EDGE_PROXY_SECRET=${NEW_EDGE}/" .env
echo "==> rotated EDGE_PROXY_SECRET"

# Read secrets from .env without printing them
EDGE="$(grep '^EDGE_PROXY_SECRET=' .env | cut -d= -f2)"
KEY="fms_l4bOO1efGis5Jio7TZPgcdTCwWoLZYeZwLairlf0BtijMnpW"

# Restart backend to pick up new edge secret
docker compose up -d --no-deps backend >/dev/null 2>&1
# wait for healthy
for i in $(seq 1 30); do
  st=$(docker inspect -f '{{.State.Health.Status}}' envoy-backend-1 2>/dev/null || echo starting)
  [ "$st" = "healthy" ] && break
  sleep 2
done
echo "backend health: $st"

echo "==> POST /api/emails/send with domain-literal recipient"
curl -s -o /tmp/sendresp.json -w "send_http=%{http_code}\n" \
  -X POST http://localhost/api/emails/send \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $KEY" \
  -H "x-edge-proxy-secret: $EDGE" \
  -d '{
    "from": "mailuser@185.227.111.25",
    "to": "mailuser@[185.227.111.25]",
    "subject": "E-NVOY production test",
    "text": "Hello from your deployed E-NVOY backend on Kamatera! SMTP round trip confirmed."
  }'
echo "==> response:"
head -c 400 /tmp/sendresp.json
echo ""

sleep 6

echo "==> worker log tail:"
docker compose -f /opt/envoy/deploy/docker-compose.yml logs backend 2>&1 | grep -iE 'job .* (failed|completed|processed)|sent|deliver' | tail -8

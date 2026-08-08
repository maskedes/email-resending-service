#!/usr/bin/env bash
set -e
cd /opt/envoy/deploy
SECRET="$(grep '^DASHBOARD_SERVICE_SECRET=' .env | cut -d= -f2)"
echo "==> POST /api/apikeys through dashboard proxy"
curl -s -o /tmp/keyresp.json -w "create_key_http=%{http_code}\n" \
  -X POST http://localhost/api/apikeys \
  -H 'Content-Type: application/json' \
  -H "X-Dashboard-Service-Secret: $SECRET" \
  -d '{"name":"prod-test","email":"mailuser@185.227.111.25"}'
echo "==> response (first 400 chars):"
head -c 400 /tmp/keyresp.json
echo ""

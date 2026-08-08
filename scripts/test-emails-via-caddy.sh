#!/bin/bash
API="http://localhost"
KEY="fms_l4bOO1efGis5Jio7TZPgcdTCwWoLZYeZwLairlf0BtijMnpW"
SECRET="db422276bb3b871555ce7171c85741dc4a2d78b12075e031"

echo "=== Health Check ==="
curl -s "$API/health"
echo ""

echo "=== Sending Email #1 ==="
curl -s -X POST "$API/api/emails/send" -H "Content-Type: application/json" -H "x-api-key: $KEY" -H "x-edge-proxy-secret: $SECRET" -d '{"to":"test@example.com","subject":"Test Email #1 - Welcome to E-NVOY","html":"<h1>Welcome!</h1><p>First test email sent through the API.</p>","tags":{"campaign":"welcome"}}'
echo ""

echo "=== Sending Email #2 ==="
curl -s -X POST "$API/api/emails/send" -H "Content-Type: application/json" -H "x-api-key: $KEY" -H "x-edge-proxy-secret: $SECRET" -d '{"to":"user@example.com","subject":"Test Email #2 - Password Reset","html":"<h1>Reset Password</h1><p>Click the link to reset.</p>","tags":{"type":"transactional"}}'
echo ""

echo "=== Sending Email #3 ==="
curl -s -X POST "$API/api/emails/send" -H "Content-Type: application/json" -H "x-api-key: $KEY" -H "x-edge-proxy-secret: $SECRET" -d '{"to":"admin@example.com","subject":"Test Email #3 - Weekly Report","html":"<h1>Report</h1><p>Sent: 150 | Delivered: 145 | Failed: 5</p>","tags":{"report":"weekly"}}'
echo ""

echo "=== Sending Email #4 ==="
curl -s -X POST "$API/api/emails/send" -H "Content-Type: application/json" -H "x-api-key: $KEY" -H "x-edge-proxy-secret: $SECRET" -d '{"to":"dev@example.com","subject":"Test Email #4 - Invoice","html":"<h1>Invoice #2024-001</h1><p>$99.00 due Aug 15</p>","tags":{"type":"invoice"}}'
echo ""

echo "=== Sending Email #5 ==="
curl -s -X POST "$API/api/emails/send" -H "Content-Type: application/json" -H "x-api-key: $KEY" -H "x-edge-proxy-secret: $SECRET" -d '{"to":"newsletter@example.com","subject":"Test Email #5 - Newsletter","html":"<h1>Newsletter</h1><p>August updates from E-NVOY.</p>","tags":{"campaign":"newsletter"}}'
echo ""

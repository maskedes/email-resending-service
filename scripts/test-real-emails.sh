#!/bin/bash
API="http://localhost:3000"
KEY="fms_l4bOO1efGis5Jio7TZPgcdTCwWoLZYeZwLairlf0BtijMnpW"

echo "=== Sending Test Email #1 ==="
curl -s -X POST "$API/api/emails/send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $KEY" \
  -d '{"to":"test@example.com","subject":"Test Email #1 - Welcome","html":"<h1>Welcome to E-NVOY!</h1><p>This is your first test email.</p>","tags":{"campaign":"welcome","source":"api"}}'
echo ""

echo "=== Sending Test Email #2 ==="
curl -s -X POST "$API/api/emails/send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $KEY" \
  -d '{"to":"user@example.com","subject":"Test Email #2 - Password Reset","html":"<h1>Password Reset</h1><p>Click here to reset your password.</p>","tags":{"type":"transactional","source":"api"}}'
echo ""

echo "=== Sending Test Email #3 ==="
curl -s -X POST "$API/api/emails/send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $KEY" \
  -d '{"to":"admin@example.com","subject":"Test Email #3 - Weekly Report","html":"<h1>Weekly Report</h1><p>Emails sent: 150 | Delivered: 145 | Failed: 5</p>","tags":{"report":"weekly","source":"scheduler"}}'
echo ""

echo "=== Sending Test Email #4 ==="
curl -s -X POST "$API/api/emails/send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $KEY" \
  -d '{"to":"dev@example.com","subject":"Test Email #4 - Invoice","html":"<h1>Invoice #2024-001</h1><p>Amount: $99.00 | Due: August 15, 2026</p>","tags":{"type":"invoice","amount":"99"}}'
echo ""

echo "=== Sending Test Email #5 ==="
curl -s -X POST "$API/api/emails/send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $KEY" \
  -d '{"to":"newsletter@example.com","subject":"Test Email #5 - Newsletter","html":"<h1>Monthly Newsletter</h1><p>Latest updates from E-NVOY.</p>","tags":{"campaign":"newsletter","month":"august"}}'
echo ""

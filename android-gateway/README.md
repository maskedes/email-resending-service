# E-NVOY SMS Gateway — Android App

Your phone becomes the SMS sender. The backend queues `POST /api/sms/send`; the phone polls `GET /api/sms/gateway/jobs` and sends via `SmsManager`, then confirms with `POST /api/sms/gateway/result`.

## Setup

1. **Backend — register the gateway** (one-time, on any machine with your API key):

   ```bash
   curl -X POST https://your-backend/api/sms/gateway/register \
     -H "x-api-key: fms_xxx" \
     -H "Content-Type: application/json" \
     -d '{"name":"My Redmi","phoneNumber":"+2567..."}'
   # → { gateway: {id}, gatewayToken: "gw_..." }  — copy gatewayToken to the phone
   ```

2. **Phone — install & configure**
   - Enable **Developer options → USB debugging** or just allow **Install unknown apps**.
   - Open `android-gateway/app/build/outputs/apk/debug/app-debug.apk` (build below) and install.
   - Open **E-NVOY Gateway** → paste:
     - **Server URL**: `https://your-backend` (or `http://185.227.111.25` for your Kamatera box)
     - **Gateway token**: `gw_...` from step 1
   - Grant **Send SMS** + **Read phone state** when prompted.
   - Disable **Battery optimization** for the app (Settings → Apps → E-NVOY Gateway → Battery → Unrestricted).
   - Tap **Start**.

3. **Verify**

   ```bash
   # From any machine:
   curl -X POST https://your-backend/api/sms/send \
     -H "x-api-key: fms_xxx" -H "Content-Type: application/json" \
     -d '{"to":"+2567...","body":"Hello from E-NVOY SMS gateway"}'
   # Phone receives the job within seconds and sends the SMS.
   ```

## How it works

- App runs a **foreground service** with a persistent notification so Android doesn't kill it.
- Loop: `GET /api/sms/gateway/jobs` (long-poll ~25s) → for each job `SmsManager.sendTextMessage()` + delivery `PendingIntent` → `POST /api/sms/gateway/result` with `sent|failed|delivered`.
- Between loops it `POST /api/sms/gateway/heartbeat`.
- Multi-part SMS: `SmsManager.divideMessage()` + `sendMultipartTextMessage()` for >160 chars.

## Termux / curl alternative (no APK)

If you prefer not to build the APK, run on the phone:

```bash
pkg install termux-api
# loop in Termux:
while true; do
  RESP=$(curl -s -H "x-gateway-token: gw_..." https://your-backend/api/sms/gateway/jobs)
  # parse $RESP for jobs; for each: termux-sms-send -n "$TO" "$BODY"
  # then: curl -X POST .../gateway/result -d '{"smsId":"...","status":"sent"}'
  sleep 2
done
```

## Build APK

```bash
# Inside android-gateway/
./gradlew assembleDebug
# APK → app/build/outputs/apk/debug/app-debug.apk
```

Requires Android Studio / SDK. If you don't have it, use the Termux loop above.

## No gateway / dev mode

With no phone yet, `POST /api/sms/send` still queues and is visible in `GET /api/sms`. Use `GET /api/sms/gateway/status` to see online gateways. In dev you can simulate a gateway with `curl` against `/jobs` + `/result`.

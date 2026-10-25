# MailEnvoy API gateway

This is **not** the API itself — the API runs on the WispByte backend
(`http://78.154.103.19:12083`). This project only exists so that
`https://api.mailenvoy.qd.je` gets a valid TLS certificate from Vercel
and transparently proxies every request to the backend origin.

If you change the backend origin/port, update the destination in
`vercel.json` and redeploy.

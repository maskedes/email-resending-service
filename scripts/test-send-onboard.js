const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({
  host: process.env.SMTP_HOST || '185.227.111.25',
  port: 587,
  secure: false,
  auth: { user: process.env.SMTP_USER || 'mailuser', pass: process.env.SMTP_PASS || 'MailPass2026!' },
  tls: { rejectUnauthorized: false },
});
t.sendMail(
  {
    from: '"E-NVOY" <noreply@onboard.qd.je>',
    to: 'maskedes233@gmail.com',
    subject: 'E-NVOY onboard test ' + new Date().toISOString().slice(0, 19),
    text: 'Hello from onboard.qd.je fallback. Relay test — add DNS: A onboard->185.227.111.25, SPF, DKIM, DMARC.',
    html: '<p>Hello from <b>onboard.qd.je</b> fallback.</p><p>Relay test — add DNS then DKIM selector onboard.</p>',
  },
  (e, i) => {
    if (e) { console.error('SEND_ERR', e.message); process.exit(1); }
    console.log('SEND_OK', i.messageId, i.response);
  }
);

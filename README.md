# 📬 FreeMailSend

A **free, self-hosted email sending service** — your own Resend-like email API provider.

Send transactional emails via a simple REST API with API key authentication, delivery tracking, and a built-in web dashboard.

## ✨ Features

- **REST API** — Send emails with a single `POST /api/emails/send` call
- **API Key Authentication** — Secure your endpoints with generated API keys
- **SMTP Delivery** — Works with any SMTP provider (Gmail, SendGrid, Mailgun, etc.)
- **Delivery Tracking** — Track email status (queued → sent → delivered/failed)
- **Web Dashboard** — Manage API keys and view email logs at `http://localhost:3000`
- **Rate Limiting** — Built-in protection against abuse
- **SQLite Storage** — Zero-config database, data stored locally
- **Email Templates** — Supports HTML and plain text content
- **Tags & Metadata** — Attach custom metadata to emails for tracking

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and edit it with your SMTP credentials:

```bash
cp .env.example .env
```

Edit `.env` with your SMTP settings:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
DEFAULT_FROM_NAME=Your App
```

> **Gmail Users**: Generate an [App Password](https://myaccount.google.com/apppasswords) instead of using your regular password.

### 3. Start the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

The server starts at `http://localhost:3000`.

## 📖 API Reference

### Create an API Key

```bash
POST /api/apikeys
```

```json
{
  "name": "My Application",
  "email": "you@example.com"
}
```

Response:
```json
{
  "id": "uuid",
  "key": "fms_xxxxxxxxxxxxxxxx",
  "name": "My Application",
  "email": "you@example.com",
  "message": "API key created successfully. Save this key securely - it will not be shown again."
}
```

### Send an Email

```bash
POST /api/emails/send
Headers: x-api-key: YOUR_API_KEY
```

```json
{
  "from": "Your Name <noreply@yourdomain.com>",
  "to": "recipient@example.com",
  "subject": "Welcome to FreeMailSend!",
  "html": "<h1>Hello!</h1><p>Welcome to your new email service.</p>",
  "text": "Hello! Welcome to your new email service.",
  "tags": {
    "campaign": "welcome",
    "user_id": "12345"
  }
}
```

Response:
```json
{
  "id": "email-uuid",
  "from": "noreply@yourdomain.com",
  "to": "recipient@example.com",
  "subject": "Welcome to FreeMailSend!",
  "status": "sent",
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

### List Emails

```bash
GET /api/emails?limit=50&offset=0
Headers: x-api-key: YOUR_API_KEY
```

### Get Email Details

```bash
GET /api/emails/:id
Headers: x-api-key: YOUR_API_KEY
```

### Get Email Stats

```bash
GET /api/emails/stats
Headers: x-api-key: YOUR_API_KEY
```

### Deactivate an API Key

```bash
DELETE /api/apikeys/:id
```

## 🖥️ Web Dashboard

Visit `http://localhost:3000` to access the dashboard where you can:

- Create and manage API keys
- View email sending statistics
- Browse recent email history
- See API documentation with example curl commands

## 📁 Project Structure

```
├── src/
│   ├── config/
│   │   └── index.ts          # Environment configuration
│   ├── database/
│   │   └── db.ts             # SQLite database setup & schema
│   ├── middleware/
│   │   └── auth.ts           # API key authentication
│   ├── routes/
│   │   ├── apiKeyRoutes.ts   # API key management endpoints
│   │   ├── dashboard.ts      # Web dashboard UI
│   │   └── emailRoutes.ts    # Email sending & tracking endpoints
│   ├── services/
│   │   ├── apiKeyService.ts  # API key business logic
│   │   └── emailService.ts   # Email sending & tracking logic
│   └── index.ts              # Express server entry point
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 🛡️ Security Notes

- API keys are **hashed with bcrypt** before storage — the raw key is only shown once at creation
- Rate limiting is applied to all `/api/` endpoints
- Use HTTPS in production (put behind a reverse proxy like nginx)
- Store API keys securely and never commit them to version control

## �‍💻 Developer

![Developer profile](profile.jpg)

**MASK EDES**
- 🇺🇬 Uganda
- 💻 Software developer of this email delivery service
- 👤 24 years old
- ⚙️ Engineer — working on concrete, aggregate, and other projects
- ❤️ Loves coding and building practical systems

### Social Handles
- **GitHub:** [https://github.com/maskedes](https://github.com/maskedes)
- **LinkedIn:** [https://www.linkedin.com/in/<your-handle>](https://www.linkedin.com/in/<your-handle>)
- **X / Twitter:** [https://twitter.com/<your-handle>](https://twitter.com/<your-handle>)

> 💡 Place your profile picture as `profile.jpg` in the repository root to display it above.

## �📝 License

MIT

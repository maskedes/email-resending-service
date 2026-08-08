# E-NVOY CLI

Send emails, manage domains, and monitor delivery — all from your terminal.

## Install

```bash
# Install globally
npm install -g @envoy/cli

# Or run directly with npx (no install needed)
npx @envoy/cli send --to user@example.com --subject "Hello" --html "<p>Hi!</p>"
```

## Quick Start

```bash
# 1. Configure your API key
envoy init

# 2. Send your first email
envoy send --to user@example.com --subject "Hello from CLI" --html "<h1>It works!</h1>"

# 3. Check delivery stats
envoy stats
```

## Commands

| Command | Description |
|---------|-------------|
| `envoy init` | Configure API key, host, and edge proxy secret |
| `envoy send` | Send an email |
| `envoy domains` | List all domains |
| `envoy domain-add <name>` | Register a new domain |
| `envoy domain-verify <id>` | Trigger DNS verification |
| `envoy domain-delete <id>` | Delete a domain |
| `envoy keys` | List all API keys |
| `envoy key-create <name>` | Create a new API key |
| `envoy key-delete <id>` | Delete an API key |
| `envoy logs` | View email logs |
| `envoy stats` | View delivery statistics |

## Send Email

```bash
# HTML email
envoy send \
  --to user@example.com \
  --from hello@yourdomain.com \
  --subject "Welcome!" \
  --html "<h1>Hello!</h1><p>Welcome to E-NVOY.</p>"

# Plain text email
envoy send \
  --to user@example.com \
  --subject "Notification" \
  --text "You have a new notification."

# Read HTML from file
envoy send \
  --to user@example.com \
  --subject "Newsletter" \
  --file ./newsletter.html

# With tags and scheduling
envoy send \
  --to user@example.com \
  --subject "Scheduled" \
  --html "<p>This is delayed</p>" \
  --tag "campaign=welcome" \
  --tag "source=cli" \
  --schedule 60000
```

## Global Options

| Option | Description |
|--------|-------------|
| `--api-key <key>` | Override API key for this command |
| `--host <url>` | Override API host |
| `--edge-secret <secret>` | Edge proxy secret for email routes |
| `--json` | Output raw JSON |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ENVOY_API_KEY` | API key |
| `ENVOY_HOST` | API host URL |
| `ENVOY_EDGE_PROXY_SECRET` | Edge proxy secret |

## License

MIT

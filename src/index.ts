import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { initDatabase, closeDatabase } from './database/db';
import { selectRedisConnection } from './database/embedded';
import emailRoutes from './routes/emailRoutes';
import apiKeyRoutes from './routes/apiKeyRoutes';
import domainRoutes from './routes/domainRoutes';
import dashboardRoutes from './dashboard';
import { errorHandler, edgeProxyMiddleware } from './middleware/auth';
import { initEmailWorker } from './workers/emailWorker';
import { initSmsWorker } from './workers/smsWorker';
import { initWebhookWorker } from './workers/webhookWorker';
import smsRoutes from './routes/smsRoutes.js';
import smsGatewayRoutes from './routes/smsGatewayRoutes.js';
import siteLinkRoutes, { publicSiteLinkRouter } from './routes/siteLinkRoutes.js';
import inboundRoutes from './routes/inboundRoutes.js';
import forwardingRoutes from './routes/forwardingRoutes.js';
import profileRoutes from './routes/profileRoutes';

// ─── Last-resort stability net ───────────────────────────────────────────
// Express 4 does NOT route async rejections to the error middleware, and any
// bare ioredis client that emits 'error' without a listener crashes the whole
// process (that's what took the server down repeatedly when Redis was quota-
// maxed). Log them loudly and keep the process alive — a paused worker is
// recoverable; a dead server is not.
process.on('unhandledRejection', (reason: unknown) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error('[unhandledRejection]', msg);
});
process.on('uncaughtException', (err: Error) => {
  console.error('[uncaughtException]', err?.message ?? err);
});

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
// Attachments (images) ride in the JSON body as base64 — give the send endpoint
// a dedicated parser BEFORE the global one; every other endpoint keeps the
// small default budget.
app.use('/api/emails/send', express.json({ limit: '14mb' }));
// Profile pictures ride in as inline data:image payloads (~300KB encoded).
app.use('/api/profile/pic', express.json({ limit: '2mb' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: {
      type: 'rate_limit_exceeded',
      message: 'Too many requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Endpoints that legitimately poll in a tight loop are exempted from the
  // generic per-IP limiter — they carry their own strong auth:
  //  - /api/inbound: mail providers deliver in bursts (shared-secret auth).
  //  - /api/sms/gateway: an Android phone long-polls every ~25s and heartbeats.
  //    That is ~40 requests per 15 min per phone, so the generic 100-request
  //    budget was exhausted within minutes (and instantly behind CGNAT/NAT,
  //    where many phones share one public IP) — hard-429ing SMS delivery.
  //    These routes authenticate with an HMAC-verified gateway token, so they
  //    remain protected against abuse.
  skip: (req) => {
    const url = req.originalUrl;
    return url.startsWith('/api/inbound') || url.startsWith('/api/sms/gateway');
  },
});
app.use('/api/', limiter);

// Routes
app.use('/', dashboardRoutes);
app.use('/api/emails', edgeProxyMiddleware, emailRoutes);
app.use('/api/apikeys', apiKeyRoutes);
app.use('/api/domains', domainRoutes);
// Gateway routes must be mounted BEFORE /api/sms so that a bare
// GET /api/sms/gateway isn't swallowed by smsRoutes' GET /:id handler.
app.use('/api/sms/gateway', smsGatewayRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/sites-links', siteLinkRoutes);
app.use('/api/inbound', inboundRoutes);
app.use('/api/forwarding', forwardingRoutes);
app.use('/api/profile', profileRoutes);
app.use('/', publicSiteLinkRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Bootstrap: init DB + worker, then start listening
async function bootstrap(): Promise<void> {
  await initDatabase();
  console.log('[db] PostgreSQL ready');

  await selectRedisConnection();

  initEmailWorker();
  initSmsWorker();
  initWebhookWorker();

  const server = app.listen(config.port, config.host, () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║   📬 E-NVOY is running!                  ║
  ║                                          ║
  ║   Dashboard:  http://${config.host}:${config.port}      ║
  ║   API:        http://${config.host}:${config.port}/api   ║
  ║   Health:     http://${config.host}:${config.port}/health║
  ║   Mode:       ${config.useEmbedded ? 'Embedded (dev)' : 'External PG'}${' '.repeat(15 - (config.useEmbedded ? 15 : 12))}║
  ╚══════════════════════════════════════════╝
    `);
  });

  process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    await closeDatabase();
    server.close(() => process.exit(0));
  });

  process.on('SIGTERM', async () => {
    await closeDatabase();
    server.close(() => process.exit(0));
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;

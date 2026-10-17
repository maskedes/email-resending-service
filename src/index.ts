import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { initDatabase, closeDatabase } from './database/db';
import emailRoutes from './routes/emailRoutes';
import apiKeyRoutes from './routes/apiKeyRoutes';
import domainRoutes from './routes/domainRoutes';
import dashboardRoutes from './dashboard';
import { errorHandler, edgeProxyMiddleware } from './middleware/auth';
import { initEmailWorker } from './workers/emailWorker';
import { initSmsWorker } from './workers/smsWorker';
import smsRoutes from './routes/smsRoutes.js';
import smsGatewayRoutes from './routes/smsGatewayRoutes.js';
import siteLinkRoutes, { publicSiteLinkRouter } from './routes/siteLinkRoutes.js';
import inboundRoutes from './routes/inboundRoutes.js';

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
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

  initEmailWorker();
  initSmsWorker();

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

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
  // Inbound email arrives from mail providers in bursts; don't apply the
  // generic per-IP API limiter to it (it has its own shared-secret auth).
  skip: (req) => req.originalUrl.startsWith('/api/inbound'),
});
app.use('/api/', limiter);

// Routes
app.use('/', dashboardRoutes);
app.use('/api/emails', edgeProxyMiddleware, emailRoutes);
app.use('/api/apikeys', apiKeyRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/sms/gateway', smsGatewayRoutes);
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
  ║   📬 FreeMailSend is running!           ║
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

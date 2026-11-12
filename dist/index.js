"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const db_1 = require("./database/db");
const embedded_1 = require("./database/embedded");
const emailRoutes_1 = __importDefault(require("./routes/emailRoutes"));
const apiKeyRoutes_1 = __importDefault(require("./routes/apiKeyRoutes"));
const domainRoutes_1 = __importDefault(require("./routes/domainRoutes"));
const dashboard_1 = __importDefault(require("./dashboard"));
const auth_1 = require("./middleware/auth");
const emailWorker_1 = require("./workers/emailWorker");
const smsWorker_1 = require("./workers/smsWorker");
const webhookWorker_1 = require("./workers/webhookWorker");
const smsRoutes_js_1 = __importDefault(require("./routes/smsRoutes.js"));
const smsGatewayRoutes_js_1 = __importDefault(require("./routes/smsGatewayRoutes.js"));
const siteLinkRoutes_js_1 = __importStar(require("./routes/siteLinkRoutes.js"));
const inboundRoutes_js_1 = __importDefault(require("./routes/inboundRoutes.js"));
const forwardingRoutes_js_1 = __importDefault(require("./routes/forwardingRoutes.js"));
const profileRoutes_1 = __importDefault(require("./routes/profileRoutes"));
// ─── Last-resort stability net ───────────────────────────────────────────
// Express 4 does NOT route async rejections to the error middleware, and any
// bare ioredis client that emits 'error' without a listener crashes the whole
// process (that's what took the server down repeatedly when Redis was quota-
// maxed). Log them loudly and keep the process alive — a paused worker is
// recoverable; a dead server is not.
process.on('unhandledRejection', (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    console.error('[unhandledRejection]', msg);
});
process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err?.message ?? err);
});
const app = (0, express_1.default)();
// Middleware
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)());
// Attachments (images) ride in the JSON body as base64 — give the send endpoint
// a dedicated parser BEFORE the global one; every other endpoint keeps the
// small default budget.
app.use('/api/emails/send', express_1.default.json({ limit: '14mb' }));
// Profile pictures ride in as inline data:image payloads (~300KB encoded).
app.use('/api/profile/pic', express_1.default.json({ limit: '2mb' }));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimit.windowMs,
    max: config_1.config.rateLimit.maxRequests,
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
app.use('/', dashboard_1.default);
app.use('/api/emails', auth_1.edgeProxyMiddleware, emailRoutes_1.default);
app.use('/api/apikeys', apiKeyRoutes_1.default);
app.use('/api/domains', domainRoutes_1.default);
// Gateway routes must be mounted BEFORE /api/sms so that a bare
// GET /api/sms/gateway isn't swallowed by smsRoutes' GET /:id handler.
app.use('/api/sms/gateway', smsGatewayRoutes_js_1.default);
app.use('/api/sms', smsRoutes_js_1.default);
app.use('/api/sites-links', siteLinkRoutes_js_1.default);
app.use('/api/inbound', inboundRoutes_js_1.default);
app.use('/api/forwarding', forwardingRoutes_js_1.default);
app.use('/api/profile', profileRoutes_1.default);
app.use('/', siteLinkRoutes_js_1.publicSiteLinkRouter);
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Error handling
app.use(auth_1.errorHandler);
// Bootstrap: init DB + worker, then start listening
async function bootstrap() {
    await (0, db_1.initDatabase)();
    console.log('[db] PostgreSQL ready');
    await (0, embedded_1.selectRedisConnection)();
    (0, emailWorker_1.initEmailWorker)();
    (0, smsWorker_1.initSmsWorker)();
    (0, webhookWorker_1.initWebhookWorker)();
    const server = app.listen(config_1.config.port, config_1.config.host, () => {
        console.log(`
  ╔══════════════════════════════════════════╗
  ║   📬 E-NVOY is running!                  ║
  ║                                          ║
  ║   Dashboard:  http://${config_1.config.host}:${config_1.config.port}      ║
  ║   API:        http://${config_1.config.host}:${config_1.config.port}/api   ║
  ║   Health:     http://${config_1.config.host}:${config_1.config.port}/health║
  ║   Mode:       ${config_1.config.useEmbedded ? 'Embedded (dev)' : 'External PG'}${' '.repeat(15 - (config_1.config.useEmbedded ? 15 : 12))}║
  ╚══════════════════════════════════════════╝
    `);
    });
    process.on('SIGINT', async () => {
        console.log('\nShutting down gracefully...');
        await (0, db_1.closeDatabase)();
        server.close(() => process.exit(0));
    });
    process.on('SIGTERM', async () => {
        await (0, db_1.closeDatabase)();
        server.close(() => process.exit(0));
    });
}
bootstrap().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=index.js.map
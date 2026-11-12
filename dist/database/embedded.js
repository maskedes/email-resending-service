"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureEmbeddedDatastores = ensureEmbeddedDatastores;
exports.getEmbeddedDatastores = getEmbeddedDatastores;
exports.resolvePgConfig = resolvePgConfig;
exports.resolveRedisConfig = resolveRedisConfig;
exports.parseRedisUrl = parseRedisUrl;
exports.probeRedisUrl = probeRedisUrl;
exports.selectRedisConnection = selectRedisConnection;
const config_1 = require("../config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const node_net_1 = __importDefault(require("node:net"));
const node_tls_1 = __importDefault(require("node:tls"));
let stores = null;
function isPgInitialized(dataDir) {
    return fs_1.default.existsSync(path_1.default.join(dataDir, 'postgresql.conf'));
}
/**
 * Boots embedded PostgreSQL and Redis when no real services are configured.
 * Uses dynamic import() because embedded-postgres ships as ESM.
 */
async function ensureEmbeddedDatastores() {
    if (!config_1.config.useEmbedded) {
        return;
    }
    if (stores) {
        return;
    }
    console.log('[embedded] Starting embedded PostgreSQL...');
    const { default: EmbeddedPostgres } = await import('embedded-postgres');
    const embeddedPg = new EmbeddedPostgres({
        databaseDir: config_1.config.pg.dataDir,
        user: config_1.config.pg.user,
        password: config_1.config.pg.password,
        port: config_1.config.pg.embeddedPort,
        persistent: true,
    });
    if (!isPgInitialized(config_1.config.pg.dataDir)) {
        await embeddedPg.initialise();
    }
    await embeddedPg.start();
    console.log('[embedded] Starting embedded Redis...');
    const { RedisMemoryServer } = await import('redis-memory-server');
    const redisServer = new RedisMemoryServer();
    const redisHost = await redisServer.getHost();
    const redisPort = await redisServer.getPort();
    stores = {
        pg: {
            host: 'localhost',
            port: config_1.config.pg.embeddedPort,
            user: config_1.config.pg.user,
            password: config_1.config.pg.password,
            database: 'postgres',
        },
        redis: { host: redisHost, port: redisPort },
    };
    console.log(`[embedded] Ready — PostgreSQL on :${stores.pg.port}, Redis on :${stores.redis.port}`);
}
function getEmbeddedDatastores() {
    return stores;
}
/** Resolve the active PostgreSQL connection config (embedded or external). */
function resolvePgConfig() {
    const embedded = getEmbeddedDatastores();
    if (embedded) {
        return embedded.pg;
    }
    return {
        host: config_1.config.pg.host,
        port: config_1.config.pg.port,
        user: config_1.config.pg.user,
        password: config_1.config.pg.password,
        database: config_1.config.pg.database,
    };
}
/** Resolve the active Redis connection config (embedded or external). */
function resolveRedisConfig() {
    const embedded = getEmbeddedDatastores();
    if (embedded) {
        return embedded.redis;
    }
    // If selectRedisConnection() has probed and chosen one, return that exact
    // (possibly fallback) connection for the whole process.
    if (activeRedis) {
        return activeRedis;
    }
    // Prefer a full connection URL so managed providers (Upstash, Redis Cloud)
    // work — these need a password and, for rediss://, TLS.
    const url = config_1.config.redis.url;
    if (url) {
        try {
            const parsed = new URL(url);
            return {
                host: parsed.hostname,
                port: parseInt(parsed.port || '6379', 10),
                username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
                password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
                tls: parsed.protocol === 'rediss:',
            };
        }
        catch {
            // Malformed URL — fall through to the host/port config below.
        }
    }
    return {
        host: config_1.config.redis.host,
        port: config_1.config.redis.port,
        password: config_1.config.redis.password || undefined,
        tls: config_1.config.redis.tls,
    };
}
// ─── Fallback selection (primary → fallback), probed once per boot ─────────
let activeRedis = null;
function parseRedisUrl(rawUrl) {
    try {
        const parsed = new URL(rawUrl);
        return {
            host: parsed.hostname,
            port: parseInt(parsed.port || '6379', 10),
            username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
            password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
            tls: parsed.protocol === 'rediss:',
        };
    }
    catch {
        return null;
    }
}
/**
 * Minimal RESP probe: AUTH (if credentials present) then PING, reading raw
 * bytes. Any -ERR reply (e.g. Upstash's "max requests limit exceeded") or a
 * timeout/connection failure means the server is NOT usable right now.
 */
function probeRedisUrl(rawUrl, timeoutMs = 6000) {
    return new Promise((resolve) => {
        let parsed;
        try {
            parsed = new URL(rawUrl);
        }
        catch {
            return resolve({ ok: false, error: 'malformed URL' });
        }
        const useTls = parsed.protocol === 'rediss:';
        const port = parseInt(parsed.port || '6379', 10);
        const user = decodeURIComponent(parsed.username || '');
        const pass = decodeURIComponent(parsed.password || '');
        const socket = useTls
            ? node_tls_1.default.connect({ host: parsed.hostname, port, servername: parsed.hostname, timeout: timeoutMs })
            : node_net_1.default.connect({ host: parsed.hostname, port, timeout: timeoutMs });
        let settled = false;
        let buf = '';
        const done = (ok, error) => {
            if (settled)
                return;
            settled = true;
            try {
                socket.destroy();
            }
            catch { /* ignore */ }
            resolve({ ok, error });
        };
        socket.setTimeout(timeoutMs, () => done(false, 'timeout'));
        socket.on('error', (err) => done(false, err.message));
        socket.on(useTls ? 'secureConnect' : 'connect', () => {
            const auth = user
                ? `AUTH ${user} ${pass}\r\n`
                : pass
                    ? `AUTH ${pass}\r\n`
                    : '';
            socket.write(`${auth}PING\r\n`);
        });
        socket.on('data', (chunk) => {
            buf += chunk.toString('utf8');
            if (buf.includes('PONG'))
                return done(true);
            if (buf.includes('-ERR') || buf.toLowerCase().includes('error')) {
                return done(false, buf.split('\r\n')[0].slice(0, 120));
            }
        });
    });
}
const REDIS_LABEL = (c) => `${c.tls ? 'rediss' : 'redis'}://${c.host}:${c.port}`;
/**
 * Boot-time Redis selection. Probes the primary REDIS_URL; when it is
 * unreachable or quota-maxed, tries REDIS_FALLBACK_URL. The chosen connection
 * is cached for the lifetime of the process (BullMQ cannot hot-swap its
 * connection, so switching means a restart — which is exactly what boot does).
 *
 * If both fail, falls back to the primary anyway so behavior degrades to
 * "queue-unavailable 503s" instead of a startup crash.
 */
async function selectRedisConnection() {
    if (activeRedis)
        return activeRedis;
    const embedded = getEmbeddedDatastores();
    if (embedded) {
        activeRedis = embedded.redis;
        return activeRedis;
    }
    const primaryUrl = config_1.config.redis.url;
    const fallbackUrl = config_1.config.redis.fallbackUrl;
    if (primaryUrl) {
        const primary = parseRedisUrl(primaryUrl);
        if (primary) {
            const probe = await probeRedisUrl(primaryUrl);
            if (probe.ok) {
                console.log(`[redis] primary OK — using ${REDIS_LABEL(primary)}`);
                activeRedis = primary;
                return activeRedis;
            }
            console.error(`[redis] primary unusable (${probe.error ?? 'unknown error'})`);
            if (fallbackUrl) {
                const fallback = parseRedisUrl(fallbackUrl);
                if (fallback) {
                    const fbProbe = await probeRedisUrl(fallbackUrl);
                    if (fbProbe.ok) {
                        console.log(`[redis] using FALLBACK — ${REDIS_LABEL(fallback)}`);
                        activeRedis = fallback;
                        return activeRedis;
                    }
                    console.error(`[redis] fallback also unusable (${fbProbe.error ?? 'unknown error'})`);
                }
            }
            console.log('[redis] no usable Redis — continuing with primary; queue ops will 503 (workers paused)');
            activeRedis = primary;
            return activeRedis;
        }
    }
    activeRedis = {
        host: config_1.config.redis.host,
        port: config_1.config.redis.port,
        password: config_1.config.redis.password || undefined,
        tls: config_1.config.redis.tls,
    };
    return activeRedis;
}
//# sourceMappingURL=embedded.js.map
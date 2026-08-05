import { config } from '../config';
import fs from 'fs';
import path from 'path';

export interface EmbeddedPgConnection {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface EmbeddedRedisConnection {
  host: string;
  port: number;
}

export interface EmbeddedDatastores {
  pg: EmbeddedPgConnection;
  redis: EmbeddedRedisConnection;
}

let stores: EmbeddedDatastores | null = null;

function isPgInitialized(dataDir: string): boolean {
  return fs.existsSync(path.join(dataDir, 'postgresql.conf'));
}

/**
 * Boots embedded PostgreSQL and Redis when no real services are configured.
 * Uses dynamic import() because embedded-postgres ships as ESM.
 */
export async function ensureEmbeddedDatastores(): Promise<void> {
  if (!config.useEmbedded) {
    return;
  }
  if (stores) {
    return;
  }

  console.log('[embedded] Starting embedded PostgreSQL...');

  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const embeddedPg = new EmbeddedPostgres({
    databaseDir: config.pg.dataDir,
    user: config.pg.user,
    password: config.pg.password,
    port: config.pg.embeddedPort,
    persistent: true,
  });

  if (!isPgInitialized(config.pg.dataDir)) {
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
      port: config.pg.embeddedPort,
      user: config.pg.user,
      password: config.pg.password,
      database: 'postgres',
    },
    redis: { host: redisHost, port: redisPort },
  };

  console.log(
    `[embedded] Ready — PostgreSQL on :${stores.pg.port}, Redis on :${stores.redis.port}`
  );
}

export function getEmbeddedDatastores(): EmbeddedDatastores | null {
  return stores;
}

/** Resolve the active PostgreSQL connection config (embedded or external). */
export function resolvePgConfig(): EmbeddedPgConnection {
  const embedded = getEmbeddedDatastores();
  if (embedded) {
    return embedded.pg;
  }
  return {
    host: config.pg.host,
    port: config.pg.port,
    user: config.pg.user,
    password: config.pg.password,
    database: config.pg.database,
  };
}

/** Resolve the active Redis connection config (embedded or external). */
export function resolveRedisConfig(): EmbeddedRedisConnection {
  const embedded = getEmbeddedDatastores();
  if (embedded) {
    return embedded.redis;
  }
  return { host: config.redis.host, port: config.redis.port };
}
import { execSync } from 'node:child_process';
import * as path from 'node:path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';

const API_ROOT = path.resolve(__dirname, '..');

function applyMigrations(databaseUrl: string): void {
  execSync('pnpm exec prisma migrate deploy', {
    cwd: API_ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
}

/**
 * Provisions ephemeral Postgres + Redis for the integration suite via
 * Testcontainers, then applies migrations. Set TEST_DATABASE_URL +
 * TEST_REDIS_URL to point at already-running services instead (CI service
 * containers, local docker-compose) — handy where Testcontainers is unavailable.
 */
export default async function globalSetup(): Promise<void> {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET ??= 'test_jwt_secret_at_least_32_characters_long';
  process.env.JWT_EXPIRES_IN ??= '7d';
  process.env.BCRYPT_COST ??= '6'; // cheaper hashing keeps the suite fast
  process.env.COOKIE_NAME ??= 'linklytics_session';
  process.env.CORS_ORIGINS ??= 'http://localhost:3000';
  process.env.SHORT_BASE_URL ??= 'http://localhost:3001/r';
  process.env.RATE_LIMIT_CREATE_PER_MIN ??= '20';
  process.env.RATE_LIMIT_REDIRECT_PER_MIN ??= '120';

  const store = globalThis as Record<string, unknown>;

  if (process.env.TEST_DATABASE_URL && process.env.TEST_REDIS_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.REDIS_URL = process.env.TEST_REDIS_URL;
    applyMigrations(process.env.DATABASE_URL);
    return;
  }

  const postgres = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('linklytics')
    .withUsername('linklytics')
    .withPassword('linklytics')
    .start();
  const redis = await new RedisContainer('redis:7-alpine').start();

  process.env.DATABASE_URL = postgres.getConnectionUri();
  process.env.REDIS_URL = redis.getConnectionUrl();
  applyMigrations(process.env.DATABASE_URL);

  store.__PG_CONTAINER__ = postgres;
  store.__REDIS_CONTAINER__ = redis;
}

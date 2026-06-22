import type { StartedTestContainer } from 'testcontainers';

export default async function globalTeardown(): Promise<void> {
  const store = globalThis as Record<string, unknown>;
  const postgres = store.__PG_CONTAINER__ as StartedTestContainer | undefined;
  const redis = store.__REDIS_CONTAINER__ as StartedTestContainer | undefined;
  await redis?.stop();
  await postgres?.stop();
}

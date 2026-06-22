import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './test-app';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('liveness /healthz returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/healthz').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('readiness /readyz reports Postgres + Redis healthy', async () => {
    const res = await request(app.getHttpServer()).get('/readyz').expect(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.checks).toEqual({ database: true, redis: true });
  });
});

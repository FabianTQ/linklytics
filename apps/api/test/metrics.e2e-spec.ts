import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { authedAgent, createTestApp, flushRedis, resetDatabase } from './test-app';

describe('Metrics (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(app);
    await flushRedis(app);
  });

  it('exposes Prometheus metrics at /metrics', async () => {
    const res = await request(app.getHttpServer()).get('/metrics').expect(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('linklytics_redirects_total');
    expect(res.text).toContain('http_request_duration_seconds');
    expect(res.text).toContain('nodejs_version_info');
  });

  it('counts a redirect lookup (cache miss)', async () => {
    const agent = await authedAgent(app);
    const link = await agent
      .post('/api/links')
      .send({ originalUrl: 'https://example.com/metrics' })
      .expect(201);
    // Creating a link pre-populates the cache, so evict it to force a DB miss.
    await flushRedis(app);
    await request(app.getHttpServer()).get(`/r/${link.body.slug}`).expect(302);

    const res = await request(app.getHttpServer()).get('/metrics').expect(200);
    expect(res.text).toMatch(/linklytics_redirects_total\{[^}]*result="miss"[^}]*\}\s+[1-9]/);
  });
});

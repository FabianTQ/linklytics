import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  authedAgent,
  createTestApp,
  flushRedis,
  getPrisma,
  resetDatabase,
  waitFor,
} from './test-app';

describe('Analytics (e2e)', () => {
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

  it('aggregates clicks into totals, a time series, referrers and geo', async () => {
    const agent = await authedAgent(app);
    const link = await agent
      .post('/api/links')
      .send({ originalUrl: 'https://target.com' })
      .expect(201);

    const HITS = 4;
    for (let i = 0; i < HITS; i += 1) {
      await request(app.getHttpServer())
        .get(`/r/${link.body.slug}`)
        .set('referer', 'https://news.ycombinator.com/')
        .expect(302);
    }

    const prisma = getPrisma(app);
    await waitFor(async () => {
      const count = await prisma.clickEvent.count({ where: { linkId: link.body.id } });
      return count >= HITS ? count : null;
    });

    const res = await agent.get(`/api/links/${link.body.id}/analytics?days=30`).expect(200);
    expect(res.body.totalClicks).toBeGreaterThanOrEqual(HITS);
    expect(res.body.rangeDays).toBe(30);
    expect(res.body.timeSeries.length).toBeGreaterThanOrEqual(1);
    expect(res.body.topReferrers[0]).toMatchObject({ referrer: 'https://news.ycombinator.com/' });
    expect(Array.isArray(res.body.geo)).toBe(true);
  });

  it('404s analytics for a link owned by another user', async () => {
    const alice = await authedAgent(app, 'alice@example.com');
    const bob = await authedAgent(app, 'bob@example.com');
    const link = await alice.post('/api/links').send({ originalUrl: 'https://a.com' }).expect(201);
    await bob.get(`/api/links/${link.body.id}/analytics`).expect(404);
  });

  it('401s analytics without authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/links/00000000-0000-0000-0000-000000000000/analytics')
      .expect(401);
  });
});

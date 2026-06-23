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

describe('Redirect (e2e)', () => {
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

  async function createLink(url: string): Promise<{ id: string; slug: string }> {
    const agent = await authedAgent(app);
    const res = await agent.post('/api/links').send({ originalUrl: url }).expect(201);
    return { id: res.body.id, slug: res.body.slug };
  }

  it('redirects 302 to the destination (cache miss → Postgres)', async () => {
    const link = await createLink('https://target.com/page');
    const res = await request(app.getHttpServer()).get(`/r/${link.slug}`).expect(302);
    expect(res.headers.location).toBe('https://target.com/page');
  });

  it('serves a repeat hit from the Redis cache', async () => {
    const link = await createLink('https://target.com/cached');
    await request(app.getHttpServer()).get(`/r/${link.slug}`).expect(302);
    const res = await request(app.getHttpServer()).get(`/r/${link.slug}`).expect(302);
    expect(res.headers.location).toBe('https://target.com/cached');
  });

  it('404s for an unknown slug', async () => {
    await request(app.getHttpServer()).get('/r/zzzzzzz').expect(404);
  });

  it('records a click asynchronously (referrer + counter)', async () => {
    const link = await createLink('https://target.com/track');
    await request(app.getHttpServer())
      .get(`/r/${link.slug}`)
      .set('referer', 'https://twitter.com/')
      .expect(302);

    const prisma = getPrisma(app);
    const updated = await waitFor(async () => {
      const found = await prisma.link.findUnique({ where: { id: link.id } });
      return found && found.clickCount >= 1 ? found : null;
    });
    expect(updated.clickCount).toBeGreaterThanOrEqual(1);

    const event = await prisma.clickEvent.findFirst({ where: { linkId: link.id } });
    expect(event?.referrer).toBe('https://twitter.com/');
  });
});

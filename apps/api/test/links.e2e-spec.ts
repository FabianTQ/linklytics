import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { authedAgent, createTestApp, flushRedis, resetDatabase } from './test-app';

describe('Links (e2e)', () => {
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

  it('creates a link with an auto slug, active by default', async () => {
    const agent = await authedAgent(app);
    const res = await agent
      .post('/api/links')
      .send({ originalUrl: 'https://example.com/a' })
      .expect(201);

    expect(res.body.slug).toMatch(/^[0-9a-zA-Z]{7}$/);
    expect(res.body.shortUrl).toContain(`/r/${res.body.slug}`);
    expect(res.body.clickCount).toBe(0);
    expect(res.body.isActive).toBe(true);
    expect(res.body.expiresAt).toBeNull();
  });

  it('creates a link with a custom (branded) slug', async () => {
    const agent = await authedAgent(app);
    const res = await agent
      .post('/api/links')
      .send({ originalUrl: 'https://example.com', customSlug: 'my-brand' })
      .expect(201);
    expect(res.body.slug).toBe('my-brand');
  });

  it('rejects a duplicate custom slug with 409', async () => {
    const agent = await authedAgent(app);
    await agent
      .post('/api/links')
      .send({ originalUrl: 'https://a.com', customSlug: 'dup' })
      .expect(201);
    await agent
      .post('/api/links')
      .send({ originalUrl: 'https://b.com', customSlug: 'dup' })
      .expect(409);
  });

  it('rejects an invalid custom slug with 400', async () => {
    const agent = await authedAgent(app);
    await agent
      .post('/api/links')
      .send({ originalUrl: 'https://a.com', customSlug: 'no spaces!' })
      .expect(400);
  });

  it('rejects a non-URL payload with 400', async () => {
    const agent = await authedAgent(app);
    await agent.post('/api/links').send({ originalUrl: 'not a url' }).expect(400);
  });

  it('rejects unauthenticated creation with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/links')
      .send({ originalUrl: 'https://example.com' })
      .expect(401);
  });

  it('paginates and searches the owner’s links', async () => {
    const agent = await authedAgent(app);
    await agent.post('/api/links').send({ originalUrl: 'https://alpha.com' }).expect(201);
    await agent.post('/api/links').send({ originalUrl: 'https://beta.com' }).expect(201);
    await agent.post('/api/links').send({ originalUrl: 'https://gamma.com' }).expect(201);

    const page1 = await agent.get('/api/links?page=1&pageSize=2').expect(200);
    expect(page1.body.total).toBe(3);
    expect(page1.body.items).toHaveLength(2);
    expect(page1.body.page).toBe(1);

    const search = await agent.get('/api/links?q=beta').expect(200);
    expect(search.body.total).toBe(1);
    expect(search.body.items[0].originalUrl).toBe('https://beta.com');
  });

  it('updates destination, active flag and expiry', async () => {
    const agent = await authedAgent(app);
    const created = await agent.post('/api/links').send({ originalUrl: 'https://old.com' });
    const res = await agent
      .patch(`/api/links/${created.body.id}`)
      .send({ originalUrl: 'https://new.com', isActive: false })
      .expect(200);
    expect(res.body.originalUrl).toBe('https://new.com');
    expect(res.body.isActive).toBe(false);
  });

  it('deletes an owned link (204) and then 404s', async () => {
    const agent = await authedAgent(app);
    const created = await agent.post('/api/links').send({ originalUrl: 'https://gone.com' });
    await agent.delete(`/api/links/${created.body.id}`).expect(204);
    await agent.get(`/api/links/${created.body.id}`).expect(404);
  });

  it('enforces owner authorization across users (404)', async () => {
    const alice = await authedAgent(app, 'alice@example.com');
    const bob = await authedAgent(app, 'bob@example.com');
    const link = await alice.post('/api/links').send({ originalUrl: 'https://secret.com' });

    await bob.get(`/api/links/${link.body.id}`).expect(404);
    await bob
      .patch(`/api/links/${link.body.id}`)
      .send({ originalUrl: 'https://x.com' })
      .expect(404);
    await bob.delete(`/api/links/${link.body.id}`).expect(404);
  });
});

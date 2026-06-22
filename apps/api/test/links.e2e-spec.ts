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

  it('creates a link with a slug and short URL', async () => {
    const agent = await authedAgent(app);
    const res = await agent
      .post('/api/links')
      .send({ originalUrl: 'https://example.com/a' })
      .expect(201);

    expect(res.body.originalUrl).toBe('https://example.com/a');
    expect(res.body.slug).toMatch(/^[0-9a-zA-Z]{7}$/);
    expect(res.body.shortUrl).toContain(`/r/${res.body.slug}`);
    expect(res.body.clickCount).toBe(0);
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

  it('lists only the owner’s links, newest first', async () => {
    const agent = await authedAgent(app);
    await agent.post('/api/links').send({ originalUrl: 'https://a.com' }).expect(201);
    await agent.post('/api/links').send({ originalUrl: 'https://b.com' }).expect(201);

    const res = await agent.get('/api/links').expect(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].originalUrl).toBe('https://b.com');
  });

  it('updates the destination of an owned link', async () => {
    const agent = await authedAgent(app);
    const created = await agent.post('/api/links').send({ originalUrl: 'https://old.com' });
    const res = await agent
      .patch(`/api/links/${created.body.id}`)
      .send({ originalUrl: 'https://new.com' })
      .expect(200);
    expect(res.body.originalUrl).toBe('https://new.com');
  });

  it('deletes an owned link (204) and then 404s', async () => {
    const agent = await authedAgent(app);
    const created = await agent.post('/api/links').send({ originalUrl: 'https://gone.com' });
    await agent.delete(`/api/links/${created.body.id}`).expect(204);
    await agent.get(`/api/links/${created.body.id}`).expect(404);
  });

  it('enforces owner authorization across users (404, not 403-leak)', async () => {
    const alice = await authedAgent(app, 'alice@example.com');
    const bob = await authedAgent(app, 'bob@example.com');
    const aliceLink = await alice.post('/api/links').send({ originalUrl: 'https://secret.com' });

    await bob.get(`/api/links/${aliceLink.body.id}`).expect(404);
    await bob.patch(`/api/links/${aliceLink.body.id}`).send({ originalUrl: 'https://x.com' }).expect(404);
    await bob.delete(`/api/links/${aliceLink.body.id}`).expect(404);
  });
});

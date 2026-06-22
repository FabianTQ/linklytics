import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, flushRedis, resetDatabase } from './test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const creds = { email: 'alice@example.com', password: 'supersecret1' };

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

  it('registers a user and sets an httpOnly cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(creds)
      .expect(201);

    expect(res.body.user.email).toBe(creds.email);
    expect(res.body.user).not.toHaveProperty('passwordHash');

    const cookie =
      ((res.headers as unknown as Record<string, string[]>)['set-cookie'] ?? [])[0] ?? '';
    expect(cookie).toContain('linklytics_session=');
    expect(cookie.toLowerCase()).toContain('httponly');
  });

  it('normalizes email to lowercase', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'Alice@Example.com', password: 'supersecret1' })
      .expect(201);
    expect(res.body.user.email).toBe('alice@example.com');
  });

  it('rejects duplicate registration with 409', async () => {
    await request(app.getHttpServer()).post('/api/auth/register').send(creds).expect(201);
    await request(app.getHttpServer()).post('/api/auth/register').send(creds).expect(409);
  });

  it('rejects invalid payloads with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
  });

  it('logs in and returns the current user from /me', async () => {
    await request(app.getHttpServer()).post('/api/auth/register').send(creds).expect(201);
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send(creds).expect(200);
    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.user.email).toBe(creds.email);
  });

  it('rejects /me without a session cookie', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('rejects login with wrong password (401)', async () => {
    await request(app.getHttpServer()).post('/api/auth/register').send(creds).expect(201);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: creds.email, password: 'wrongpassword1' })
      .expect(401);
  });

  it('logs out and invalidates the session', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/register').send(creds).expect(201);
    await agent.get('/api/auth/me').expect(200);
    await agent.post('/api/auth/logout').expect(200);
    await agent.get('/api/auth/me').expect(401);
  });
});

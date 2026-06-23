import { INestApplication } from '@nestjs/common';
import { authedAgent, createTestApp, flushRedis, resetDatabase } from './test-app';

// Matches RATE_LIMIT_CREATE_PER_MIN (default 20). ConfigModule.forRoot() is
// evaluated once at module import, so the limit is fixed for the process — we
// assert against the real configured value rather than mutating it mid-run.
const CREATE_LIMIT = 20;

describe('Rate limiting (e2e)', () => {
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

  it(`429s once the create limit (${CREATE_LIMIT}/min) is exceeded`, async () => {
    const agent = await authedAgent(app);
    for (let i = 0; i < CREATE_LIMIT; i += 1) {
      await agent
        .post('/api/links')
        .send({ originalUrl: `https://e.com/${i}` })
        .expect(201);
    }
    await agent.post('/api/links').send({ originalUrl: 'https://e.com/overflow' }).expect(429);
  });
});

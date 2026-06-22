import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: ['error'] });
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();
  return app;
}

export function getPrisma(app: INestApplication): PrismaService {
  return app.get(PrismaService);
}

export async function resetDatabase(app: INestApplication): Promise<void> {
  const prisma = getPrisma(app);
  await prisma.clickEvent.deleteMany();
  await prisma.link.deleteMany();
  await prisma.user.deleteMany();
}

export async function flushRedis(app: INestApplication): Promise<void> {
  await app.get(RedisService).client.flushall();
}

/** Register a fresh user and return a cookie-persisting supertest agent. */
export async function authedAgent(
  app: INestApplication,
  email = 'user@example.com',
  password = 'password123',
): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app.getHttpServer());
  await agent.post('/api/auth/register').send({ email, password }).expect(201);
  return agent;
}

/** Poll until `fn` returns a non-null value or the timeout elapses. */
export async function waitFor<T>(
  fn: () => Promise<T | null | undefined>,
  timeoutMs = 5000,
  intervalMs = 40,
): Promise<T> {
  const start = Date.now();
  for (;;) {
    const result = await fn();
    if (result !== null && result !== undefined) return result;
    if (Date.now() - start > timeoutMs) throw new Error('waitFor: timed out');
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

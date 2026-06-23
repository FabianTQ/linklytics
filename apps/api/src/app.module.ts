import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { MetricsModule } from './metrics/metrics.module';
import { AuthModule } from './auth/auth.module';
import { LinksModule } from './links/links.module';
import { RedirectModule } from './redirect/redirect.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'test' ? 'silent' : (process.env.LOG_LEVEL ?? 'info'),
        genReqId: (req, res) => {
          const existing = req.headers['x-request-id'];
          const id = typeof existing === 'string' && existing ? existing : randomUUID();
          res.setHeader('x-request-id', id);
          return id;
        },
        redact: ['req.headers.cookie', 'req.headers.authorization'],
        autoLogging: {
          ignore: (req) =>
            req.url === '/healthz' || req.url === '/readyz' || req.url === '/metrics',
        },
        transport:
          process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // In tests the connection strings are injected via process.env by the
      // Testcontainers global-setup; never read a developer's local .env there.
      ignoreEnvFile: process.env.NODE_ENV === 'test',
      validate: validateEnv,
    }),
    PrismaModule,
    RedisModule,
    MetricsModule,
    AuthModule,
    LinksModule,
    RedirectModule,
    AnalyticsModule,
    HealthModule,
  ],
})
export class AppModule {}

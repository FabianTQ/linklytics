import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Liveness — the process is up. No dependency checks. */
  @Get('healthz')
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  /** Readiness — can we actually serve traffic? Checks Postgres + Redis. */
  @Get('readyz')
  async readiness(): Promise<{ status: string; checks: Record<string, boolean> }> {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.redis.ping()]);
    const checks = { database, redis };
    if (!database || !redis) {
      throw new ServiceUnavailableException({ status: 'unavailable', checks });
    }
    return { status: 'ready', checks };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

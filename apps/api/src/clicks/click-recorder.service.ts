import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as geoip from 'geoip-lite';
import type { Env } from '../config/env.validation';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { hashIp } from '../common/util/hash-ip';
import { MetricsService } from '../metrics/metrics.service';

export interface ClickContext {
  referrer?: string;
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class ClickRecorderService {
  private readonly logger = new Logger(ClickRecorderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService<Env, true>,
    private readonly metrics: MetricsService,
  ) {}

  /** Fire-and-forget: never blocks (or fails) the redirect response. */
  record(linkId: string, context: ClickContext): void {
    void this.persist(linkId, context).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to record click for link ${linkId}: ${message}`);
    });
  }

  /** Exposed for tests so the write can be awaited deterministically. */
  async persist(linkId: string, context: ClickContext): Promise<void> {
    let country: string | null = null;
    let city: string | null = null;
    let ipHash: string | null = null;

    if (context.ip) {
      const geo = geoip.lookup(context.ip);
      country = geo?.country || null;
      city = geo?.city || null;
      ipHash = hashIp(context.ip, this.config.get('JWT_SECRET', { infer: true }));
    }

    const occurredAt = new Date();
    const day = new Date(
      Date.UTC(occurredAt.getUTCFullYear(), occurredAt.getUTCMonth(), occurredAt.getUTCDate()),
    );

    await this.prisma.$transaction([
      this.prisma.clickEvent.create({
        data: {
          linkId,
          occurredAt,
          referrer: context.referrer ?? null,
          userAgent: context.userAgent ?? null,
          country,
          city,
          ipHash,
        },
      }),
      this.prisma.link.update({
        where: { id: linkId },
        data: { clickCount: { increment: 1 } },
      }),
      // Incremental daily rollup powering the analytics time series.
      this.prisma.clickDaily.upsert({
        where: { linkId_day: { linkId, day } },
        create: { linkId, day, count: 1 },
        update: { count: { increment: 1 } },
      }),
    ]);
    this.metrics.clicks.inc();

    // Fast click counter in Redis (best-effort; analytics read from Postgres).
    await this.redis.client.incr(`clicks:${linkId}`).catch(() => undefined);
  }
}

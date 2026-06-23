import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { CachedLink, LinksService } from '../links/links.service';
import { MetricsService } from '../metrics/metrics.service';

export interface ResolvedLink {
  linkId: string;
  url: string;
  isActive: boolean;
  expiresAt: string | null;
}

const CACHE_TTL_SECONDS = 60 * 60;

@Injectable()
export class RedirectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly metrics: MetricsService,
  ) {}

  /** Resolve a slug to its target. Redis first, Postgres fallback, then caches. */
  async resolve(slug: string): Promise<ResolvedLink | null> {
    const cached = await this.redis.get(LinksService.cacheKey(slug));
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as CachedLink;
        this.metrics.redirects.inc({ result: 'hit' });
        return {
          linkId: parsed.id,
          url: parsed.url,
          isActive: parsed.isActive,
          expiresAt: parsed.expiresAt,
        };
      } catch {
        // Corrupt cache entry — fall through to Postgres.
      }
    }

    const link = await this.prisma.link.findUnique({
      where: { slug },
      select: { id: true, slug: true, originalUrl: true, isActive: true, expiresAt: true },
    });
    if (!link) {
      this.metrics.redirects.inc({ result: 'notfound' });
      return null;
    }

    await this.redis.cache(
      LinksService.cacheKey(slug),
      LinksService.serializeCache(link),
      CACHE_TTL_SECONDS,
    );
    this.metrics.redirects.inc({ result: 'miss' });
    return {
      linkId: link.id,
      url: link.originalUrl,
      isActive: link.isActive,
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    };
  }
}

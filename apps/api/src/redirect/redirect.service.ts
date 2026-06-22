import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { LinksService } from '../links/links.service';

export interface ResolvedLink {
  linkId: string;
  url: string;
}

const CACHE_TTL_SECONDS = 60 * 60;

@Injectable()
export class RedirectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Resolve a slug to its target. Redis first, Postgres fallback, then caches. */
  async resolve(slug: string): Promise<ResolvedLink | null> {
    const cached = await this.redis.get(LinksService.cacheKey(slug));
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { id: string; url: string };
        return { linkId: parsed.id, url: parsed.url };
      } catch {
        // Corrupt cache entry — fall through to Postgres.
      }
    }

    const link = await this.prisma.link.findUnique({
      where: { slug },
      select: { id: true, originalUrl: true },
    });
    if (!link) {
      return null;
    }

    await this.redis.cache(
      LinksService.cacheKey(slug),
      JSON.stringify({ id: link.id, url: link.originalUrl }),
      CACHE_TTL_SECONDS,
    );
    return { linkId: link.id, url: link.originalUrl };
  }
}

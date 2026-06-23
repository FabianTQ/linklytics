import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type Link } from '@prisma/client';
import type { Env } from '../config/env.validation';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { generateSlug } from '../common/util/slug';
import type { CreateLinkDto } from './dto/create-link.dto';
import type { UpdateLinkDto } from './dto/update-link.dto';

const SLUG_MAX_ATTEMPTS = 5;
const SLUG_CACHE_TTL_SECONDS = 60 * 60;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export interface LinkView {
  id: string;
  slug: string;
  originalUrl: string;
  shortUrl: string;
  clickCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CachedLink {
  id: string;
  url: string;
  isActive: boolean;
  expiresAt: string | null;
}

export interface PaginatedLinks {
  items: LinkView[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListLinksOptions {
  page?: number;
  pageSize?: number;
  q?: string;
}

type CacheableLink = Pick<Link, 'id' | 'slug' | 'originalUrl' | 'isActive' | 'expiresAt'>;

@Injectable()
export class LinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  static cacheKey(slug: string): string {
    return `slug:${slug}`;
  }

  static serializeCache(link: CacheableLink): string {
    const payload: CachedLink = {
      id: link.id,
      url: link.originalUrl,
      isActive: link.isActive,
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    };
    return JSON.stringify(payload);
  }

  private toView(link: Link): LinkView {
    return {
      id: link.id,
      slug: link.slug,
      originalUrl: link.originalUrl,
      shortUrl: `${this.config.get('SHORT_BASE_URL', { infer: true })}/${link.slug}`,
      clickCount: link.clickCount,
      isActive: link.isActive,
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
      createdAt: link.createdAt.toISOString(),
      updatedAt: link.updatedAt.toISOString(),
    };
  }

  private async writeCache(link: CacheableLink): Promise<void> {
    await this.redis.cache(
      LinksService.cacheKey(link.slug),
      LinksService.serializeCache(link),
      SLUG_CACHE_TTL_SECONDS,
    );
  }

  async create(userId: string, dto: CreateLinkDto): Promise<LinkView> {
    const base = {
      originalUrl: dto.originalUrl,
      userId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    };

    if (dto.customSlug) {
      try {
        const link = await this.prisma.link.create({ data: { ...base, slug: dto.customSlug } });
        await this.writeCache(link);
        return this.toView(link);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException('That custom slug is already taken');
        }
        throw error;
      }
    }

    for (let attempt = 0; attempt < SLUG_MAX_ATTEMPTS; attempt += 1) {
      const slug = generateSlug();
      try {
        const link = await this.prisma.link.create({ data: { ...base, slug } });
        await this.writeCache(link);
        return this.toView(link);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          continue;
        }
        throw error;
      }
    }
    throw new ConflictException('Could not generate a unique slug, please retry');
  }

  async findAllForUser(userId: string, options: ListLinksOptions = {}): Promise<PaginatedLinks> {
    const page = Math.max(options.page ?? 1, 1);
    const pageSize = Math.min(Math.max(options.pageSize ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const q = options.q?.trim();

    const where: Prisma.LinkWhereInput = {
      userId,
      ...(q
        ? {
            OR: [
              { originalUrl: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.link.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.link.count({ where }),
    ]);

    return { items: items.map((link) => this.toView(link)), total, page, pageSize };
  }

  /** Fetch a link enforcing ownership; treats other users' links as not found. */
  async findOneOwned(userId: string, id: string): Promise<Link> {
    const link = await this.prisma.link.findUnique({ where: { id } });
    if (!link || link.userId !== userId) {
      throw new NotFoundException('Link not found');
    }
    return link;
  }

  async getOneOwned(userId: string, id: string): Promise<LinkView> {
    return this.toView(await this.findOneOwned(userId, id));
  }

  async update(userId: string, id: string, dto: UpdateLinkDto): Promise<LinkView> {
    await this.findOneOwned(userId, id);

    const data: Prisma.LinkUpdateInput = {};
    if (dto.originalUrl !== undefined) data.originalUrl = dto.originalUrl;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.expiresAt !== undefined)
      data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const link = await this.prisma.link.update({ where: { id }, data });
    // URL / active / expiry may have changed — refresh the cached entry.
    await this.writeCache(link);
    return this.toView(link);
  }

  async remove(userId: string, id: string): Promise<void> {
    const link = await this.findOneOwned(userId, id);
    await this.prisma.link.delete({ where: { id } });
    await this.redis.del(LinksService.cacheKey(link.slug));
  }
}

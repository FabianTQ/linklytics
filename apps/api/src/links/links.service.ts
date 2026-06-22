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

export interface LinkView {
  id: string;
  slug: string;
  originalUrl: string;
  shortUrl: string;
  clickCount: number;
  createdAt: Date;
  updatedAt: Date;
}

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

  private toView(link: Link): LinkView {
    return {
      id: link.id,
      slug: link.slug,
      originalUrl: link.originalUrl,
      shortUrl: `${this.config.get('SHORT_BASE_URL', { infer: true })}/${link.slug}`,
      clickCount: link.clickCount,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    };
  }

  private async writeCache(link: Pick<Link, 'id' | 'slug' | 'originalUrl'>): Promise<void> {
    await this.redis.cache(
      LinksService.cacheKey(link.slug),
      JSON.stringify({ id: link.id, url: link.originalUrl }),
      SLUG_CACHE_TTL_SECONDS,
    );
  }

  async create(userId: string, dto: CreateLinkDto): Promise<LinkView> {
    for (let attempt = 0; attempt < SLUG_MAX_ATTEMPTS; attempt += 1) {
      const slug = generateSlug();
      try {
        const link = await this.prisma.link.create({
          data: { slug, originalUrl: dto.originalUrl, userId },
        });
        await this.writeCache(link);
        return this.toView(link);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' // unique constraint (slug collision) — retry
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new ConflictException('Could not generate a unique slug, please retry');
  }

  async findAllForUser(userId: string): Promise<LinkView[]> {
    const links = await this.prisma.link.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return links.map((link) => this.toView(link));
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
    const link = await this.prisma.link.update({
      where: { id },
      data: dto.originalUrl ? { originalUrl: dto.originalUrl } : {},
    });
    if (dto.originalUrl) {
      await this.writeCache(link);
    }
    return this.toView(link);
  }

  async remove(userId: string, id: string): Promise<void> {
    const link = await this.findOneOwned(userId, id);
    await this.prisma.link.delete({ where: { id } });
    await this.redis.del(LinksService.cacheKey(link.slug));
  }
}

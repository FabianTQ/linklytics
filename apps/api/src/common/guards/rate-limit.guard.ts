import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import type { Env } from '../../config/env.validation';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';
import type { AuthenticatedUser } from '../types/authenticated-user';
import { RedisService } from '../redis/redis.service';

/**
 * Redis sliding-window rate limiter (sorted set of request timestamps). Unlike a
 * fixed window it does not allow a burst across the window boundary. Identifies
 * the caller by user id when authenticated, otherwise by client IP (Express
 * `trust proxy` is on, so this respects X-Forwarded-For behind the ingress).
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const response = context.switchToHttp().getResponse<Response>();

    const identifier = request.user?.id ?? request.ip ?? 'anonymous';
    const key = `ratelimit:${options.name}:${identifier}`;
    const limit = this.resolveLimit(options);
    const windowMs = options.windowSeconds * 1000;
    const now = Date.now();
    const member = `${now}-${randomBytes(6).toString('hex')}`;

    const results = await this.redis.client
      .multi()
      .zremrangebyscore(key, 0, now - windowMs) // drop entries outside the window
      .zadd(key, now, member)
      .zcard(key)
      .pexpire(key, windowMs)
      .exec();
    const count = Number(results?.[2]?.[1] ?? 0);

    if (count > limit) {
      // Don't let a rejected request count against the next ones.
      await this.redis.client.zrem(key, member);
      response.setHeader('Retry-After', String(options.windowSeconds));
      throw new HttpException('Rate limit exceeded, slow down.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }

  private resolveLimit(options: RateLimitOptions): number {
    switch (options.name) {
      case 'create':
        return this.config.get('RATE_LIMIT_CREATE_PER_MIN', { infer: true });
      case 'redirect':
        return this.config.get('RATE_LIMIT_REDIRECT_PER_MIN', { infer: true });
      default:
        return options.limit;
    }
  }
}

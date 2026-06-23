import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { Env } from '../../config/env.validation';
import type { AuthenticatedUser, JwtPayload } from '../types/authenticated-user';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { cookies?: Record<string, string>; user?: AuthenticatedUser }>();

    const cookieName = this.config.get('COOKIE_NAME', { infer: true });
    const token = request.cookies?.[cookieName];
    if (!token) {
      throw new UnauthorizedException('Not authenticated');
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      request.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}

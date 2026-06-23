import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import type { Env } from '../config/env.validation';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { durationToMs } from '../common/util/duration';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const REFRESH_PATH = '/api/auth';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: AuthenticatedUser }> {
    const user = await this.auth.register(dto);
    await this.startSession(res, user);
    return { user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: AuthenticatedUser }> {
    const user = await this.auth.validateCredentials(dto);
    await this.startSession(res, user);
    return { user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request & { cookies?: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: AuthenticatedUser }> {
    const token = req.cookies?.[this.config.get('REFRESH_COOKIE_NAME', { infer: true })];
    if (!token) {
      throw new UnauthorizedException('No refresh token');
    }
    const { user, refreshToken } = await this.auth.rotateRefreshToken(token);
    this.setAccessCookie(res, await this.auth.issueAccessToken(user));
    this.setRefreshCookie(res, refreshToken);
    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request & { cookies?: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    await this.auth.revokeRefreshToken(
      req.cookies?.[this.config.get('REFRESH_COOKIE_NAME', { infer: true })],
    );
    res.clearCookie(this.config.get('COOKIE_NAME', { infer: true }), this.cookieBase('/'));
    res.clearCookie(
      this.config.get('REFRESH_COOKIE_NAME', { infer: true }),
      this.cookieBase(REFRESH_PATH),
    );
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser): { user: AuthenticatedUser } {
    return { user };
  }

  private async startSession(res: Response, user: AuthenticatedUser): Promise<void> {
    this.setAccessCookie(res, await this.auth.issueAccessToken(user));
    this.setRefreshCookie(res, await this.auth.issueRefreshToken(user.id));
  }

  private setAccessCookie(res: Response, token: string): void {
    res.cookie(this.config.get('COOKIE_NAME', { infer: true }), token, {
      ...this.cookieBase('/'),
      maxAge: durationToMs(this.config.get('JWT_EXPIRES_IN', { infer: true })),
    });
  }

  private setRefreshCookie(res: Response, token: string): void {
    const days = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    res.cookie(this.config.get('REFRESH_COOKIE_NAME', { infer: true }), token, {
      ...this.cookieBase(REFRESH_PATH),
      maxAge: days * 24 * 60 * 60 * 1000,
    });
  }

  private cookieBase(path: string): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      sameSite: this.config.get('COOKIE_SAMESITE', { infer: true }),
      path,
    };
  }
}

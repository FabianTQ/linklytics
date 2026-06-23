import {
  Controller,
  Get,
  GoneException,
  HttpStatus,
  NotFoundException,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { ClickRecorderService } from '../clicks/click-recorder.service';
import { RedirectService } from './redirect.service';

@Controller('r')
export class RedirectController {
  constructor(
    private readonly redirect: RedirectService,
    private readonly clicks: ClickRecorderService,
  ) {}

  @Get(':slug')
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'redirect', limit: 120, windowSeconds: 60 })
  async handle(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const resolved = await this.redirect.resolve(slug);
    if (!resolved) {
      throw new NotFoundException('Short link not found');
    }

    const expired =
      resolved.expiresAt !== null && new Date(resolved.expiresAt).getTime() <= Date.now();
    if (!resolved.isActive || expired) {
      throw new GoneException('This short link is no longer available');
    }

    this.clicks.record(resolved.linkId, {
      referrer: req.get('referer') ?? undefined,
      userAgent: req.get('user-agent') ?? undefined,
      ip: req.ip,
    });

    res.redirect(HttpStatus.FOUND, resolved.url);
  }
}

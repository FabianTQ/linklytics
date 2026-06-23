import { Controller, Get, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { Env } from '../config/env.validation';
import { MetricsService } from './metrics.service';

@Controller()
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // Plain text Prometheus exposition. Scraped in-cluster (not via the ingress).
  // Optionally protected by a bearer token (METRICS_TOKEN).
  @Get('metrics')
  async scrape(@Req() req: Request, @Res() res: Response): Promise<void> {
    const token = this.config.get('METRICS_TOKEN', { infer: true });
    if (token) {
      const header = req.headers.authorization;
      const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
      const provided =
        bearer ?? (typeof req.query.token === 'string' ? req.query.token : undefined);
      if (provided !== token) {
        throw new UnauthorizedException('Invalid metrics token');
      }
    }
    res.setHeader('Content-Type', this.metrics.contentType);
    res.send(await this.metrics.metrics());
  }
}

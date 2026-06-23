import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const request = context.switchToHttp().getRequest<Request & { route?: { path?: string } }>();
    const start = process.hrtime.bigint();
    const observe = (): void => {
      const response = context.switchToHttp().getResponse<Response>();
      const route = request.route?.path ?? request.path ?? 'unknown';
      // Don't let the scrape endpoint inflate its own series.
      if (route === '/metrics') return;
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      this.metrics.httpDuration.observe(
        { method: request.method, route, status: response.statusCode },
        seconds,
      );
    };
    return next.handle().pipe(tap({ next: observe, error: observe }));
  }
}

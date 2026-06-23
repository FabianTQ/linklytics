import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  /** Redirect lookups, labelled by result (hit / miss / notfound). */
  readonly redirects: Counter<'result'>;
  /** Click events successfully recorded. */
  readonly clicks: Counter<string>;
  /** Request latency histogram. */
  readonly httpDuration: Histogram<'method' | 'route' | 'status'>;

  constructor() {
    this.registry.setDefaultLabels({ app: 'linklytics-api' });
    collectDefaultMetrics({ register: this.registry });

    this.redirects = new Counter({
      name: 'linklytics_redirects_total',
      help: 'Total redirect lookups by result',
      labelNames: ['result'],
      registers: [this.registry],
    });
    this.clicks = new Counter({
      name: 'linklytics_clicks_recorded_total',
      help: 'Total click events recorded',
      registers: [this.registry],
    });
    this.httpDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
      registers: [this.registry],
    });
  }

  metrics(): Promise<string> {
    return this.registry.metrics();
  }

  get contentType(): string {
    return this.registry.contentType;
  }
}

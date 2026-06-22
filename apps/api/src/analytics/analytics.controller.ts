import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { AnalyticsService, type LinkAnalytics } from './analytics.service';

const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 365;

@Controller('api/links')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get(':id/analytics')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('days') days?: string,
  ): Promise<LinkAnalytics> {
    const parsed = Number(days);
    const rangeDays = Number.isFinite(parsed)
      ? Math.min(Math.max(Math.trunc(parsed), 1), MAX_RANGE_DAYS)
      : DEFAULT_RANGE_DAYS;
    return this.analytics.getForLink(user.id, id, rangeDays);
  }
}

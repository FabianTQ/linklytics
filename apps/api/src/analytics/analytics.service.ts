import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LinksService } from '../links/links.service';

export interface TimeSeriesPoint {
  date: string; // YYYY-MM-DD
  count: number;
}
export interface ReferrerBucket {
  referrer: string;
  count: number;
}
export interface GeoBucket {
  country: string;
  count: number;
}
export interface LinkAnalytics {
  linkId: string;
  rangeDays: number;
  totalClicks: number;
  timeSeries: TimeSeriesPoint[];
  topReferrers: ReferrerBucket[];
  geo: GeoBucket[];
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly links: LinksService,
  ) {}

  async getForLink(userId: string, linkId: string, rangeDays: number): Promise<LinkAnalytics> {
    // Ownership check (throws 404 for links the user does not own).
    await this.links.findOneOwned(userId, linkId);

    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
    const [timeSeries, topReferrers, geo, totalClicks] = await Promise.all([
      this.timeSeries(linkId, since),
      this.topReferrers(linkId),
      this.geoBreakdown(linkId),
      this.prisma.clickEvent.count({ where: { linkId } }),
    ]);

    return { linkId, rangeDays, totalClicks, timeSeries, topReferrers, geo };
  }

  private async timeSeries(linkId: string, since: Date): Promise<TimeSeriesPoint[]> {
    // Cheap indexed read from the daily rollup instead of aggregating the full
    // click_events table on every request.
    const sinceDay = new Date(
      Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate()),
    );
    const rows = await this.prisma.clickDaily.findMany({
      where: { linkId, day: { gte: sinceDay } },
      orderBy: { day: 'asc' },
    });
    return rows.map((row) => ({
      date: row.day.toISOString().slice(0, 10),
      count: row.count,
    }));
  }

  private async topReferrers(linkId: string): Promise<ReferrerBucket[]> {
    const grouped = await this.prisma.clickEvent.groupBy({
      by: ['referrer'],
      where: { linkId },
      _count: { _all: true },
    });
    return grouped
      .map((group) => ({ referrer: group.referrer ?? 'direct', count: group._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private async geoBreakdown(linkId: string): Promise<GeoBucket[]> {
    const grouped = await this.prisma.clickEvent.groupBy({
      by: ['country'],
      where: { linkId },
      _count: { _all: true },
    });
    return grouped
      .map((group) => ({ country: group.country ?? 'unknown', count: group._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}

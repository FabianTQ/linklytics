import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    const rows = await this.prisma.$queryRaw<Array<{ day: Date; count: bigint }>>(Prisma.sql`
      SELECT date_trunc('day', occurred_at) AS day, count(*)::bigint AS count
      FROM click_events
      WHERE link_id = ${linkId}::uuid AND occurred_at >= ${since}
      GROUP BY day
      ORDER BY day ASC
    `);
    return rows.map((row) => ({
      date: row.day.toISOString().slice(0, 10),
      count: Number(row.count),
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

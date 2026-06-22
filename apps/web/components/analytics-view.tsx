import type { LinkAnalytics } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function Stat({ label, value }: { label: string; value: string | number }): React.ReactElement {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
}): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{item.label}</span>
                <span className="tabular-nums text-muted-foreground">{item.count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsView({ data }: { data: LinkAnalytics }): React.ReactElement {
  const max = Math.max(1, ...data.timeSeries.map((point) => point.count));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total clicks" value={data.totalClicks} />
        <Stat label="Window" value={`${data.rangeDays} days`} />
        <Stat label="Distinct referrers" value={data.topReferrers.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clicks over time</CardTitle>
        </CardHeader>
        <CardContent>
          {data.timeSeries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clicks recorded yet.</p>
          ) : (
            <div className="flex h-40 items-end gap-1">
              {data.timeSeries.map((point) => (
                <div
                  key={point.date}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${point.date}: ${point.count}`}
                >
                  <div
                    className="w-full rounded-t bg-primary"
                    style={{ height: `${(point.count / max) * 100}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{point.date.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <BreakdownCard
          title="Top referrers"
          items={data.topReferrers.map((r) => ({ label: r.referrer, count: r.count }))}
        />
        <BreakdownCard
          title="Geography"
          items={data.geo.map((g) => ({ label: g.country, count: g.count }))}
        />
      </div>
    </div>
  );
}

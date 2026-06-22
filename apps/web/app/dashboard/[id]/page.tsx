'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { LinkAnalytics } from '@/lib/types';
import { AnalyticsView } from '@/components/analytics-view';

export default function AnalyticsPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = useState<LinkAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .analytics(id)
      .then((result) => {
        if (active) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Failed to load analytics.');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← Back to links
      </Link>
      {loading ? (
        <p className="text-muted-foreground">Loading analytics…</p>
      ) : error ? (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      ) : data ? (
        <AnalyticsView data={data} />
      ) : null}
    </div>
  );
}

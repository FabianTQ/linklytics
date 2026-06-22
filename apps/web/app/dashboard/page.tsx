'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { LinkView } from '@/lib/types';
import { CreateLinkForm } from '@/components/create-link-form';
import { LinksList } from '@/components/links-list';

export default function DashboardPage(): React.ReactElement {
  const [links, setLinks] = useState<LinkView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      setLinks(await api.listLinks());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load links.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Your links</h1>
        <p className="text-muted-foreground">Create a short link and track its performance.</p>
      </div>

      <CreateLinkForm onCreated={(link) => setLinks((prev) => [link, ...prev])} />

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <LinksList
          links={links}
          onDeleted={(id) => setLinks((prev) => prev.filter((link) => link.id !== id))}
        />
      )}
    </div>
  );
}

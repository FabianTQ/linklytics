'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { LinkView } from '@/lib/types';
import { CreateLinkForm } from '@/components/create-link-form';
import { LinksList } from '@/components/links-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 10;

export default function DashboardPage(): React.ReactElement {
  const [links, setLinks] = useState<LinkView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPage: number, query: string): Promise<void> => {
    setLoading(true);
    try {
      const res = await api.listLinks({
        page: nextPage,
        pageSize: PAGE_SIZE,
        q: query || undefined,
      });
      setLinks(res.items);
      setTotal(res.total);
      setPage(res.page);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load links.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + debounced search.
  useEffect(() => {
    const timer = setTimeout(() => void load(1, q), 300);
    return () => clearTimeout(timer);
  }, [q, load]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Your links</h1>
        <p className="text-muted-foreground">Create a short link and track its performance.</p>
      </div>

      <CreateLinkForm onCreated={() => void load(1, q)} />

      <Input
        placeholder="Search links…"
        aria-label="Search links"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <>
          <LinksList
            links={links}
            onDeleted={() => void load(page, q)}
            onUpdated={(updated) =>
              setLinks((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
            }
          />
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {page} of {totalPages} · {total} links
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => void load(page - 1, q)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => void load(page + 1, q)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

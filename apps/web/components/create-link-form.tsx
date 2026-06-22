'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { LinkView } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CreateLinkForm({
  onCreated,
}: {
  onCreated: (link: LinkView) => void;
}): React.ReactElement {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const link = await api.createLink(url);
      onCreated(link);
      setUrl('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="url"
          required
          placeholder="https://example.com/a/very/long/url"
          aria-label="Destination URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Shorten'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

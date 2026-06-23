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
  const [customSlug, setCustomSlug] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const link = await api.createLink({
        originalUrl: url,
        customSlug: customSlug.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      onCreated(link);
      setUrl('');
      setCustomSlug('');
      setExpiresAt('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
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

      <button
        type="button"
        className="text-xs text-muted-foreground hover:underline"
        onClick={() => setAdvanced((a) => !a)}
      >
        {advanced ? '− Hide options' : '+ Custom slug & expiry'}
      </button>

      {advanced && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            placeholder="custom-slug (optional)"
            aria-label="Custom slug"
            value={customSlug}
            onChange={(e) => setCustomSlug(e.target.value)}
          />
          <Input
            type="datetime-local"
            aria-label="Expires at"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

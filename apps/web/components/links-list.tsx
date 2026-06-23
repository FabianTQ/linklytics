'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { copyToClipboard } from '@/lib/clipboard';
import type { LinkView } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QrButton } from '@/components/qr-button';

export function LinksList({
  links,
  onDeleted,
  onUpdated,
}: {
  links: LinkView[];
  onDeleted: (id: string) => void;
  onUpdated: (link: LinkView) => void;
}): React.ReactElement {
  if (links.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        No links yet — create your first one above.
      </Card>
    );
  }
  return (
    <ul className="space-y-3">
      {links.map((link) => (
        <LinkRow key={link.id} link={link} onDeleted={onDeleted} onUpdated={onUpdated} />
      ))}
    </ul>
  );
}

function LinkRow({
  link,
  onDeleted,
  onUpdated,
}: {
  link: LinkView;
  onDeleted: (id: string) => void;
  onUpdated: (link: LinkView) => void;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const expired = link.expiresAt !== null && new Date(link.expiresAt).getTime() <= Date.now();
  const unavailable = !link.isActive || expired;

  async function onCopy(): Promise<void> {
    if (await copyToClipboard(link.shortUrl)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  async function onToggle(): Promise<void> {
    setBusy(true);
    try {
      onUpdated(await api.updateLink(link.id, { isActive: !link.isActive }));
    } catch {
      // ignore; row stays as-is
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(): Promise<void> {
    setBusy(true);
    try {
      await api.deleteLink(link.id);
      onDeleted(link.id);
    } catch {
      setBusy(false);
    }
  }

  return (
    <Card
      className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"
      data-testid="link-row"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <a
            href={link.shortUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            {link.shortUrl}
          </a>
          {unavailable && (
            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
              {expired ? 'expired' : 'inactive'}
            </span>
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">{link.originalUrl}</p>
      </div>
      <div className="flex flex-wrap shrink-0 items-center gap-2">
        <span className="text-sm tabular-nums text-muted-foreground">{link.clickCount} clicks</span>
        <Button variant="outline" size="sm" onClick={onCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
        <QrButton url={link.shortUrl} />
        <Button variant="outline" size="sm" onClick={onToggle} disabled={busy}>
          {link.isActive ? 'Disable' : 'Enable'}
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/${link.id}`}>Analytics</Link>
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete} disabled={busy}>
          Delete
        </Button>
      </div>
    </Card>
  );
}

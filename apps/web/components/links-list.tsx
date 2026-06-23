'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { copyToClipboard } from '@/lib/clipboard';
import type { LinkView } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function LinksList({
  links,
  onDeleted,
}: {
  links: LinkView[];
  onDeleted: (id: string) => void;
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
        <LinkRow key={link.id} link={link} onDeleted={onDeleted} />
      ))}
    </ul>
  );
}

function LinkRow({
  link,
  onDeleted,
}: {
  link: LinkView;
  onDeleted: (id: string) => void;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onCopy(): Promise<void> {
    if (await copyToClipboard(link.shortUrl)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  async function onDelete(): Promise<void> {
    setDeleting(true);
    try {
      await api.deleteLink(link.id);
      onDeleted(link.id);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <Card
      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
      data-testid="link-row"
    >
      <div className="min-w-0">
        <a
          href={link.shortUrl}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline"
        >
          {link.shortUrl}
        </a>
        <p className="truncate text-sm text-muted-foreground">{link.originalUrl}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm tabular-nums text-muted-foreground">{link.clickCount} clicks</span>
        <Button variant="outline" size="sm" onClick={onCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/${link.id}`}>Analytics</Link>
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete} disabled={deleting}>
          {deleting ? '…' : 'Delete'}
        </Button>
      </div>
    </Card>
  );
}

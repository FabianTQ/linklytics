'use client';

import { useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';

export function QrButton({ url }: { url: string }): React.ReactElement {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  async function open(): Promise<void> {
    setDataUrl(await QRCode.toDataURL(url, { width: 240, margin: 1 }));
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={open}>
        QR
      </Button>
      {dataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setDataUrl(null)}
        >
          <div
            className="rounded-lg border bg-card p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} alt="QR code for the short link" width={240} height={240} />
            <p className="mx-auto mt-2 max-w-[240px] truncate text-xs text-muted-foreground">
              {url}
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={dataUrl} download="linklytics-qr.png">
                  Download
                </a>
              </Button>
              <Button size="sm" onClick={() => setDataUrl(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

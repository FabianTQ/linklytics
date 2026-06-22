import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Linklytics — URL shortener with analytics',
  description: 'Create short links and track clicks over time, referrers and geography.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}

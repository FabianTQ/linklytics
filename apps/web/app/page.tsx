import Link from 'next/link';

export default function HomePage(): React.ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-4">
        <h1 className="text-5xl font-bold tracking-tight">Linklytics</h1>
        <p className="text-lg text-muted-foreground">
          Shorten URLs and watch the clicks roll in — time series, top referrers and geography.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/register"
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-input px-5 py-2.5 text-sm font-medium hover:bg-accent"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}

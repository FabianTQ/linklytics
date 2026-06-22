import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Self-contained server output for a small Docker runtime image.
  output: 'standalone',
  // Trace workspace deps from the monorepo root (pnpm).
  outputFileTracingRoot: path.join(__dirname, '../../'),
  reactStrictMode: true,
};

export default nextConfig;

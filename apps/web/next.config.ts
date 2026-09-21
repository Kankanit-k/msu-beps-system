import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Workspace packages consumed as raw TS source (package.json "main" points at src/index.ts) —
  // Next needs to compile these itself rather than treat them as pre-built JS.
  transpilePackages: ['@beps/calc-engine', '@beps/shared-types'],
  // Subpath the app is served under in prod (e.g. '/beps'), read from BASEPATH — see
  // .env.example. Must stay in sync with NEXT_PUBLIC_BASEPATH (origin + this same path).
  basePath: process.env.BASEPATH || '',
  trailingSlash: true,
  // Default position (bottom-left) sits on top of the sidebar's developer-credits card.
  devIndicators: { position: 'bottom-right' },
};

export default nextConfig;

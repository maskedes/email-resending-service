import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the Turbopack root to this package so Turbopack does not walk up to
  // parent directories and pick up unrelated lockfiles (home dir / repo root).
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
  // Allow the backend to be reached from Vercel serverless functions
  async rewrites() {
    return [];
  },
};

export default nextConfig;

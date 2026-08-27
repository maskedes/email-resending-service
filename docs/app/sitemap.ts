import type { MetadataRoute } from 'next';

// Production docs URL. Update this if a custom domain is later attached.
const BASE_URL = 'https://envoy-docs-liart.vercel.app';

// All publicly indexable docs pages (matches the static routes built by Next.js).
const paths = [
  '', // Introduction / landing
  '/quickstart',
  '/authentication',
  '/cli',
  '/cli/send',
  '/cli/domains',
  '/cli/keys',
  '/cli/logs',
  '/api/send',
  '/api/list',
  '/api/stats',
  '/api/domains',
  '/sdks',
  '/sdks/node',
  '/sdks/python',
  '/sdks/go',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return paths.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.7,
  }));
}

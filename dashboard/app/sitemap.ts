import type { MetadataRoute } from 'next';

// Production dashboard URL. Update this if a custom domain is later attached.
const BASE_URL = 'https://mailenvoy.qd.je';

// All publicly indexable pages (matches the PUBLIC_PATHS in middleware.ts).
const paths = [
  '', // Landing / home
  '/documentation',
  '/api-reference',
  '/help',
  '/contacts',
  '/support',
  '/ceo-bio',
  '/self-hosted',
  '/self-hosted-setup',
  '/rest-api',
  '/smtp-relay',
  '/api-key-auth',
  '/delivery-tracking',
  '/bullmq-queue',
  '/login',
  '/signup',
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

import type { MetadataRoute } from 'next';

const BASE_URL = 'https://mailenvoy.qd.je';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Keep auth and app (post-login) routes out of the index — they are
      // either duplicate-title ?next variants or empty shells for crawlers.
      disallow: [
        '/login',
        '/signup',
        '/forgot-password',
        '/reset-password',
        '/overview',
        '/auth/',
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}

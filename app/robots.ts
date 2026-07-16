import type { MetadataRoute } from 'next';
import { getSiteUrl, PRIVATE_PATH_PREFIXES } from '@/lib/seo/site';

/**
 * robots.txt — capa SEO + privacidad:
 * indexar solo marketing/legal; bloquear expediente y APIs.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/contacto', '/legal/'],
        disallow: [...PRIVATE_PATH_PREFIXES, '/_next/'],
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

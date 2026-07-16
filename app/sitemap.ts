import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/site';

/** Solo URLs públicas — nada de dashboard ni documentos. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date('2026-07-16');

  const paths: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[0]['changeFrequency'] }[] =
    [
      { path: '/', priority: 1, changeFrequency: 'weekly' },
      { path: '/contacto', priority: 0.8, changeFrequency: 'monthly' },
      { path: '/legal/aviso-legal', priority: 0.4, changeFrequency: 'monthly' },
      { path: '/legal/privacy', priority: 0.5, changeFrequency: 'monthly' },
      { path: '/legal/terms', priority: 0.4, changeFrequency: 'monthly' },
      { path: '/legal/cookies', priority: 0.3, changeFrequency: 'monthly' },
      { path: '/legal/mapa-del-sitio', priority: 0.3, changeFrequency: 'monthly' },
    ];

  return paths.map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path === '/' ? '' : path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}

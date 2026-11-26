import type { MetadataRoute } from 'next';

import { fetchPublicWorkIds } from '@/lib/public-api';

// Home + every visible obra. Regenerated at most every 10 minutes; a work
// hidden after that still answers 404 on its page.
export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const works = await fetchPublicWorkIds();
  return [
    { url: 'https://inkduel.com/', changeFrequency: 'weekly', priority: 1 },
    ...works.map((work) => ({
      url: `https://inkduel.com/w/${encodeURIComponent(work.id)}`,
      lastModified: work.lastActivityAt ? new Date(work.lastActivityAt) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}

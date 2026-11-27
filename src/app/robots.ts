import type { MetadataRoute } from 'next';

// Public pages are crawlable (founder decision F3, 2026-11-26: works are
// indexed). The signed-in area also sends X-Robots-Tag: noindex (proxy.ts);
// listing it here keeps crawlers from wasting requests on login redirects.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/login', '/me', '/stories', '/ranked', '/profile/', '/work/', '/duels/', '/api/', '/w/*/c/'],
      },
    ],
    sitemap: 'https://inkduel.com/sitemap.xml',
  };
}

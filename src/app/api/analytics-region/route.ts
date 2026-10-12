import { analyticsAllowedForCountry } from '@/lib/analytics';

// Tells the browser whether GA4 may load for this visitor, from Vercel's geo
// header (src/lib/analytics.ts). A tiny dynamic endpoint so every public page
// stays static and CDN-cacheable. Geolocation is not consent: this only keeps
// GA4 off where it would need consent we do not collect yet.
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  // ANALYTICS_DEBUG_COUNTRY (server-only) stands in for the header off Vercel,
  // for local QA; on Vercel the real header always wins.
  const country = request.headers.get('x-vercel-ip-country') ?? process.env.ANALYTICS_DEBUG_COUNTRY ?? null;
  return Response.json(
    { measure: analyticsAllowedForCountry(country) },
    { headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' } },
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { trackPageView } from '@/lib/analytics';

/**
 * One sanitized page_view per pathname, on every page (src/lib/analytics.ts).
 * GA4 does not load until the first page whose real URL carries no secret.
 */
export function AnalyticsStart() {
  const pathname = usePathname();
  useEffect(() => {
    trackPageView();
  }, [pathname]);
  return null;
}

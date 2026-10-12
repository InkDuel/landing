import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { connection } from 'next/server';
import type { ReactNode } from 'react';

import { SessionRoot } from '@/components/session/session-root';
import { analyticsAllowedForCountry } from '@/lib/analytics';
import { resolveRequestLocale } from '@/lib/request-locale';

// The signed-in area renders per request: the CSP nonce from src/proxy.ts
// only reaches pages rendered for that request. Nothing private is rendered
// on the server; data loads in the browser with the user's token.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function SessionLayout({ children }: { children: ReactNode }) {
  await connection();
  const { locale } = await resolveRequestLocale(undefined);
  // GA4 user_id only where the visitor's country (Vercel's geo header) is known
  // and outside the consent regions; see src/lib/analytics.ts.
  const identifyAllowed = analyticsAllowedForCountry((await headers()).get('x-vercel-ip-country'));
  return (
    <SessionRoot initialLocale={locale} identifyAllowed={identifyAllowed}>
      {children}
    </SessionRoot>
  );
}

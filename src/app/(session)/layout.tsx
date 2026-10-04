import type { Metadata } from 'next';
import { connection } from 'next/server';
import type { ReactNode } from 'react';

import { SessionRoot } from '@/components/session/session-root';
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
  return <SessionRoot initialLocale={locale}>{children}</SessionRoot>;
}

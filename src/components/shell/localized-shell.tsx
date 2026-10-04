'use client';

import type { ReactNode } from 'react';

import { type Locale } from '@/lib/i18n';
import { useLocale } from '@/lib/use-locale';

import { InkPage, PageColumn, type VisualContext } from './ink-page';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

/**
 * Client shell for server-rendered pages: resolves the locale with the
 * shared mechanism and renders header, footer and the page body for it.
 */
export function LocalizedShell({
  initialLocale,
  resolveOnClient,
  context,
  width,
  children,
}: {
  initialLocale: Locale;
  resolveOnClient: boolean;
  context: VisualContext;
  width: 'reading' | 'product' | 'wide';
  children: (locale: Locale) => ReactNode;
}) {
  const [locale, setLocale] = useLocale({ initial: initialLocale, resolveOnClient });
  return (
    <InkPage context={context} lang={locale}>
      <SiteHeader locale={locale} onLocaleChange={setLocale} />
      <main className="flex-1 pt-4 pb-16">
        <PageColumn width={width}>{children(locale)}</PageColumn>
      </main>
      <SiteFooter locale={locale} />
    </InkPage>
  );
}

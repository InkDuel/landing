import 'server-only';

import { headers } from 'next/headers';

import { DEFAULT_LOCALE, type Locale, localeFromAcceptLanguage, parseLocale } from './i18n';

/**
 * Locale of a server-rendered request: `?lang=` → Accept-Language → English.
 * `explicit` tells the client not to override a `?lang=` link with the
 * visitor's stored preference.
 */
export async function resolveRequestLocale(
  lang: string | string[] | undefined,
): Promise<{ locale: Locale; explicit: boolean }> {
  const fromQuery = parseLocale(lang);
  if (fromQuery) return { locale: fromQuery, explicit: true };
  const fromHeader = localeFromAcceptLanguage((await headers()).get('accept-language'));
  return { locale: fromHeader ?? DEFAULT_LOCALE, explicit: false };
}

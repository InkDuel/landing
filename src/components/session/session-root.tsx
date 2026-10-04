'use client';

import { createContext, type ReactNode, useContext } from 'react';

import type { Locale } from '@/lib/i18n';
import { SessionProvider } from '@/lib/session/auth-context';
import { useLocale } from '@/lib/use-locale';

type LocaleValue = { locale: Locale; setLocale: (locale: Locale) => void };

const LocaleContext = createContext<LocaleValue | null>(null);

/** Locale (shared mechanism) and session for every signed-in page. */
export function SessionRoot({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, setLocale] = useLocale({ initial: initialLocale, resolveOnClient: true });
  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <SessionProvider locale={locale}>{children}</SessionProvider>
    </LocaleContext.Provider>
  );
}

export function useSessionLocale(): LocaleValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useSessionLocale outside SessionRoot');
  return value;
}

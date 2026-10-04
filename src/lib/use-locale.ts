'use client';

import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale, parseLocale } from './i18n';

function readStoredLocale(): Locale | null {
  try {
    return parseLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return null;
  }
}

function storeLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
}

/** `?lang=` → stored preference → browser language → English. */
export function resolveClientLocale(): Locale {
  return (
    parseLocale(new URLSearchParams(window.location.search).get('lang')) ??
    readStoredLocale() ??
    parseLocale(window.navigator.language.slice(0, 2)) ??
    DEFAULT_LOCALE
  );
}

type Options = {
  /** Locale rendered on the server (from `?lang=` or the request). */
  initial?: Locale;
  /**
   * Re-resolve on the client. False when the server already had an explicit
   * `?lang=`, so the stored preference does not override the link.
   */
  resolveOnClient?: boolean;
};

/**
 * The page locale. Keeps `<html lang>` in sync and remembers the visitor's
 * choice, like the language picker always did.
 */
export function useLocale({ initial = DEFAULT_LOCALE, resolveOnClient = true }: Options = {}) {
  const [locale, setLocaleState] = useState<Locale>(initial);
  const [resolved, setResolved] = useState(!resolveOnClient);

  useEffect(() => {
    if (resolveOnClient) {
      setLocaleState(resolveClientLocale());
      setResolved(true);
    }
  }, [resolveOnClient]);

  useEffect(() => {
    document.documentElement.lang = locale;
    if (resolved) storeLocale(locale);
  }, [locale, resolved]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setResolved(true);
  }, []);

  return [locale, setLocale] as const;
}

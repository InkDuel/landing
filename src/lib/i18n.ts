// Locale handling shared by every page. Launch languages only (es, en, pt);
// anything else falls back to English, as in the app.

export type Locale = 'es' | 'en' | 'pt';

export const LOCALES: readonly Locale[] = ['es', 'en', 'pt'];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_STORAGE_KEY = 'inkduel-locale';

export const LOCALE_LABELS: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
};

export function isLocale(value: unknown): value is Locale {
  return value === 'es' || value === 'en' || value === 'pt';
}

/** Locale from a `?lang=` value (string or repeated param), or null. */
export function parseLocale(value: string | string[] | null | undefined): Locale | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return isLocale(candidate) ? candidate : null;
}

/** First supported language of an Accept-Language header, or null. */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((param) => param.trim().startsWith('q='));
      return { tag: tag.trim().slice(0, 2).toLowerCase(), q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((entry) => entry.tag && !Number.isNaN(entry.q))
    .sort((a, b) => b.q - a.q);
  return ranked.map((entry) => entry.tag).find(isLocale) ?? null;
}

/** Appends `?lang=` to an internal path, keeping existing query params. */
export function withLang(path: string, locale: Locale): string {
  const [base, hash] = path.split('#');
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}lang=${locale}${hash ? `#${hash}` : ''}`;
}

/** Locale for dates and numbers. */
export const INTL_LOCALE: Record<Locale, string> = {
  es: 'es-ES',
  en: 'en-US',
  pt: 'pt-BR',
};

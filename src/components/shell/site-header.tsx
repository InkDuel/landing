'use client';

import Link from 'next/link';

import { InkAppIcon, InkWordmark } from '@/components/ink/brand';
import { cx } from '@/components/ink/cx';
import { type Locale, withLang } from '@/lib/i18n';
import { SITE_COPY } from '@/lib/site-copy';

import { LanguageSwitcher } from './language-switcher';
import { PageColumn } from './ink-page';
import { HeaderWebAction } from './web-entry';

export type HeaderNavItem = { href: string; label: string };

/**
 * Web-only bar (the app navigates from the bottom bar): logo, optional
 * in-page navigation on wide screens, the language switcher and the way into
 * the signed-in web.
 */
export function SiteHeader({
  locale,
  onLocaleChange,
  nav,
  width = 'wide',
  className,
}: {
  locale: Locale;
  onLocaleChange?: (locale: Locale) => void;
  nav?: HeaderNavItem[];
  width?: 'reading' | 'product' | 'wide';
  className?: string;
}) {
  const copy = SITE_COPY[locale];
  return (
    <header className={cx('py-4', className)}>
      <PageColumn width={width} className="flex items-center justify-between gap-2 sm:gap-4">
        <Link
          href={withLang('/', locale)}
          aria-label={copy.homeAria}
          className="ink-focus inline-flex min-h-11 items-center gap-3 rounded-control"
        >
          <InkAppIcon size={36} />
          <InkWordmark size="sm" className="max-[400px]:hidden" />
        </Link>

        {nav && nav.length > 0 ? (
          <nav aria-label={copy.homeAria} className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="ink-focus ink-dim rounded-control px-3 py-2 type-button-sm text-[14px] text-secondary hover:text-primary"
              >
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          {onLocaleChange ? (
            <LanguageSwitcher locale={locale} onChange={onLocaleChange} label={copy.languageLabel} />
          ) : null}
          <HeaderWebAction locale={locale} />
        </div>
      </PageColumn>
    </header>
  );
}

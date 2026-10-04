import Link from 'next/link';

import { cx } from '@/components/ink/cx';
import { type Locale, withLang } from '@/lib/i18n';
import { CHALLENGE_TERMS_PATH, SITE_COPY } from '@/lib/site-copy';

import { PageColumn } from './ink-page';

export function SiteFooter({
  locale,
  width = 'wide',
  className,
}: {
  locale: Locale;
  width?: 'reading' | 'product' | 'wide';
  className?: string;
}) {
  const copy = SITE_COPY[locale];
  const links = [
    { href: withLang('/about', locale), label: copy.about },
    { href: withLang(CHALLENGE_TERMS_PATH, locale), label: copy.challengeTerms },
    { href: withLang('/privacy', locale), label: copy.privacyPolicy },
  ];
  return (
    <footer className={cx('mt-auto border-t border-hairline border-divider py-6', className)}>
      <PageColumn width={width} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="type-caption text-secondary">
          © {new Date().getFullYear()} InkDuel. {copy.footerTagline}
        </p>
        <nav aria-label={copy.footerNavLabel}>
          <ul className="-mx-2 flex flex-wrap gap-x-1 list-none p-0 m-0">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="ink-focus ink-dim inline-flex min-h-11 items-center rounded-control px-2 type-caption text-secondary underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </PageColumn>
    </footer>
  );
}

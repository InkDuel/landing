'use client';

import Link from 'next/link';

import { cx } from '@/components/ink/cx';
import { ChevronLeftIcon } from '@/components/ink/icons';
import { InkHeadline } from '@/components/ink/ink-headline';
import { InkCard } from '@/components/ink/ink-card';
import { Kicker } from '@/components/ink/kicker';
import { LocalizedShell } from '@/components/shell/localized-shell';
import type { VisualContext } from '@/components/shell/ink-page';
import { DEFAULT_LOCALE, type Locale, withLang } from '@/lib/i18n';

// Legal and policy documents (privacy, account deletion, challenge terms).
// Clarity first (18 - Cuenta y Sistema): the text is shown exactly as
// written; only the presentation belongs to the system.

export type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  /** Internal link shown after the section, e.g. /delete-account. */
  cta?: { href: string; label: string };
};

export type LegalCopy = {
  backToHome: string;
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdatedLabel: string;
  lastUpdatedValue: string;
  contactLabel: string;
  contactValue: string;
  sections: LegalSection[];
};

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="ink-focus ink-dim -ml-2 inline-flex min-h-11 items-center gap-1 rounded-control pr-3 pl-1 type-button-sm text-[14px] text-secondary"
    >
      <ChevronLeftIcon size={20} />
      {label}
    </Link>
  );
}

function LegalDocument({ copy, locale }: { copy: LegalCopy; locale: Locale }) {
  return (
    <article className="flex flex-col gap-8 pt-2">
      <header className="flex flex-col gap-4">
        <BackLink href={withLang('/', locale)} label={copy.backToHome} />
        <Kicker>{copy.eyebrow}</Kicker>
        <InkHeadline text={copy.title} size="title-page-lg" />
        <p className="type-body text-secondary">{copy.intro}</p>
        <dl className="m-0 mt-2 grid gap-3 sm:grid-cols-2">
          <InkCard padding="p-[14px]" className="flex flex-col gap-1">
            <dt className="type-label text-secondary">{copy.lastUpdatedLabel}</dt>
            <dd className="m-0 type-body-strong text-primary">{copy.lastUpdatedValue}</dd>
          </InkCard>
          <InkCard padding="p-[14px]" className="flex flex-col gap-1">
            <dt className="type-label text-secondary">{copy.contactLabel}</dt>
            <dd className="m-0 type-body-strong">
              <a
                href={`mailto:${copy.contactValue}`}
                className="ink-focus break-all text-blue underline-offset-4 hover:underline"
              >
                {copy.contactValue}
              </a>
            </dd>
          </InkCard>
        </dl>
      </header>

      <div className="flex flex-col">
        {copy.sections.map((section, index) => (
          <section
            key={section.title}
            className={cx('flex flex-col gap-3 py-6', index > 0 && 'border-t border-divider')}
          >
            <h2 className="type-title-section text-primary">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="type-body text-primary">
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="m-0 flex flex-col gap-2 p-0">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex list-none gap-3 type-body text-primary">
                    <span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 rounded-full bg-inverse" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {section.cta ? (
              <p>
                <Link
                  href={withLang(section.cta.href, locale)}
                  className="ink-focus type-button-sm text-blue underline-offset-4 hover:underline"
                >
                  {section.cta.label}
                </Link>
              </p>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  );
}

export function LegalPage({
  copies,
  context = 'product',
  initialLocale = DEFAULT_LOCALE,
  resolveOnClient = true,
}: {
  copies: Record<Locale, LegalCopy>;
  context?: VisualContext;
  initialLocale?: Locale;
  resolveOnClient?: boolean;
}) {
  return (
    <LocalizedShell initialLocale={initialLocale} resolveOnClient={resolveOnClient} context={context} width="reading">
      {(locale) => <LegalDocument copy={copies[locale]} locale={locale} />}
    </LocalizedShell>
  );
}

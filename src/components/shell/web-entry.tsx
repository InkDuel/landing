'use client';

import type { ReactNode } from 'react';

import { cx } from '@/components/ink/cx';
import { ArrowRightIcon, BoltIcon, BookOpenIcon, NoteIcon, PencilIcon } from '@/components/ink/icons';
import { inkButtonClasses } from '@/components/ink/ink-button';
import { InkCard } from '@/components/ink/ink-card';
import { Kicker } from '@/components/ink/kicker';
import { track } from '@/lib/analytics';
import { type Locale, withLang } from '@/lib/i18n';
import { SITE_COPY } from '@/lib/site-copy';
import { useWebSessionHint } from '@/lib/web-session-hint';

import { PageColumn } from './ink-page';
import { StoreButtons } from './store-buttons';

// The way from the public pages into the signed-in web app. Always a plain
// <a>: a full page load, so /login and the signed-in area get their own
// per-request CSP from src/proxy.ts (a client-side navigation would run them
// under the public static policy, without the Firebase auth frame).

export type WebEntryPoint = 'header' | 'hero' | 'web_section' | 'final_cta';

function WebEntryLink({
  locale,
  entryPoint,
  className,
  children,
}: {
  locale: Locale;
  entryPoint: WebEntryPoint;
  className?: string;
  children: (signedIn: boolean) => ReactNode;
}) {
  const signedIn = useWebSessionHint();
  // Signed in, the same first page as after a sign-in (postLoginHref).
  const href = withLang(signedIn ? '/stories' : '/login', locale);
  return (
    <a href={href} className={className} onClick={() => track('web_entry_tapped', { entry_point: entryPoint, signed_in: signedIn })}>
      {children(signedIn)}
    </a>
  );
}

/**
 * Header action: «Inicia sesión», or «Ir a InkDuel» once this browser has
 * signed in. Outlined, so the page keeps one yellow action.
 */
export function HeaderWebAction({ locale }: { locale: Locale }) {
  const copy = SITE_COPY[locale].web;
  return (
    <WebEntryLink
      locale={locale}
      entryPoint="header"
      className="ink-focus ink-dim inline-flex min-h-11 shrink-0 items-center justify-center rounded-control border-brand border-outline bg-surface px-4 py-2 type-button-sm whitespace-nowrap text-primary no-underline max-[400px]:px-3"
    >
      {(signedIn) => (signedIn ? copy.goToApp : copy.signIn)}
    </WebEntryLink>
  );
}

/** The yellow web button, as tall as the store buttons. */
export function WebCtaButton({
  locale,
  entryPoint,
  className,
}: {
  locale: Locale;
  entryPoint: WebEntryPoint;
  className?: string;
}) {
  const copy = SITE_COPY[locale].web;
  return (
    <WebEntryLink locale={locale} entryPoint={entryPoint} className={cx(inkButtonClasses({ variant: 'primary', fullWidth: false }), className)}>
      {(signedIn) => (
        <>
          <span>{signedIn ? copy.goToApp : copy.cta}</span>
          <ArrowRightIcon size={20} />
        </>
      )}
    </WebEntryLink>
  );
}

/** Web and the two stores side by side: neither door hides the other. */
export function WebAndStoreButtons({
  locale,
  entryPoint,
  className,
}: {
  locale: Locale;
  entryPoint: WebEntryPoint;
  className?: string;
}) {
  return (
    <div className={cx('flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center', className)}>
      <WebCtaButton locale={locale} entryPoint={entryPoint} className="min-w-[200px] max-sm:w-full" />
      <StoreButtons locale={locale} />
    </div>
  );
}

/** Hero actions: the web, the stores and what the web needs (an app account). */
export function HeroEntry({ locale }: { locale: Locale }) {
  const copy = SITE_COPY[locale].web;
  const signedIn = useWebSessionHint();
  return (
    <div className="mt-2 flex flex-col gap-3">
      <WebAndStoreButtons locale={locale} entryPoint="hero" />
      <p className="max-w-[52ch] type-caption text-secondary">{signedIn ? copy.lead : `${copy.lead} ${copy.noAccount}`}</p>
    </div>
  );
}

const FEATURE_ICONS = [BookOpenIcon, PencilIcon, NoteIcon, BoltIcon];

/** What the web holds today, with the same yellow button. */
export function WebSection({ locale }: { locale: Locale }) {
  const copy = SITE_COPY[locale].web;
  const signedIn = useWebSessionHint();
  return (
    <section aria-labelledby="web" className="scroll-mt-6 py-16">
      <PageColumn width="wide">
        <InkCard tone="brand" padding="p-6 sm:p-10" className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:gap-12">
          <div className="flex flex-col gap-4">
            <Kicker>{copy.kicker}</Kicker>
            <h2 id="web" className="type-title-page-lg text-primary">
              {copy.sectionTitle}
            </h2>
            <p className="type-body text-secondary">{copy.sectionBody}</p>
            <WebCtaButton locale={locale} entryPoint="web_section" className="mt-2 self-start max-sm:w-full" />
            {signedIn ? null : <p className="type-caption text-secondary">{copy.noAccount}</p>}
          </div>
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
            {copy.features.map((feature, index) => {
              const Icon = FEATURE_ICONS[index] ?? BookOpenIcon;
              return (
                <li key={feature.title} className="flex gap-3 rounded-card border-quiet border-divider bg-primary p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-control border-brand border-outline bg-yellow text-on-accent">
                    <Icon size={20} />
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="type-body-strong text-primary">{feature.title}</span>
                    <span className="type-caption text-secondary">{feature.body}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </InkCard>
      </PageColumn>
    </section>
  );
}

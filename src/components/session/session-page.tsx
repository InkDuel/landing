'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

import { InkAppIcon, InkWordmark } from '@/components/ink/brand';
import { cx } from '@/components/ink/cx';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { InkPage, PageColumn, type VisualContext } from '@/components/shell/ink-page';
import { LanguageSwitcher } from '@/components/shell/language-switcher';
import { SITE_COPY } from '@/lib/site-copy';
import { useSession } from '@/lib/session/auth-context';
import { SESSION_COPY } from '@/lib/session/copy';

import { useSessionLocale } from './session-root';

type Width = 'reading' | 'product' | 'wide';

/** Header of the signed-in area: logo, Historias · Perfil, language. */
function SessionHeader({ width }: { width: Width }) {
  const { locale, setLocale } = useSessionLocale();
  const { status } = useSession();
  const pathname = usePathname();
  const copy = SESSION_COPY[locale];
  const items =
    status === 'signedIn'
      ? [
          { href: '/stories', label: copy.nav.stories, active: pathname === '/stories' || pathname.startsWith('/work/') },
          { href: '/me', label: copy.nav.profile, active: pathname === '/me' },
        ]
      : [{ href: '/login', label: copy.nav.signIn, active: pathname === '/login' }];

  return (
    <header className="py-3">
      <PageColumn width={width} className="flex items-center gap-3">
        <Link
          href="/"
          aria-label={SITE_COPY[locale].homeAria}
          className="ink-focus inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control"
        >
          <InkAppIcon size={36} />
          <InkWordmark size="sm" className="max-[380px]:hidden" />
        </Link>
        <nav aria-label={copy.nav.mainLabel} className="flex flex-1 items-center justify-end gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              className={cx(
                'ink-focus ink-dim inline-flex min-h-11 items-center whitespace-nowrap rounded-control px-3 type-button-sm',
                item.active ? 'text-primary' : 'text-secondary hover:text-primary',
              )}
            >
              <span className={item.active ? 'ink-highlight' : undefined}>{item.label}</span>
            </Link>
          ))}
        </nav>
        <LanguageSwitcher locale={locale} onChange={setLocale} label={SITE_COPY[locale].languageLabel} />
      </PageColumn>
    </header>
  );
}

/** A signed-in page: context background, header and a centred column. */
export function SessionPage({
  context,
  width = 'product',
  className,
  children,
}: {
  context: VisualContext;
  width?: Width;
  className?: string;
  children: ReactNode;
}) {
  const { locale } = useSessionLocale();
  return (
    <InkPage context={context} lang={locale}>
      <SessionHeader width={width} />
      <main className={cx('flex-1 pb-20', className)}>
        <PageColumn width={width}>{children}</PageColumn>
      </main>
    </InkPage>
  );
}

/**
 * Renders [children] only for a signed-in InkDuel user. Anyone else goes to
 * /login, which brings them back here afterwards (the return path is
 * validated there).
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const { status, retry } = useSession();
  const { locale } = useSessionLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const mustSignIn = status === 'signedOut' || status === 'noAccount' || status === 'unconfigured';
  useEffect(() => {
    if (!mustSignIn) return;
    const query = searchParams.toString();
    const next = `${pathname}${query ? `?${query}` : ''}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [mustSignIn, pathname, router, searchParams]);

  if (status === 'signedIn') return <>{children}</>;
  if (status === 'error') {
    const copy = SESSION_COPY[locale].login;
    return (
      <InkInlineBanner
        className="mt-6"
        title={copy.userDataError}
        action={<InkTextAction onClick={retry}>{copy.retry}</InkTextAction>}
      />
    );
  }
  return <InkSkeleton className="mt-6" lines={4} label={SESSION_COPY[locale].common.loading} />;
}

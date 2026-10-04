'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';

import { AppleLogo, GoogleLogo } from '@/components/ink/icons';
import { InkButton } from '@/components/ink/ink-button';
import { InkHeadline } from '@/components/ink/ink-headline';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkTextField } from '@/components/ink/ink-text-field';
import { useSessionLocale } from '@/components/session/session-root';
import { SessionPage } from '@/components/session/session-page';
import { withLang } from '@/lib/i18n';
import { postLoginHref } from '@/lib/safe-redirect';
import { type SignInError, type SignInMethod, useSession } from '@/lib/session/auth-context';
import { SESSION_COPY } from '@/lib/session/copy';

// Acceso (15): plain paper, Apple and Google first, email below. Phase 1a
// signs existing accounts in only; creating one stays in the app.

export default function LoginPage() {
  const { locale } = useSessionLocale();
  const { status, signIn, retry } = useSession();
  const router = useRouter();
  const next = useSearchParams().get('next');
  const copy = SESSION_COPY[locale].login;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<SignInMethod | null>(null);
  const [error, setError] = useState<SignInError | 'missingFields' | null>(null);

  useEffect(() => {
    if (status === 'signedIn') router.replace(postLoginHref(next));
  }, [status, next, router]);

  const unavailable = status === 'unconfigured';
  const blocked = unavailable || status === 'loading' || status === 'signedIn';
  // Each method stays clickable only while no other one is in progress.
  const disabledFor = (method: SignInMethod) => blocked || (busy !== null && busy !== method);

  async function run(method: SignInMethod) {
    setError(null);
    if (method === 'email' && (!email.trim() || !password)) {
      setError('missingFields');
      return;
    }
    setBusy(method);
    const result = await signIn(method, method === 'email' ? { email, password } : undefined);
    setBusy(null);
    if (result && result !== 'cancelled') setError(result);
    if (method === 'email') setPassword('');
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run('email');
  }

  const errorText = error === 'missingFields' ? copy.missingFields : error ? copy.errors[error] : null;

  return (
    <SessionPage context="product" className="pt-6">
      <div className="mx-auto flex max-w-[420px] flex-col gap-6">
        <div className="flex flex-col gap-3">
          <InkHeadline text={copy.title} size="title-page" />
          <p className="type-body text-secondary">{copy.subtitle}</p>
        </div>

        {unavailable ? (
          <InkInlineBanner tone="info" title={copy.unconfiguredTitle} detail={copy.unconfiguredBody} />
        ) : null}
        {status === 'noAccount' ? (
          <InkInlineBanner tone="notice" title={copy.noAccountTitle} detail={copy.noAccountBody} />
        ) : null}
        {status === 'error' ? (
          <InkInlineBanner
            title={copy.userDataError}
            action={
              <button type="button" onClick={retry} className="ink-focus type-button-sm text-[14px] text-blue">
                {copy.retry}
              </button>
            }
          />
        ) : null}

        <div className="flex flex-col gap-3">
          <InkButton
            variant="inverse"
            leading={<AppleLogo size={20} />}
            disabled={disabledFor('apple')}
            busy={busy === 'apple'}
            onClick={() => void run('apple')}
          >
            {copy.apple}
          </InkButton>
          <InkButton
            variant="secondary"
            leading={<GoogleLogo size={20} />}
            disabled={disabledFor('google')}
            busy={busy === 'google'}
            onClick={() => void run('google')}
          >
            {copy.google}
          </InkButton>
        </div>

        <p className="flex items-center gap-3 type-caption text-tertiary" aria-hidden="true">
          <span className="h-px flex-1 bg-[var(--ink-border-subtle)]" />
          {copy.divider}
          <span className="h-px flex-1 bg-[var(--ink-border-subtle)]" />
        </p>

        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate aria-label={copy.divider}>
          <InkTextField
            label={copy.email}
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            maxLength={254}
            onChange={(event) => setEmail(event.target.value)}
            disabled={disabledFor('email')}
          />
          <InkTextField
            label={copy.password}
            type="password"
            autoComplete="current-password"
            value={password}
            maxLength={128}
            onChange={(event) => setPassword(event.target.value)}
            disabled={disabledFor('email')}
          />
          {errorText ? <InkInlineBanner title={errorText} /> : null}
          <InkButton type="submit" disabled={disabledFor('email')} busy={busy === 'email'} busyLabel={copy.submitting}>
            {copy.submit}
          </InkButton>
        </form>

        <p className="text-center type-body text-secondary">
          {copy.registerPrompt}{' '}
          <a href={withLang('/', locale)} className="ink-focus font-extrabold text-blue underline-offset-4 hover:underline">
            {copy.registerCta}
          </a>
        </p>
      </div>
    </SessionPage>
  );
}

'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { InkAppIcon, InkWordmark } from '@/components/ink/brand';
import { InkButton } from '@/components/ink/ink-button';
import { InkChip } from '@/components/ink/ink-chip';
import { InkHeadline } from '@/components/ink/ink-headline';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkTextField } from '@/components/ink/ink-text-field';
import { Kicker } from '@/components/ink/kicker';
import { InkPage, PageColumn } from '@/components/shell/ink-page';
import { safeRedirectHref } from '@/lib/safe-redirect';

type Locale = 'es' | 'en' | 'pt';
type Status = 'checking' | 'ready' | 'submitting' | 'success' | 'error';
type ActionMode = 'resetPassword' | 'verifyEmail';

type ResetCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  invalidLink: string;
  checking: string;
  passwordLabel: string;
  passwordHint: string;
  confirmLabel: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successBody: string;
  backHome: string;
  continueCta: string;
  tryAgain: string;
  codeFor: string;
  legalHint: string;
  errors: {
    missingCode: string;
    passwordMismatch: string;
    weakPassword: string;
    invalidLink: string;
    expiredLink: string;
    generic: string;
    disabled: string;
  };
};

type VerifyCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  checking: string;
  successTitle: string;
  successBody: string;
  invalidTitle: string;
  invalidBody: string;
  backHome: string;
  continueCta: string;
  openApp: string;
  chip: string;
  legalHint: string;
  errors: {
    missingCode: string;
    invalidLink: string;
    expiredLink: string;
    disabled: string;
    generic: string;
  };
};

const PASSWORD_REGEX = /^(?=.*?[a-zA-Z])(?=.*?[0-9]).{8,}$/;

const resetCopyByLocale: Record<Locale, ResetCopy> = {
  es: {
    eyebrow: 'Recupero de cuenta',
    title: 'Elige una nueva contraseña.',
    subtitle:
      'Restablece tu acceso con una contraseña nueva y vuelves a la arena.',
    invalidLink:
      'Este enlace no es válido o ya no puede usarse. Pide uno nuevo desde la app.',
    checking: 'Verificando enlace...',
    passwordLabel: 'Nueva contraseña',
    passwordHint: 'Usa al menos 8 caracteres e incluye 1 numero.',
    confirmLabel: 'Confirmar contraseña',
    submit: 'Guardar contraseña',
    submitting: 'Guardando...',
    successTitle: 'Contraseña actualizada.',
    successBody:
      'Ya puedes volver a InkDuel e iniciar sesión con tu nueva contraseña.',
    backHome: 'Volver a InkDuel',
    continueCta: 'Continuar',
    tryAgain: 'Pedir otro enlace',
    codeFor: 'Enlace para',
    legalHint:
      'Si no pediste este cambio, ignora este enlace y solicita uno nuevo desde la app.',
    errors: {
      missingCode: 'Faltan datos del enlace de recuperación.',
      passwordMismatch: 'Las contraseñas no coinciden.',
      weakPassword:
        'La contraseña debe tener al menos 8 caracteres y 1 numero.',
      invalidLink: 'El enlace es inválido o ya fue usado.',
      expiredLink: 'El enlace venció. Pide uno nuevo desde la app.',
      generic: 'No pudimos actualizar la contraseña. Intenta otra vez.',
      disabled: 'Esta cuenta fue deshabilitada.',
    },
  },
  en: {
    eyebrow: 'Account recovery',
    title: 'Choose a new password.',
    subtitle:
      'Reset your access with a fresh password and jump back into the arena.',
    invalidLink:
      'This link is invalid or can no longer be used. Request a new one from the app.',
    checking: 'Verifying link...',
    passwordLabel: 'New password',
    passwordHint: 'Use at least 8 characters and include 1 number.',
    confirmLabel: 'Confirm password',
    submit: 'Save password',
    submitting: 'Saving...',
    successTitle: 'Password updated.',
    successBody:
      'You can now go back to InkDuel and sign in with your new password.',
    backHome: 'Back to InkDuel',
    continueCta: 'Continue',
    tryAgain: 'Request another link',
    codeFor: 'Link for',
    legalHint:
      'If you did not request this change, ignore this link and request a new one from the app.',
    errors: {
      missingCode: 'Recovery link data is missing.',
      passwordMismatch: 'Passwords do not match.',
      weakPassword:
        'Password must be at least 8 characters long and include 1 number.',
      invalidLink: 'The link is invalid or has already been used.',
      expiredLink: 'This link has expired. Request a new one from the app.',
      generic: 'We could not update the password. Please try again.',
      disabled: 'This account has been disabled.',
    },
  },
  pt: {
    eyebrow: 'Recuperacao de conta',
    title: 'Escolha uma nova senha.',
    subtitle:
      'Redefina seu acesso com uma nova senha e volte para a arena.',
    invalidLink:
      'Este link e invalido ou nao pode mais ser usado. Peca um novo pelo app.',
    checking: 'Verificando link...',
    passwordLabel: 'Nova senha',
    passwordHint: 'Use pelo menos 8 caracteres e inclua 1 numero.',
    confirmLabel: 'Confirmar senha',
    submit: 'Salvar senha',
    submitting: 'Salvando...',
    successTitle: 'Senha atualizada.',
    successBody:
      'Agora voce pode voltar ao InkDuel e entrar com sua nova senha.',
    backHome: 'Voltar ao InkDuel',
    continueCta: 'Continuar',
    tryAgain: 'Pedir outro link',
    codeFor: 'Link para',
    legalHint:
      'Se voce nao pediu esta alteracao, ignore este link e solicite um novo pelo app.',
    errors: {
      missingCode: 'Faltam dados do link de recuperacao.',
      passwordMismatch: 'As senhas nao coincidem.',
      weakPassword:
        'A senha deve ter pelo menos 8 caracteres e 1 numero.',
      invalidLink: 'O link e invalido ou ja foi usado.',
      expiredLink: 'O link expirou. Peca um novo pelo app.',
      generic: 'Nao foi possivel atualizar a senha. Tente novamente.',
      disabled: 'Esta conta foi desativada.',
    },
  },
};

const verifyCopyByLocale: Record<Locale, VerifyCopy> = {
  es: {
    eyebrow: 'Verificacion de correo',
    title: 'Confirmemos tu direccion de correo.',
    subtitle:
      'Estamos validando tu cuenta para que puedas entrar a InkDuel sin fricciones.',
    checking: 'Verificando correo...',
    successTitle: 'Correo verificado.',
    successBody:
      'Tu cuenta ya quedo confirmada. Ya puedes volver a la app y seguir escribiendo.',
    invalidTitle: 'No pudimos verificar este correo.',
    invalidBody:
      'El enlace no es valido, ya fue usado o vencio. Pide uno nuevo desde la app.',
    backHome: 'Volver a InkDuel',
    continueCta: 'Continuar',
    openApp: 'Abrir la app',
    chip: 'Cuenta confirmada',
    legalHint:
      'Si no pediste esta verificacion, puedes ignorar este correo. No se realizara ningun cambio extra.',
    errors: {
      missingCode: 'Faltan datos del enlace de verificacion.',
      invalidLink: 'El enlace es invalido o ya fue usado.',
      expiredLink: 'El enlace vencio. Solicita uno nuevo desde la app.',
      disabled: 'Esta cuenta fue deshabilitada.',
      generic: 'No pudimos verificar tu correo. Intenta de nuevo.',
    },
  },
  en: {
    eyebrow: 'Email verification',
    title: 'Let us confirm your email address.',
    subtitle:
      'We are validating your account so you can jump back into InkDuel without friction.',
    checking: 'Verifying email...',
    successTitle: 'Email verified.',
    successBody:
      'Your account is now confirmed. You can go back to the app and keep writing.',
    invalidTitle: 'We could not verify this email.',
    invalidBody:
      'The link is invalid, has already been used, or has expired. Request a new one from the app.',
    backHome: 'Back to InkDuel',
    continueCta: 'Continue',
    openApp: 'Open app',
    chip: 'Account confirmed',
    legalHint:
      'If you did not request this verification, you can ignore this email. No extra change will be made.',
    errors: {
      missingCode: 'Verification link data is missing.',
      invalidLink: 'The link is invalid or has already been used.',
      expiredLink: 'This link has expired. Request a new one from the app.',
      disabled: 'This account has been disabled.',
      generic: 'We could not verify your email. Please try again.',
    },
  },
  pt: {
    eyebrow: 'Verificacao de e-mail',
    title: 'Vamos confirmar seu endereco de e-mail.',
    subtitle:
      'Estamos validando sua conta para que voce volte ao InkDuel sem atrito.',
    checking: 'Verificando e-mail...',
    successTitle: 'E-mail verificado.',
    successBody:
      'Sua conta ja foi confirmada. Agora voce pode voltar ao app e continuar escrevendo.',
    invalidTitle: 'Nao foi possivel verificar este e-mail.',
    invalidBody:
      'O link e invalido, ja foi usado ou expirou. Solicite um novo pelo app.',
    backHome: 'Voltar ao InkDuel',
    continueCta: 'Continuar',
    openApp: 'Abrir app',
    chip: 'Conta confirmada',
    legalHint:
      'Se voce nao pediu esta verificacao, pode ignorar este e-mail. Nenhuma outra alteracao sera feita.',
    errors: {
      missingCode: 'Faltam dados do link de verificacao.',
      invalidLink: 'O link e invalido ou ja foi usado.',
      expiredLink: 'O link expirou. Solicite um novo pelo app.',
      disabled: 'Esta conta foi desativada.',
      generic: 'Nao foi possivel verificar seu e-mail. Tente novamente.',
    },
  },
};

function resolveLocale(value: string | null): Locale {
  const code =
    value?.toLowerCase().split('-')[0] ??
    (typeof navigator !== 'undefined'
      ? navigator.language.toLowerCase().split('-')[0]
      : null);

  if (code === 'en' || code === 'pt') {
    return code;
  }
  return 'es';
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) {
    return email;
  }

  if (name.length <= 2) {
    return `${name[0] ?? ''}***@${domain}`;
  }

  return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
}

function mapResetError(message: string | undefined, copy: ResetCopy): string {
  switch (message) {
    case 'EXPIRED_OOB_CODE':
      return copy.errors.expiredLink;
    case 'INVALID_OOB_CODE':
      return copy.errors.invalidLink;
    case 'USER_DISABLED':
      return copy.errors.disabled;
    case 'OPERATION_NOT_ALLOWED':
      return copy.errors.invalidLink;
    default:
      return copy.errors.generic;
  }
}

function mapVerifyError(message: string | undefined, copy: VerifyCopy): string {
  switch (message) {
    case 'EXPIRED_OOB_CODE':
      return copy.errors.expiredLink;
    case 'INVALID_OOB_CODE':
      return copy.errors.invalidLink;
    case 'USER_DISABLED':
      return copy.errors.disabled;
    case 'OPERATION_NOT_ALLOWED':
      return copy.errors.invalidLink;
    default:
      return copy.errors.generic;
  }
}

export default function AuthActionHandler() {
  const searchParams = useSearchParams();
  const locale = resolveLocale(searchParams.get('lang'));
  const actionMode = searchParams.get('mode') as ActionMode | null;
  const resetCopy = resetCopyByLocale[locale];
  const verifyCopy = verifyCopyByLocale[locale];

  const apiKey = searchParams.get('apiKey');
  const oobCode = searchParams.get('oobCode');
  const continueUrl = searchParams.get('continueUrl');

  const [status, setStatus] = useState<Status>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const continueHref = useMemo(() => safeRedirectHref(continueUrl), [continueUrl]);
  const hasContinueTarget = continueHref !== '/';

  useEffect(() => {
    async function handleAction() {
      if (!apiKey || !oobCode || !actionMode) {
        setStatus('error');
        setError(
          actionMode === 'verifyEmail'
            ? verifyCopy.errors.missingCode
            : resetCopy.errors.missingCode,
        );
        return;
      }

      if (actionMode === 'resetPassword') {
        try {
          const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ oobCode }),
            },
          );

          const data = (await response.json()) as {
            email?: string;
            error?: { message?: string };
          };

          if (!response.ok || !data.email) {
            throw new Error(data.error?.message);
          }

          setEmail(data.email);
          setStatus('ready');
          return;
        } catch (verificationError) {
          setStatus('error');
          setError(
            mapResetError(
              verificationError instanceof Error
                ? verificationError.message
                : undefined,
              resetCopy,
            ),
          );
          return;
        }
      }

      if (actionMode === 'verifyEmail') {
        try {
          const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ oobCode }),
            },
          );

          const data = (await response.json()) as {
            email?: string;
            error?: { message?: string };
          };

          if (!response.ok) {
            throw new Error(data.error?.message);
          }

          setEmail(data.email ?? '');
          setStatus('success');
          return;
        } catch (verificationError) {
          setStatus('error');
          setError(
            mapVerifyError(
              verificationError instanceof Error
                ? verificationError.message
                : undefined,
              verifyCopy,
            ),
          );
          return;
        }
      }

      setStatus('error');
      setError(resetCopy.errors.invalidLink);
    }

    void handleAction();
  }, [actionMode, apiKey, oobCode, resetCopy, verifyCopy]);

  async function handleResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!oobCode || !apiKey) {
      setStatus('error');
      setError(resetCopy.errors.missingCode);
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      setError(resetCopy.errors.weakPassword);
      return;
    }

    if (password !== confirmPassword) {
      setError(resetCopy.errors.passwordMismatch);
      return;
    }

    setStatus('submitting');
    setError('');

    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            oobCode,
            newPassword: password,
          }),
        },
      );

      const data = (await response.json()) as {
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(data.error?.message);
      }

      setStatus('success');
    } catch (submitError) {
      setStatus('ready');
      setError(
        mapResetError(
          submitError instanceof Error ? submitError.message : undefined,
          resetCopy,
        ),
      );
    }
  }

  if (actionMode === 'verifyEmail') {
    return (
      <AuthFrame eyebrow={verifyCopy.eyebrow} title={verifyCopy.title} subtitle={verifyCopy.subtitle} legal={verifyCopy.legalHint}>
        {status === 'checking' && <CheckingLine label={verifyCopy.checking} />}

        {status === 'success' && (
          <div className="flex flex-col gap-4">
            <InkInlineBanner tone="success" title={verifyCopy.successTitle} detail={verifyCopy.successBody} />
            <div className="flex flex-wrap items-center gap-2">
              <InkChip tone="success">{verifyCopy.chip}</InkChip>
              {email && (
                <span className="type-caption text-secondary">
                  {verifyCopy.openApp} · <span className="font-extrabold break-all text-primary">{email}</span>
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <InkButton href={continueHref}>
                {hasContinueTarget ? verifyCopy.continueCta : verifyCopy.openApp}
              </InkButton>
              <InkButton href="/" variant="ghost" fullWidth={false} className="self-center">
                {verifyCopy.backHome}
              </InkButton>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col gap-4">
            <InkInlineBanner
              tone="error"
              title={verifyCopy.invalidTitle}
              detail={
                <>
                  <span className="block">{verifyCopy.invalidBody}</span>
                  {error && <span className="mt-1 block font-bold text-danger">{error}</span>}
                </>
              }
            />
            <InkButton href="/" variant="secondary">
              {verifyCopy.backHome}
            </InkButton>
          </div>
        )}
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      eyebrow={resetCopy.eyebrow}
      title={resetCopy.title}
      subtitle={status === 'error' ? resetCopy.invalidLink : resetCopy.subtitle}
      legal={resetCopy.legalHint}
    >
      {status === 'checking' && <CheckingLine label={resetCopy.checking} />}

      {(status === 'ready' || status === 'submitting') && (
        <form className="flex flex-col gap-4" onSubmit={handleResetSubmit} noValidate>
          <p className="type-caption text-secondary">
            {resetCopy.codeFor} <span className="font-extrabold text-primary">{maskEmail(email)}</span>
          </p>
          <InkTextField
            label={resetCopy.passwordLabel}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            disabled={status === 'submitting'}
          />
          <InkTextField
            label={resetCopy.confirmLabel}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            disabled={status === 'submitting'}
            hint={resetCopy.passwordHint}
          />
          {error && <InkInlineBanner tone="error" title={error} />}
          <InkButton type="submit" busy={status === 'submitting'} busyLabel={resetCopy.submitting} className="mt-2">
            {resetCopy.submit}
          </InkButton>
        </form>
      )}

      {status === 'success' && (
        <div className="flex flex-col gap-4">
          <InkInlineBanner tone="success" title={resetCopy.successTitle} detail={resetCopy.successBody} />
          <div className="flex flex-col gap-2">
            <InkButton href={continueHref}>
              {hasContinueTarget ? resetCopy.continueCta : resetCopy.backHome}
            </InkButton>
            <InkButton href="/" variant="ghost" fullWidth={false} className="self-center">
              {resetCopy.backHome}
            </InkButton>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col gap-4">
          {error && <InkInlineBanner tone="error" title={error} />}
          <div className="flex flex-col gap-2">
            <InkButton href="/">{resetCopy.tryAgain}</InkButton>
            <InkButton href="/" variant="ghost" fullWidth={false} className="self-center">
              {resetCopy.backHome}
            </InkButton>
          </div>
        </div>
      )}
    </AuthFrame>
  );
}

/** Acceso (15): plain paper, no navigation, one column. */
function AuthFrame({
  eyebrow,
  title,
  subtitle,
  legal,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  legal: string;
  children: React.ReactNode;
}) {
  return (
    <InkPage context="product">
      <header className="py-4">
        <PageColumn width="product">
          <Link href="/" className="ink-focus inline-flex min-h-11 items-center gap-3 rounded-control">
            <InkAppIcon size={36} />
            <InkWordmark size="sm" />
          </Link>
        </PageColumn>
      </header>
      <main className="flex-1 pt-6 pb-16">
        <PageColumn width="product" className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Kicker>{eyebrow}</Kicker>
            <InkHeadline text={title} size="title-page" />
            <p className="type-body text-secondary">{subtitle}</p>
          </div>
          <div aria-live="polite">{children}</div>
          <p className="type-caption text-tertiary">{legal}</p>
        </PageColumn>
      </main>
    </InkPage>
  );
}

/** Inline wait while the link is checked (no full-screen spinner). */
function CheckingLine({ label }: { label: string }) {
  return (
    <p role="status" className="flex items-center gap-3 type-body text-secondary">
      <span
        aria-hidden="true"
        className="size-[18px] shrink-0 animate-spin rounded-full border-[2.5px] border-divider border-t-[var(--ink-brand-yellow)] motion-reduce:animate-none"
      />
      {label}
    </p>
  );
}

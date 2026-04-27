'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

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
    title: 'Elegí una nueva contraseña.',
    subtitle:
      'Restablecé tu acceso con una contraseña nueva y volvés a la arena.',
    invalidLink:
      'Este enlace no es válido o ya no puede usarse. Pedí uno nuevo desde la app.',
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

  const continueHref = useMemo(() => {
    if (!continueUrl) {
      return '/';
    }

    try {
      return decodeURIComponent(continueUrl);
    } catch {
      return continueUrl;
    }
  }, [continueUrl]);

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
      <main className="reset-shell">
        <div className="mesh-bg">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
        </div>

        <div className="reset-frame">
          <div className="reset-brand">
            <Link href="/" className="logo reset-logo">
              Ink<span className="accent">Duel</span>
            </Link>
            <span className="reset-eyebrow">{verifyCopy.eyebrow}</span>
          </div>

          <section className="reset-card">
            <div className="reset-card-top">
              <p className="reset-kicker">{verifyCopy.eyebrow}</p>
              <h1 className="reset-title">{verifyCopy.title}</h1>
              <p className="reset-subtitle">{verifyCopy.subtitle}</p>
            </div>

            {status === 'checking' && (
              <div className="reset-state">
                <div className="reset-spinner" />
                <p>{verifyCopy.checking}</p>
              </div>
            )}

            {status === 'success' && (
              <div className="reset-success">
                <div className="reset-success-badge">✓</div>
                <div className="verify-chip">{verifyCopy.chip}</div>
                <h2>{verifyCopy.successTitle}</h2>
                <p>{verifyCopy.successBody}</p>
                {email && (
                  <div className="reset-email-chip">
                    <span>{verifyCopy.openApp}</span>
                    <strong>{email}</strong>
                  </div>
                )}
                <div className="reset-success-actions">
                  <a className="cta-button primary" href={continueHref}>
                    {continueUrl ? verifyCopy.continueCta : verifyCopy.openApp}
                  </a>
                  <Link href="/" className="cta-button">
                    {verifyCopy.backHome}
                  </Link>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="reset-error-state">
                <h2 className="verify-error-title">{verifyCopy.invalidTitle}</h2>
                <p>{verifyCopy.invalidBody}</p>
                <p className="reset-error">{error}</p>
                <div className="reset-success-actions">
                  <Link href="/" className="cta-button primary">
                    {verifyCopy.backHome}
                  </Link>
                </div>
              </div>
            )}

            <p className="reset-legal">{verifyCopy.legalHint}</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="reset-shell">
      <div className="mesh-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
      </div>

      <div className="reset-frame">
        <div className="reset-brand">
          <Link href="/" className="logo reset-logo">
            Ink<span className="accent">Duel</span>
          </Link>
          <span className="reset-eyebrow">{resetCopy.eyebrow}</span>
        </div>

        <section className="reset-card">
          <div className="reset-card-top">
            <p className="reset-kicker">{resetCopy.eyebrow}</p>
            <h1 className="reset-title">{resetCopy.title}</h1>
            <p className="reset-subtitle">
              {status === 'error' ? resetCopy.invalidLink : resetCopy.subtitle}
            </p>
          </div>

          {status === 'checking' && (
            <div className="reset-state">
              <div className="reset-spinner" />
              <p>{resetCopy.checking}</p>
            </div>
          )}

          {(status === 'ready' || status === 'submitting') && (
            <>
              <div className="reset-email-chip">
                <span>{resetCopy.codeFor}</span>
                <strong>{maskEmail(email)}</strong>
              </div>

              <form className="reset-form" onSubmit={handleResetSubmit}>
                <label className="reset-field">
                  <span>{resetCopy.passwordLabel}</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={resetCopy.passwordHint}
                    autoComplete="new-password"
                    disabled={status === 'submitting'}
                  />
                </label>

                <label className="reset-field">
                  <span>{resetCopy.confirmLabel}</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={resetCopy.confirmLabel}
                    autoComplete="new-password"
                    disabled={status === 'submitting'}
                  />
                </label>

                <p className="reset-hint">{resetCopy.passwordHint}</p>

                {error && <p className="reset-error">{error}</p>}

                <button
                  type="submit"
                  className="cta-button primary large reset-submit"
                  disabled={status === 'submitting'}
                >
                  {status === 'submitting'
                    ? resetCopy.submitting
                    : resetCopy.submit}
                </button>
              </form>
            </>
          )}

          {status === 'success' && (
            <div className="reset-success">
              <div className="reset-success-badge">✓</div>
              <h2>{resetCopy.successTitle}</h2>
              <p>{resetCopy.successBody}</p>
              <div className="reset-success-actions">
                <a className="cta-button primary" href={continueHref}>
                  {continueUrl ? resetCopy.continueCta : resetCopy.backHome}
                </a>
                <Link href="/" className="cta-button">
                  {resetCopy.backHome}
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="reset-error-state">
              <p className="reset-error">{error}</p>
              <div className="reset-success-actions">
                <Link href="/" className="cta-button primary">
                  {resetCopy.tryAgain}
                </Link>
                <Link href="/" className="cta-button">
                  {resetCopy.backHome}
                </Link>
              </div>
            </div>
          )}

          <p className="reset-legal">{resetCopy.legalHint}</p>
        </section>
      </div>
    </main>
  );
}

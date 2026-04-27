'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Locale = 'es' | 'en' | 'pt';
type Status = 'checking' | 'ready' | 'submitting' | 'success' | 'error';

type Copy = {
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

const PASSWORD_REGEX = /^(?=.*?[a-zA-Z])(?=.*?[0-9]).{8,}$/;

const copyByLocale: Record<Locale, Copy> = {
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

function mapFirebaseError(message: string | undefined, copy: Copy): string {
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

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const locale = resolveLocale(searchParams.get('lang'));
  const copy = copyByLocale[locale];

  const apiKey = searchParams.get('apiKey');
  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');
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
    async function verifyCode() {
      if (!apiKey || !oobCode || mode !== 'resetPassword') {
        setStatus('error');
        setError(copy.errors.missingCode);
        return;
      }

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
      } catch (verificationError) {
        setStatus('error');
        setError(
          mapFirebaseError(
            verificationError instanceof Error
              ? verificationError.message
              : undefined,
            copy,
          ),
        );
      }
    }

    void verifyCode();
  }, [apiKey, copy, mode, oobCode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!oobCode || !apiKey) {
      setStatus('error');
      setError(copy.errors.missingCode);
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      setError(copy.errors.weakPassword);
      return;
    }

    if (password !== confirmPassword) {
      setError(copy.errors.passwordMismatch);
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
        mapFirebaseError(
          submitError instanceof Error ? submitError.message : undefined,
          copy,
        ),
      );
    }
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
          <span className="reset-eyebrow">{copy.eyebrow}</span>
        </div>

        <section className="reset-card">
          <div className="reset-card-top">
            <p className="reset-kicker">{copy.eyebrow}</p>
            <h1 className="reset-title">{copy.title}</h1>
            <p className="reset-subtitle">
              {status === 'error' ? copy.invalidLink : copy.subtitle}
            </p>
          </div>

          {status === 'checking' && (
            <div className="reset-state">
              <div className="reset-spinner" />
              <p>{copy.checking}</p>
            </div>
          )}

          {(status === 'ready' || status === 'submitting') && (
            <>
              <div className="reset-email-chip">
                <span>{copy.codeFor}</span>
                <strong>{maskEmail(email)}</strong>
              </div>

              <form className="reset-form" onSubmit={handleSubmit}>
                <label className="reset-field">
                  <span>{copy.passwordLabel}</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={copy.passwordHint}
                    autoComplete="new-password"
                    disabled={status === 'submitting'}
                  />
                </label>

                <label className="reset-field">
                  <span>{copy.confirmLabel}</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={copy.confirmLabel}
                    autoComplete="new-password"
                    disabled={status === 'submitting'}
                  />
                </label>

                <p className="reset-hint">{copy.passwordHint}</p>

                {error && <p className="reset-error">{error}</p>}

                <button
                  type="submit"
                  className="cta-button primary large reset-submit"
                  disabled={status === 'submitting'}
                >
                  {status === 'submitting' ? copy.submitting : copy.submit}
                </button>
              </form>
            </>
          )}

          {status === 'success' && (
            <div className="reset-success">
              <div className="reset-success-badge">✓</div>
              <h2>{copy.successTitle}</h2>
              <p>{copy.successBody}</p>
              <div className="reset-success-actions">
                <a className="cta-button primary" href={continueHref}>
                  {continueUrl ? copy.continueCta : copy.backHome}
                </a>
                <Link href="/" className="cta-button">
                  {copy.backHome}
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="reset-error-state">
              <p className="reset-error">{error}</p>
              <div className="reset-success-actions">
                <Link href="/" className="cta-button primary">
                  {copy.tryAgain}
                </Link>
                <Link href="/" className="cta-button">
                  {copy.backHome}
                </Link>
              </div>
            </div>
          )}

          <p className="reset-legal">{copy.legalHint}</p>
        </section>
      </div>
    </main>
  );
}

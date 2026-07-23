'use client';

import { useEffect, useMemo, useState } from 'react';

export type Locale = 'es' | 'en' | 'pt';

type FriendChallengeCopy = {
  title: string;
  subtitle: string;
  cta: string;
  installNote: string;
  appStoreLabel: string;
  googlePlayLabel: string;
};

const appStoreUrl =
  'https://apps.apple.com/app/inkduel-duelos-de-escritura/id6761736355';
const googlePlayUrl =
  'https://play.google.com/store/apps/details?id=com.inkduel.app';

const languageOptions: {
  code: Locale;
  label: string;
  flag: string;
}[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
];

const copies: Record<Locale, FriendChallengeCopy> = {
  es: {
    title: 'Te han retado a escribir',
    subtitle:
      'Abre InkDuel para descubrir quién te retó y aceptar un duelo privado de escritura de 5 minutos.',
    cta: 'Abrir InkDuel',
    installNote:
      '¿Aún no tienes la app? Instala InkDuel y luego vuelve a abrir este enlace para aceptar el reto.',
    appStoreLabel: 'Descargar en App Store',
    googlePlayLabel: 'Descargar en Google Play',
  },
  en: {
    title: "You've been challenged to write",
    subtitle:
      'Open InkDuel to discover who challenged you and accept a private 5-minute writing duel.',
    cta: 'Open InkDuel',
    installNote:
      "Don't have the app yet? Install InkDuel, then open this link again to accept the challenge.",
    appStoreLabel: 'Download on the App Store',
    googlePlayLabel: 'Get it on Google Play',
  },
  pt: {
    title: 'Desafiaram você a escrever',
    subtitle:
      'Abra o InkDuel para descobrir quem desafiou você e aceitar um duelo privado de escrita de 5 minutos.',
    cta: 'Abrir o InkDuel',
    installNote:
      'Ainda não tem o app? Instale o InkDuel e depois abra este link novamente para aceitar o desafio.',
    appStoreLabel: 'Baixar na App Store',
    googlePlayLabel: 'Baixar no Google Play',
  },
};

const getInitialLocale = (): Locale => {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const params = new URLSearchParams(window.location.search);
  const queryLocale = params.get('lang');
  if (queryLocale === 'es' || queryLocale === 'en' || queryLocale === 'pt') {
    return queryLocale;
  }

  const storedLocale = window.localStorage.getItem('inkduel-locale');
  if (storedLocale === 'es' || storedLocale === 'en' || storedLocale === 'pt') {
    return storedLocale;
  }

  const browserLocale = window.navigator.language.slice(0, 2);
  if (browserLocale === 'es' || browserLocale === 'en' || browserLocale === 'pt') {
    return browserLocale;
  }

  return 'en';
};

type FriendChallengeClientProps = {
  token: string;
  initialLocale: Locale;
  resolveLocaleOnClient: boolean;
};

export default function FriendChallengeClient({
  token,
  initialLocale,
  resolveLocaleOnClient,
}: FriendChallengeClientProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const copy = copies[locale];
  const currentLanguage = useMemo(
    () => languageOptions.find((option) => option.code === locale) ?? languageOptions[0],
    [locale],
  );

  const appLink = `inkduel://friend-challenge/${encodeURIComponent(token)}`;

  useEffect(() => {
    if (resolveLocaleOnClient) {
      setLocale(getInitialLocale());
    }
  }, [resolveLocaleOnClient]);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem('inkduel-locale', locale);
  }, [locale]);

  return (
    <main className="public-page">
      <div className="public-card">
        <div className="public-topbar">
          <label className="language-picker" aria-label="Select language">
            <span className="language-current" aria-hidden="true">
              <span className="language-flag">{currentLanguage.flag}</span>
              <span>{currentLanguage.label}</span>
            </span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
              aria-label="Select language"
            >
              {languageOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.flag} {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="friend-challenge-icon" aria-hidden="true">
          🤝
        </div>
        <h1 className="public-title">{copy.title}</h1>
        <p className="public-subtitle">{copy.subtitle}</p>

        <a href={appLink} className="public-cta">
          {copy.cta}
        </a>

        <p className="friend-challenge-install-note">{copy.installNote}</p>
        <div className="friend-challenge-store-links">
          <a href={appStoreUrl} target="_blank" rel="noreferrer">
            {copy.appStoreLabel}
          </a>
          <a href={googlePlayUrl} target="_blank" rel="noreferrer">
            {copy.googlePlayLabel}
          </a>
        </div>
      </div>
    </main>
  );
}

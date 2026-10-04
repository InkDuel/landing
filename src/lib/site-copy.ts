import type { Locale } from './i18n';

// Copy shared by the shell (header, footer, store buttons). Page copy lives
// with each page.

export const APP_STORE_URL = 'https://apps.apple.com/app/inkduel-duelos-de-escritura/id6761736355';
export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.inkduel.app';

// The featured challenge terms page (see /challenge/[slug]).
export const CHALLENGE_TERMS_PATH = '/challenge/demo-desafio-especial';

export type SiteCopy = {
  homeAria: string;
  languageLabel: string;
  backToHome: string;
  footerTagline: string;
  footerNavLabel: string;
  about: string;
  challengeTerms: string;
  privacyPolicy: string;
  deleteAccount: string;
  stores: {
    appStoreKicker: string;
    googlePlayKicker: string;
    appStoreAria: string;
    googlePlayAria: string;
    groupAria: string;
  };
};

export const SITE_COPY: Record<Locale, SiteCopy> = {
  es: {
    homeAria: 'InkDuel, inicio',
    languageLabel: 'Idioma',
    backToHome: 'Volver al inicio',
    footerTagline: 'Acepta el duelo.',
    footerNavLabel: 'Enlaces del sitio',
    about: 'Sobre InkDuel',
    challengeTerms: 'Bases y condiciones',
    privacyPolicy: 'Política de privacidad',
    deleteAccount: 'Eliminar cuenta',
    stores: {
      appStoreKicker: 'Descargar en',
      googlePlayKicker: 'Disponible en',
      appStoreAria: 'Descargar InkDuel en App Store',
      googlePlayAria: 'Descargar InkDuel en Google Play',
      groupAria: 'Descargar la app',
    },
  },
  en: {
    homeAria: 'InkDuel, home',
    languageLabel: 'Language',
    backToHome: 'Back to home',
    footerTagline: 'Accept the duel.',
    footerNavLabel: 'Site links',
    about: 'About InkDuel',
    challengeTerms: 'Challenge Terms',
    privacyPolicy: 'Privacy Policy',
    deleteAccount: 'Delete account',
    stores: {
      appStoreKicker: 'Download on the',
      googlePlayKicker: 'Get it on',
      appStoreAria: 'Download InkDuel on the App Store',
      googlePlayAria: 'Get InkDuel on Google Play',
      groupAria: 'Get the app',
    },
  },
  pt: {
    homeAria: 'InkDuel, início',
    languageLabel: 'Idioma',
    backToHome: 'Voltar ao início',
    footerTagline: 'Aceite o duelo.',
    footerNavLabel: 'Links do site',
    about: 'Sobre o InkDuel',
    challengeTerms: 'Termos do desafio',
    privacyPolicy: 'Política de Privacidade',
    deleteAccount: 'Excluir conta',
    stores: {
      appStoreKicker: 'Baixar na',
      googlePlayKicker: 'Disponível no',
      appStoreAria: 'Baixar InkDuel na App Store',
      googlePlayAria: 'Baixar InkDuel no Google Play',
      groupAria: 'Baixar o app',
    },
  },
};

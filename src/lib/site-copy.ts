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
  /** The web app, seen from the public pages. Sign-up stays in the app. */
  web: {
    signIn: string;
    goToApp: string;
    kicker: string;
    cta: string;
    lead: string;
    noAccount: string;
    sectionTitle: string;
    sectionBody: string;
    features: { title: string; body: string }[];
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
    web: {
      signIn: 'Inicia sesión',
      goToApp: 'Ir a InkDuel',
      kicker: 'También en la web',
      cta: 'Entra en la web',
      lead: 'Lee, escribe y compite desde el navegador con tu cuenta de InkDuel.',
      noAccount: '¿Aún no tienes cuenta? Créala en la app.',
      sectionTitle: 'La arena también cabe en tu navegador.',
      sectionBody: 'La misma cuenta, el mismo rango, tus mismas Obras. Entra desde cualquier navegador y sigue donde lo dejaste.',
      features: [
        { title: 'Historias', body: 'Lee los relatos de la comunidad, uno tras otro.' },
        { title: 'Obras', body: 'Escribe por capítulos en InkDuel Studio.' },
        { title: 'Marcas', body: 'Subraya, comenta y responde a quien te lee.' },
        { title: 'Duelos', body: 'Escribe tu relato ahora; el veredicto llega después.' },
      ],
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
    web: {
      signIn: 'Sign in',
      goToApp: 'Go to InkDuel',
      kicker: 'Also on the web',
      cta: 'Use it on the web',
      lead: 'Read, write and compete from your browser with your InkDuel account.',
      noAccount: 'No account yet? Create one in the app.',
      sectionTitle: 'The arena fits in your browser too.',
      sectionBody: 'Same account, same rank, same Works. Sign in from any browser and pick up where you left off.',
      features: [
        { title: 'Stories', body: 'Read the community’s stories, one after another.' },
        { title: 'Works', body: 'Write chapter by chapter in InkDuel Studio.' },
        { title: 'Marks', body: 'Highlight, comment and reply to your readers.' },
        { title: 'Duels', body: 'Write your story now; the verdict comes later.' },
      ],
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
    web: {
      signIn: 'Entrar',
      goToApp: 'Ir para o InkDuel',
      kicker: 'Também na web',
      cta: 'Entrar na web',
      lead: 'Leia, escreva e compita pelo navegador com sua conta do InkDuel.',
      noAccount: 'Ainda não tem conta? Crie uma no app.',
      sectionTitle: 'A arena também cabe no seu navegador.',
      sectionBody: 'A mesma conta, o mesmo rank, as mesmas Obras. Entre de qualquer navegador e continue de onde parou.',
      features: [
        { title: 'Histórias', body: 'Leia as histórias da comunidade, uma após a outra.' },
        { title: 'Obras', body: 'Escreva capítulo a capítulo no InkDuel Studio.' },
        { title: 'Marcas', body: 'Sublinhe, comente e responda a quem lê você.' },
        { title: 'Duelos', body: 'Escreva sua história agora; o veredito chega depois.' },
      ],
    },
  },
};

'use client';

import { useEffect, useMemo, useState } from 'react';

type Locale = 'es' | 'en' | 'pt';

type AboutLink = {
  title: string;
  subtitle: string;
  href: string;
  label: string;
};

type AboutCopy = {
  backToHome: string;
  eyebrow: string;
  title: string;
  intro: string;
  storyTitle: string;
  paragraphs: string[];
  followTitle: string;
  links: AboutLink[];
};

const inkduelInstagramUrl = 'https://www.instagram.com/inkduel/';
const inkduelWebsiteUrl = 'https://inkduel.com';
const creatorInstagramUrl = 'https://www.instagram.com/facovas/';
const creatorLinkedinUrl = 'https://www.linkedin.com/in/facucovas/';

const languageOptions: {
  code: Locale;
  label: string;
  flag: string;
}[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
];

const withLocalePath = (path: string, locale: Locale) => `${path}?lang=${locale}`;

const copies: Record<Locale, AboutCopy> = {
  es: {
    backToHome: 'Volver al inicio',
    eyebrow: 'Sobre InkDuel',
    title: 'Sobre InkDuel',
    intro: 'Un proyecto independiente para escribir más, practicar y mejorar como escritor.',
    storyTitle: 'La historia detrás de la app',
    paragraphs: [
      'InkDuel es un espacio para escribir historias cortas, competir en duelos creativos y descubrir cómo otras personas imaginan mundos distintos a partir de una misma consigna.',
      'El proyecto nació de forma independiente y está siendo desarrollado por un solo dev argentino, con una idea simple: hacer que escribir vuelva a sentirse como un juego, un desafío y una forma de conectar con otros.',
      'No hace falta escribir perfecto. No hace falta tener experiencia. En InkDuel importan las ideas, la creatividad y animarse a participar.',
      'La app también busca ayudarte a mejorar como escritor: practicando con consignas, leyendo otros relatos, recibiendo feedback y aprendiendo con cada duelo.',
      'InkDuel todavía está en crecimiento, así que cada persona que juega, vota o deja feedback ayuda muchísimo a mejorar la experiencia y a construir una comunidad más creativa.',
      'Gracias por ser parte de esta primera etapa.',
    ],
    followTitle: 'Seguí el proyecto',
    links: [
      {
        title: 'Instagram de InkDuel',
        subtitle: 'Novedades, desafíos y comunidad.',
        href: inkduelInstagramUrl,
        label: 'IG',
      },
      {
        title: 'Sitio web',
        subtitle: 'Conocé más sobre el proyecto.',
        href: inkduelWebsiteUrl,
        label: 'WEB',
      },
      {
        title: 'Instagram del creador',
        subtitle: 'Detrás de escena de InkDuel.',
        href: creatorInstagramUrl,
        label: 'IG',
      },
      {
        title: 'LinkedIn del creador',
        subtitle: 'Contacto profesional, prensa y alianzas.',
        href: creatorLinkedinUrl,
        label: 'IN',
      },
    ],
  },
  en: {
    backToHome: 'Back to home',
    eyebrow: 'About InkDuel',
    title: 'About InkDuel',
    intro: 'An independent project for writing more, practicing, and improving as a writer.',
    storyTitle: 'The story behind the app',
    paragraphs: [
      'InkDuel is a space to write short stories, compete in creative duels, and discover how different people imagine new worlds from the same prompt.',
      'The project was born independently and is being developed by one Argentinian dev with a simple idea: make writing feel like a game, a challenge, and a way to connect with others again.',
      'You do not need to write perfectly. You do not need experience. In InkDuel, ideas, creativity, and the courage to participate matter most.',
      'The app also aims to help you improve as a writer: practicing with prompts, reading other stories, receiving feedback, and learning from every duel.',
      'InkDuel is still growing, so every person who plays, votes, or leaves feedback helps improve the experience and build a more creative community.',
      'Thank you for being part of this first stage.',
    ],
    followTitle: 'Follow the project',
    links: [
      {
        title: 'InkDuel Instagram',
        subtitle: 'News, challenges, and community.',
        href: inkduelInstagramUrl,
        label: 'IG',
      },
      {
        title: 'Website',
        subtitle: 'Learn more about the project.',
        href: inkduelWebsiteUrl,
        label: 'WEB',
      },
      {
        title: 'Creator Instagram',
        subtitle: 'Behind the scenes of InkDuel.',
        href: creatorInstagramUrl,
        label: 'IG',
      },
      {
        title: 'Creator LinkedIn',
        subtitle: 'Professional contact, press, and partnerships.',
        href: creatorLinkedinUrl,
        label: 'IN',
      },
    ],
  },
  pt: {
    backToHome: 'Voltar ao inicio',
    eyebrow: 'Sobre o InkDuel',
    title: 'Sobre o InkDuel',
    intro: 'Um projeto independente para escrever mais, praticar e melhorar como escritor.',
    storyTitle: 'A história por trás do app',
    paragraphs: [
      'InkDuel é um espaço para escrever histórias curtas, competir em duelos criativos e descobrir como outras pessoas imaginam mundos diferentes a partir do mesmo tema.',
      'O projeto nasceu de forma independente e está sendo desenvolvido por um dev argentino, com uma ideia simples: fazer a escrita voltar a parecer um jogo, um desafio e uma forma de conexão.',
      'Não é preciso escrever perfeitamente. Não é preciso ter experiência. No InkDuel importam as ideias, a criatividade e a coragem de participar.',
      'O app também busca ajudar você a melhorar como escritor: praticando com temas, lendo outros relatos, recebendo feedback e aprendendo a cada duelo.',
      'O InkDuel ainda está crescendo, então cada pessoa que joga, vota ou deixa feedback ajuda muito a melhorar a experiência e construir uma comunidade mais criativa.',
      'Obrigado por fazer parte desta primeira etapa.',
    ],
    followTitle: 'Siga o projeto',
    links: [
      {
        title: 'Instagram do InkDuel',
        subtitle: 'Novidades, desafios e comunidade.',
        href: inkduelInstagramUrl,
        label: 'IG',
      },
      {
        title: 'Site',
        subtitle: 'Conheça mais sobre o projeto.',
        href: inkduelWebsiteUrl,
        label: 'WEB',
      },
      {
        title: 'Instagram do criador',
        subtitle: 'Bastidores do InkDuel.',
        href: creatorInstagramUrl,
        label: 'IG',
      },
      {
        title: 'LinkedIn do criador',
        subtitle: 'Contato profissional, imprensa e parcerias.',
        href: creatorLinkedinUrl,
        label: 'IN',
      },
    ],
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

export default function AboutPage() {
  const [locale, setLocale] = useState<Locale>('en');
  const copy = copies[locale];
  const currentLanguage = useMemo(
    () => languageOptions.find((option) => option.code === locale) ?? languageOptions[0],
    [locale],
  );

  useEffect(() => {
    setLocale(getInitialLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem('inkduel-locale', locale);
  }, [locale]);

  return (
    <main className="policy-page">
      <div className="mesh-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <section className="policy-shell">
        <div className="policy-topbar">
          <a className="policy-backlink" href={withLocalePath('/', locale)}>
            {copy.backToHome}
          </a>

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

        <header className="policy-hero">
          <span className="policy-eyebrow">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
        </header>

        <div className="policy-content">
          <section className="policy-section about-page-body">
            <h2>{copy.storyTitle}</h2>
            {copy.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>

          <section className="policy-section">
            <h2>{copy.followTitle}</h2>
            <div className="about-social-grid">
              {copy.links.map((link) => (
                <a
                  key={`${link.title}-${link.href}`}
                  className="about-social-card"
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="about-social-icon" aria-hidden="true">
                    {link.label}
                  </span>
                  <span className="about-social-text">
                    <strong>{link.title}</strong>
                    <small>{link.subtitle}</small>
                  </span>
                  <span className="about-social-arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

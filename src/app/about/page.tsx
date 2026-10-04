'use client';

import { InkAppIcon } from '@/components/ink/brand';
import { ArrowUpRightIcon } from '@/components/ink/icons';
import { InkHeadline } from '@/components/ink/ink-headline';
import { Kicker } from '@/components/ink/kicker';
import { BackLink } from '@/components/legal/legal-page';
import { LocalizedShell } from '@/components/shell/localized-shell';
import { type Locale, withLang } from '@/lib/i18n';

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

const copies: Record<Locale, AboutCopy> = {
  es: {
    backToHome: 'Volver al inicio',
    eyebrow: 'Sobre InkDuel',
    title: 'Sobre InkDuel',
    intro: 'Un proyecto independiente para escribir más, practicar y mejorar tu escritura.',
    storyTitle: 'La historia detrás de la app',
    paragraphs: [
      'InkDuel es un espacio para escribir historias cortas, competir en duelos creativos y descubrir cómo otras personas imaginan mundos distintos a partir de una misma consigna.',
      'El proyecto nació de forma independiente y está siendo desarrollado por un solo dev argentino, con una idea simple: hacer que escribir vuelva a sentirse como un juego, un desafío y una forma de conectar con otros.',
      'No hace falta escribir perfecto. No hace falta tener experiencia. En InkDuel importan las ideas, la creatividad y animarse a participar.',
      'La app también busca ayudarte a mejorar tu escritura: practicando con consignas, leyendo otros relatos, recibiendo feedback y aprendiendo con cada duelo.',
      'InkDuel todavía está en crecimiento: se vienen nuevas ideas, mejoras y formas de vivir los duelos. Cada persona que escribe, participa o deja feedback ayuda a que la app siga evolucionando día a día y a construir una comunidad más creativa.',
      'Gracias por ser parte de esta primera etapa.',
    ],
    followTitle: 'Sigue el proyecto',
    links: [
      {
        title: 'Instagram de InkDuel',
        subtitle: 'Novedades, desafíos y comunidad.',
        href: inkduelInstagramUrl,
        label: 'IG',
      },
      {
        title: 'Sitio web',
        subtitle: 'Conoce más sobre el proyecto.',
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
    intro: 'An independent project for writing more, practicing, and improving your writing.',
    storyTitle: 'The story behind the app',
    paragraphs: [
      'InkDuel is a space to write short stories, compete in creative duels, and discover how different people imagine new worlds from the same prompt.',
      'The project was born independently and is being developed by one Argentinian dev with a simple idea: make writing feel like a game, a challenge, and a way to connect with others again.',
      'You do not need to write perfectly. You do not need experience. In InkDuel, ideas, creativity, and the courage to participate matter most.',
      'The app also aims to help you improve your writing: practicing with prompts, reading other stories, receiving feedback, and learning from every duel.',
      'InkDuel is still growing: new ideas, improvements, and ways to experience duels are on the way. Every person who writes, participates, or leaves feedback helps the app keep evolving day by day and build a more creative community.',
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
    backToHome: 'Voltar ao início',
    eyebrow: 'Sobre o InkDuel',
    title: 'Sobre o InkDuel',
    intro: 'Um projeto independente para escrever mais, praticar e melhorar sua escrita.',
    storyTitle: 'A história por trás do app',
    paragraphs: [
      'InkDuel é um espaço para escrever histórias curtas, competir em duelos criativos e descobrir como outras pessoas imaginam mundos diferentes a partir da mesma proposta.',
      'O projeto nasceu de forma independente e está sendo desenvolvido por um dev argentino, com uma ideia simples: fazer a escrita voltar a parecer um jogo, um desafio e uma forma de conexão.',
      'Não é preciso escrever perfeitamente. Não é preciso ter experiência. No InkDuel importam as ideias, a criatividade e a coragem de participar.',
      'O app também busca ajudar você a melhorar sua escrita: praticando com propostas, lendo outros relatos, recebendo feedback e aprendendo a cada duelo.',
      'O InkDuel ainda está crescendo: novas ideias, melhorias e formas de viver os duelos estão a caminho. Cada pessoa que escreve, participa ou deixa feedback ajuda o app a evoluir dia após dia e a construir uma comunidade mais criativa.',
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

export default function AboutPage() {
  return (
    <LocalizedShell initialLocale="en" resolveOnClient context="product" width="reading">
      {(locale) => {
        const copy = copies[locale];
        return (
          <article className="flex flex-col gap-8 pt-2">
            <header className="flex flex-col gap-4">
              <BackLink href={withLang('/', locale)} label={copy.backToHome} />
              <InkAppIcon size={56} />
              <InkHeadline text={copy.title} size="title-page-lg" />
              <p className="type-body text-secondary">{copy.intro}</p>
            </header>

            <section className="flex flex-col gap-4">
              <h2 className="type-title-section text-primary">{copy.storyTitle}</h2>
              {copy.paragraphs.map((paragraph) => (
                <p key={paragraph} className="type-body text-primary">
                  {paragraph}
                </p>
              ))}
            </section>

            <section className="flex flex-col gap-3">
              <Kicker as="h2">{copy.followTitle}</Kicker>
              <ul className="m-0 list-none overflow-hidden rounded-card border-quiet border-divider bg-surface p-0">
                {copy.links.map((link, index) => (
                  <li key={`${link.title}-${link.href}`} className={index > 0 ? 'border-t border-divider' : undefined}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ink-focus ink-dim flex min-h-[64px] items-center gap-3 px-4 py-3 no-underline"
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center rounded-control border-quiet border-outline bg-tint-blue font-ui text-[12px] font-extrabold text-primary"
                      >
                        {link.label}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="type-body-strong text-primary">{link.title}</span>
                        <span className="type-caption text-secondary">{link.subtitle}</span>
                      </span>
                      <ArrowUpRightIcon size={20} className="shrink-0 text-secondary" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </article>
        );
      }}
    </LocalizedShell>
  );
}

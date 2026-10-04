'use client';

import { InkButton } from '@/components/ink/ink-button';
import { InkCard } from '@/components/ink/ink-card';
import { InkHeadline } from '@/components/ink/ink-headline';
import { PlayerIdentity } from '@/components/ink/player-identity';
import { LocalizedShell } from '@/components/shell/localized-shell';
import { StoreButtons } from '@/components/shell/store-buttons';
import type { Locale } from '@/lib/i18n';

type FriendChallengeCopy = {
  title: string;
  subtitle: string;
  cta: string;
  installNote: string;
};

const copies: Record<Locale, FriendChallengeCopy> = {
  es: {
    title: 'Te han retado a escribir',
    subtitle:
      'Abre InkDuel para descubrir quién te retó y aceptar un duelo privado de escritura de 5 minutos.',
    cta: 'Abrir InkDuel',
    installNote:
      '¿Aún no tienes la app? Instala InkDuel y luego vuelve a abrir este enlace para aceptar el reto.',
  },
  en: {
    title: "You've been challenged to write",
    subtitle: 'Open InkDuel to discover who challenged you and accept a private 5-minute writing duel.',
    cta: 'Open InkDuel',
    installNote: "Don't have the app yet? Install InkDuel, then open this link again to accept the challenge.",
  },
  pt: {
    title: 'Desafiaram você a escrever',
    subtitle:
      'Abra o InkDuel para descobrir quem desafiou você e aceitar um duelo privado de escrita de 5 minutos.',
    cta: 'Abrir o InkDuel',
    installNote:
      'Ainda não tem o app? Instale o InkDuel e depois abra este link novamente para aceitar o desafio.',
  },
};

type FriendChallengeClientProps = {
  token: string;
  initialLocale: Locale;
  resolveLocaleOnClient: boolean;
};

export default function FriendChallengeClient({ token, initialLocale, resolveLocaleOnClient }: FriendChallengeClientProps) {
  const appLink = `inkduel://friend-challenge/${encodeURIComponent(token)}`;

  return (
    <LocalizedShell initialLocale={initialLocale} resolveOnClient={resolveLocaleOnClient} context="arena" width="product">
      {(locale) => {
        const copy = copies[locale];
        return (
          <div className="flex flex-col gap-6 pt-6">
            <InkCard tone="brand" padding="p-6" className="flex flex-col items-center gap-5 text-center">
              {/* The rival is still a mystery: a pink sticker behind an unknown identity. */}
              <span aria-hidden="true" className="relative mt-2 inline-flex">
                <span className="absolute -inset-2 rotate-[-6deg] rounded-control border-brand border-outline bg-pink" />
                <PlayerIdentity name="?" size={96} className="relative" />
              </span>
              <InkHeadline text={copy.title} size="title-page" band="pink" />
              <p className="type-body text-secondary">{copy.subtitle}</p>
              <InkButton href={appLink}>{copy.cta}</InkButton>
            </InkCard>

            <div className="flex flex-col gap-3">
              <p className="type-caption text-secondary">{copy.installNote}</p>
              <StoreButtons locale={locale} />
            </div>
          </div>
        );
      }}
    </LocalizedShell>
  );
}

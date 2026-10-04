import type { Metadata } from 'next';

import type { Locale } from '@/lib/i18n';
import { resolveRequestLocale } from '@/lib/request-locale';

import FriendChallengeClient from './friend-challenge-client';

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

const metadataCopy: Record<Locale, { title: string; description: string }> = {
  es: {
    title: 'Te han retado a escribir — InkDuel',
    description:
      'Abre InkDuel para descubrir quién te retó y aceptar un duelo privado de escritura de 5 minutos.',
  },
  en: {
    title: "You've been challenged to write — InkDuel",
    description: 'Open InkDuel to discover who challenged you and accept a private 5-minute writing duel.',
  },
  pt: {
    title: 'Desafiaram você a escrever — InkDuel',
    description:
      'Abra o InkDuel para descobrir quem desafiou você e aceitar um duelo privado de escrita de 5 minutos.',
  },
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { lang } = await searchParams;
  const { locale } = await resolveRequestLocale(lang);
  return metadataCopy[locale];
}

export default async function FriendChallengePage({ params, searchParams }: Props) {
  const [{ token }, { lang }] = await Promise.all([params, searchParams]);
  const { locale, explicit } = await resolveRequestLocale(lang);

  return <FriendChallengeClient token={token} initialLocale={locale} resolveLocaleOnClient={!explicit} />;
}

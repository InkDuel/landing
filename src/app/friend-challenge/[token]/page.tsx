import type { Metadata } from "next";

import FriendChallengeClient, { type Locale } from "./friend-challenge-client";

type Props = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ lang?: string | string[] }>;
};

const getQueryLocale = (value: string | string[] | undefined): Locale | null => {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === "es" || candidate === "en" || candidate === "pt") {
    return candidate;
  }

  return null;
};

const metadataCopy: Record<Locale, { title: string; description: string }> = {
  es: {
    title: "Te han retado a escribir — InkDuel",
    description:
      "Abre InkDuel para descubrir quién te retó y aceptar un duelo privado de escritura de 5 minutos.",
  },
  en: {
    title: "You've been challenged to write — InkDuel",
    description:
      "Open InkDuel to discover who challenged you and accept a private 5-minute writing duel.",
  },
  pt: {
    title: "Desafiaram você a escrever — InkDuel",
    description:
      "Abra o InkDuel para descobrir quem desafiou você e aceitar um duelo privado de escrita de 5 minutos.",
  },
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const locale = getQueryLocale(resolvedSearchParams?.lang) ?? "en";
  return metadataCopy[locale];
}

export default async function FriendChallengePage({
  params,
  searchParams,
}: Props) {
  const { token } = await params;
  const resolvedSearchParams = await searchParams;
  const queryLocale = getQueryLocale(resolvedSearchParams?.lang);

  return (
    <FriendChallengeClient
      token={token}
      initialLocale={queryLocale ?? "en"}
      resolveLocaleOnClient={queryLocale === null}
    />
  );
}

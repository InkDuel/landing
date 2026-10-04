import type { Metadata } from 'next';

import { fetchPublicDuelStory } from '@/lib/public-api';
import { resolveRequestLocale } from '@/lib/request-locale';

import { DUEL_STORY_COPY } from './duel-story-copy';
import { DuelStoryView } from './duel-story-view';

type Props = {
  params: Promise<{ duelId: string; userId: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ duelId, userId }, { lang }] = await Promise.all([params, searchParams]);
  const [data, { locale }] = await Promise.all([fetchPublicDuelStory(duelId, userId), resolveRequestLocale(lang)]);
  const copy = DUEL_STORY_COPY[locale];
  if (!data) {
    return { title: copy.metaNotFound };
  }
  const excerpt = data.textExcerpt.length > 160 ? data.textExcerpt.slice(0, 160) + '…' : data.textExcerpt;
  return {
    title: copy.metaTitle(data.author.username),
    description: excerpt,
    openGraph: {
      title: copy.ogTitle(data.author.username),
      description: excerpt,
      type: 'article',
      url: `https://inkduel.com/duel/${encodeURIComponent(duelId)}/story/${encodeURIComponent(userId)}`,
    },
  };
}

export default async function DuelStoryPage({ params, searchParams }: Props) {
  const [{ duelId, userId }, { lang }] = await Promise.all([params, searchParams]);
  const [data, { locale, explicit }] = await Promise.all([
    fetchPublicDuelStory(duelId, userId),
    resolveRequestLocale(lang),
  ]);

  return (
    <DuelStoryView
      duelId={duelId}
      initialLocale={locale}
      resolveOnClient={!explicit}
      story={
        data
          ? { prompt: data.prompt, text: data.text, createdAt: data.createdAt, username: data.author.username }
          : null
      }
    />
  );
}

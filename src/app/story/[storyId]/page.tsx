import type { Metadata } from 'next';

import { fetchPublicStory } from '@/lib/public-api';
import { resolveRequestLocale } from '@/lib/request-locale';

import { STORY_COPY } from './story-copy';
import { StoryView } from './story-view';

type Props = {
  params: Promise<{ storyId: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ storyId }, { lang }] = await Promise.all([params, searchParams]);
  const [story, { locale }] = await Promise.all([fetchPublicStory(storyId), resolveRequestLocale(lang)]);
  if (!story) {
    return { title: STORY_COPY[locale].metaNotFound };
  }
  const excerpt =
    story.contentExcerpt.length > 160 ? story.contentExcerpt.slice(0, 160) + '…' : story.contentExcerpt;
  return {
    title: `${story.title} — InkDuel`,
    description: excerpt,
    openGraph: {
      title: `${story.title} — InkDuel`,
      description: excerpt,
      type: 'article',
      url: `https://inkduel.com/story/${encodeURIComponent(storyId)}`,
    },
  };
}

export default async function StoryPage({ params, searchParams }: Props) {
  const [{ storyId }, { lang }] = await Promise.all([params, searchParams]);
  const [story, { locale, explicit }] = await Promise.all([fetchPublicStory(storyId), resolveRequestLocale(lang)]);

  return (
    <StoryView
      storyId={storyId}
      initialLocale={locale}
      resolveOnClient={!explicit}
      story={
        story
          ? {
              id: story.id,
              title: story.title,
              excerpt: story.contentExcerpt,
              createdAt: story.createdAt,
              username: story.user.username,
            }
          : null
      }
    />
  );
}

'use client';

import { ReadingActions, ReadingNotFound, Byline, StoryText } from '@/components/reading/story-parts';
import { LocalizedShell } from '@/components/shell/localized-shell';
import { formatDate, type Locale, withLang } from '@/lib/i18n';

import { STORY_COPY } from './story-copy';

export type StoryViewData = {
  id: string;
  title: string;
  excerpt: string;
  createdAt: string;
  username: string;
};

export function StoryView({
  story,
  storyId,
  initialLocale,
  resolveOnClient,
}: {
  story: StoryViewData | null;
  storyId: string;
  initialLocale: Locale;
  resolveOnClient: boolean;
}) {
  return (
    <LocalizedShell initialLocale={initialLocale} resolveOnClient={resolveOnClient} context="reading" width="reading">
      {(locale) => {
        const copy = STORY_COPY[locale];
        if (!story) {
          return (
            <ReadingNotFound
              title={copy.notFoundTitle}
              body={copy.notFoundBody}
              homeHref={withLang('/', locale)}
              homeLabel={copy.goHome}
            />
          );
        }
        return (
          <article className="pt-6">
            <header className="flex flex-col gap-4">
              <h1 className="type-literary-title text-content sm:type-literary-title-lg">{story.title}</h1>
              <Byline by={copy.by} username={story.username} date={formatDate(story.createdAt, locale)} />
            </header>
            <div className="mt-8">
              <StoryText text={story.excerpt} />
            </div>
            <ReadingActions
              primaryHref={`inkduel://story/${encodeURIComponent(storyId)}`}
              primaryLabel={copy.readInApp}
              secondaryHref={withLang('/', locale)}
              secondaryLabel={copy.writeFirst}
            />
          </article>
        );
      }}
    </LocalizedShell>
  );
}

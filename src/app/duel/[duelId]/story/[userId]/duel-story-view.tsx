'use client';

import { Consigna } from '@/components/ink/consigna';
import { Byline, ReadingActions, ReadingNotFound, StoryText } from '@/components/reading/story-parts';
import { LocalizedShell } from '@/components/shell/localized-shell';
import { formatDate, type Locale, withLang } from '@/lib/i18n';

import { DUEL_STORY_COPY } from './duel-story-copy';

export type DuelStoryViewData = {
  prompt: string;
  text: string;
  createdAt: string;
  username: string;
};

export function DuelStoryView({
  story,
  duelId,
  initialLocale,
  resolveOnClient,
}: {
  story: DuelStoryViewData | null;
  duelId: string;
  initialLocale: Locale;
  resolveOnClient: boolean;
}) {
  return (
    <LocalizedShell initialLocale={initialLocale} resolveOnClient={resolveOnClient} context="reading" width="reading">
      {(locale) => {
        const copy = DUEL_STORY_COPY[locale];
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
            <header className="flex flex-col gap-5">
              {story.prompt ? <Consigna label={copy.consignaLabel} text={story.prompt} /> : null}
              <Byline by={copy.by} username={story.username} date={formatDate(story.createdAt, locale)} />
            </header>
            <div className="mt-8">
              <StoryText text={story.text} />
            </div>
            <ReadingActions
              primaryHref={`inkduel://duel/result/${encodeURIComponent(duelId)}`}
              primaryLabel={copy.seeResult}
              secondaryHref={withLang('/', locale)}
              secondaryLabel={copy.writeFirst}
            />
          </article>
        );
      }}
    </LocalizedShell>
  );
}

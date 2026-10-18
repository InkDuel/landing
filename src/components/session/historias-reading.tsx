'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { cx } from '@/components/ink/cx';
import { BookOpenIcon, ListIcon } from '@/components/ink/icons';
import { InkButton } from '@/components/ink/ink-button';
import { InkEmptyState, InkSkeleton } from '@/components/ink/ink-states';
import type { Locale } from '@/lib/i18n';
import { SESSION_COPY } from '@/lib/session/copy';
import type { GalleryStory } from '@/lib/session/models';
import { type HistoriasViewMode, type ReadingFlags, readingAnalytics, readingApi } from '@/lib/session/reading';
import { READING_COPY } from '@/lib/session/reading-copy';

import { ReadingExhausted, StoryReaderArticle } from './story-reader';

// Reading mode of Historias (the app's _ReadingModeView and _ModeAction in
// gallery_page.dart): «Leer de corrido» lands on a relato to read, «Ver
// lista» goes back to the index. Iteration D: one button in the title row.

export type ReaderLinks = {
  flags: ReadingFlags;
  viewerId: string | null;
  feed: GalleryStory[];
  onStoryRead: (story: GalleryStory) => void;
  onReactionSaved: (story: GalleryStory) => void;
};

/** «Ver lista» (secondary) in reading mode, «Leer de corrido» (yellow) in the list. */
export function ModeAction({ mode, onChange, locale }: { mode: HistoriasViewMode; onChange: (mode: HistoriasViewMode) => void; locale: Locale }) {
  const copy = READING_COPY[locale];
  const reading = mode === 'reading';
  return (
    <button
      type="button"
      onClick={() => onChange(reading ? 'list' : 'reading')}
      className={cx(
        'ink-focus inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-control border-brand border-outline px-3.5 py-2 type-button-sm whitespace-nowrap',
        reading ? 'bg-surface text-primary ink-dim' : 'bg-yellow text-on-accent ink-shadow-press ink-press',
      )}
    >
      {reading ? <ListIcon size={16} /> : <BookOpenIcon size={16} />}
      {reading ? copy.seeList : copy.readContinuously}
    </button>
  );
}

type Landing =
  | { kind: 'loading' }
  | { kind: 'story'; story: GalleryStory; rest: GalleryStory[]; fromQueue: boolean }
  | { kind: 'exhausted' }
  /** The queue had nothing to say: pick from the loaded list. */
  | { kind: 'list' };

/**
 * Reading mode: lands on the queue's pick, or on the first relato of the
 * list the reader has not read and did not write. Landing is not reading:
 * the relato is marked at its end, on «Siguiente» or on a reaction.
 */
export function ReadingMode({
  links,
  listStatus,
  listError,
  onShowList,
  locale,
}: {
  links: ReaderLinks;
  listStatus: 'loading' | 'ready' | 'error';
  /** Shown when the queue had nothing and the list failed too. */
  listError: ReactNode;
  onShowList: () => void;
  locale: Locale;
}) {
  const copy = READING_COPY[locale];
  const [landing, setLanding] = useState<Landing>({ kind: 'loading' });
  /** Picked once: a later list update («Leído») never swaps the relato being read. */
  const [picked, setPicked] = useState<GalleryStory | null | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    readingApi
      .next(null, [], 3, { locale, signal: controller.signal })
      .then((page) => {
        if (controller.signal.aborted) return;
        if (page.items.length > 0) setLanding({ kind: 'story', story: page.items[0], rest: page.items.slice(1), fromQueue: true });
        else setLanding(page.exhausted ? { kind: 'exhausted' } : { kind: 'list' });
      })
      // Queue off (503) or unreachable: read from the loaded list.
      .catch(() => !controller.signal.aborted && setLanding({ kind: 'list' }));
    return () => controller.abort();
    // Once per visit to reading mode, not per language switch mid-relato.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (landing.kind === 'list' && picked === undefined && listStatus !== 'loading') {
    // Never land on a relato already read or on the reader's own.
    setPicked(links.feed.find((story) => !story.readByMe && story.authorId !== links.viewerId) ?? null);
  }
  const story = landing.kind === 'story' ? landing.story : landing.kind === 'list' ? (picked ?? null) : null;
  const exhausted = landing.kind === 'exhausted' || (landing.kind === 'list' && !story && listStatus === 'ready' && links.feed.length > 0);

  useEffect(() => {
    if (exhausted) readingAnalytics.exhaustedViewed(locale);
  }, [exhausted, locale]);

  if (story) {
    return (
      <StoryReaderArticle
        key={story.key}
        locale={locale}
        options={{
          story,
          api: readingApi,
          queueEnabled: links.flags.queue,
          reactionsEnabled: links.flags.reactions,
          viewerId: links.viewerId,
          locale,
          feed: links.feed,
          onStoryRead: links.onStoryRead,
          onReactionSaved: links.onReactionSaved,
          initialUpcoming: landing.kind === 'story' ? landing.rest : [],
          openedFromQueue: landing.kind === 'story' && landing.fromQueue,
          markReadOnOpen: false,
        }}
      />
    );
  }
  if (exhausted) {
    return (
      <div className="mx-auto w-full max-w-[680px] pt-2">
        <ReadingExhausted locale={locale}>
          <InkButton variant="secondary" onClick={onShowList}>
            {copy.showList}
          </InkButton>
        </ReadingExhausted>
      </div>
    );
  }
  if (landing.kind === 'list' && listStatus === 'error') return <>{listError}</>;
  if (landing.kind === 'list' && listStatus === 'ready') {
    const stories = SESSION_COPY[locale].stories;
    return <InkEmptyState title={stories.relatosEmptyTitle} message={stories.relatosEmptyBody} />;
  }
  return <InkSkeleton lines={1} height="h-80" label={SESSION_COPY[locale].common.loading} />;
}

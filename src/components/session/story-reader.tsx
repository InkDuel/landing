'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

import { Consigna } from '@/components/ink/consigna';
import { cx } from '@/components/ink/cx';
import { ArrowRightIcon, BoltIcon, ChevronLeftIcon, DropIcon, HookIcon } from '@/components/ink/icons';
import { InkButton } from '@/components/ink/ink-button';
import { InkSkeleton } from '@/components/ink/ink-states';
import { StoryText } from '@/components/reading/story-parts';
import type { Locale } from '@/lib/i18n';
import { SESSION_COPY } from '@/lib/session/copy';
import { GALLERY_REACTIONS, type GalleryReaction, type GalleryStory } from '@/lib/session/models';
import { readingAnalytics } from '@/lib/session/reading';
import { READING_COPY } from '@/lib/session/reading-copy';
import { StoryReader, type StoryReaderOptions, type StoryReaderState } from '@/lib/session/story-reader';

import { GrowStoryCta } from './grow-story';
import { ByLine, winReason } from './historias';
import { useNotice } from './marks-parts';
import { StoryComments, storyCommentsSectionId } from './story-comments';

// A relato read in Historias (09), built on the Works reader's ending, as in
// the app's gallery_story_detail_page.dart: the text, «Fin del relato», «¿Qué
// te dejó este relato?» (three reactions and «Deja tu Marca»), the Marcas,
// then «Siguiente relato». With both switches off it is the relato as before.

const REACTION_ICONS: Record<GalleryReaction, (props: { size: 20 }) => ReactNode> = {
  hooked: HookIcon,
  moved: DropIcon,
  surprised: BoltIcon,
};

/** The opening words of a relato, quoted (duel stories have no title). */
export function openingQuote(text: string, maxChars = 84): string {
  const flat = text.replace(/^[—\-\s]+/, '').replace(/\s+/g, ' ').trim();
  const chars = Array.from(flat);
  if (chars.length <= maxChars) return `«${flat}»`;
  const cut = chars.slice(0, maxChars).join('');
  const lastSpace = cut.lastIndexOf(' ');
  const words = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:]$/, '');
  return `«${words}…»`;
}

/** «Leíste todos los relatos nuevos»: the honest end, turned into an action. */
export function ReadingExhausted({ locale, children }: { locale: Locale; children?: ReactNode }) {
  const copy = READING_COPY[locale];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col rounded-[16px] border-quiet border-divider bg-surface p-[18px]">
        <p className="type-title-section text-[18px] text-primary">{copy.exhaustedTitle}</p>
        <p className="mt-1.5 font-literary text-[16px] leading-[1.45] text-reader-muted italic">{copy.exhaustedBody}</p>
        <div className="mt-4">
          <InkButton href="/ranked">{copy.searchDuel}</InkButton>
        </div>
      </div>
      {children}
    </div>
  );
}

function ReactionTile({
  reaction,
  count,
  selected,
  onTap,
  locale,
}: {
  reaction: GalleryReaction;
  count: number;
  selected: boolean;
  onTap: (() => void) | null;
  locale: Locale;
}) {
  const copy = READING_COPY[locale];
  const label = copy.reactions[reaction];
  const Icon = REACTION_ICONS[reaction];
  const body = (
    <>
      <span className="flex items-center justify-center gap-1">
        <span className={selected ? 'text-pink' : 'text-secondary'}>
          <Icon size={20} />
        </span>
        {count > 0 ? <span className="type-body text-[13px] font-bold text-primary tabular-nums">{count}</span> : null}
      </span>
      {/* Every tile reserves two lines and centers its label in them, so
          «Me atrapó» and «No lo vi venir» share an axis. */}
      <span className="flex h-[2.4em] items-center justify-center text-center type-caption text-[12.5px] leading-[1.2] font-bold text-primary">
        <span className="line-clamp-2">{label}</span>
      </span>
    </>
  );
  const classes = cx(
    'flex min-h-[76px] min-w-0 flex-1 flex-col items-center gap-[5px] rounded-[14px] px-1.5 pt-2.5 pb-[9px] transition-colors duration-150',
    selected ? 'border-brand border-pink bg-tint-pink' : 'border-quiet border-divider bg-surface',
  );
  if (!onTap) {
    return (
      <div className={classes} role="img" aria-label={copy.reactionCount(label, count)}>
        {body}
      </div>
    );
  }
  return (
    <button type="button" aria-pressed={selected} aria-label={copy.reactionCount(label, count)} onClick={onTap} className={cx(classes, 'ink-focus ink-dim')}>
      {body}
    </button>
  );
}

/** «¿Qué te dejó este relato?»; for the author, what readers left. */
function ReactionPanel({
  state,
  reader,
  isOwnStory,
  onLeaveMark,
  error,
  locale,
}: {
  state: StoryReaderState;
  reader: StoryReader;
  isOwnStory: boolean;
  onLeaveMark: (() => void) | null;
  error: string | null;
  locale: Locale;
}) {
  const copy = READING_COPY[locale];
  const { story } = state;
  const total = GALLERY_REACTIONS.reduce((sum, reaction) => sum + story.reactionCounts[reaction], 0);
  return (
    <section aria-label={isOwnStory ? copy.ownReactionsTitle : copy.endQuestion} className="flex flex-col rounded-[16px] border-quiet border-divider bg-surface p-4">
      <h2 className="type-title-section text-[15.5px] font-bold text-content">{isOwnStory ? copy.ownReactionsTitle : copy.endQuestion}</h2>
      {isOwnStory && reader.reactionsEnabled && total === 0 ? (
        <p className="mt-[3px] type-caption text-[12.5px] text-reader-muted">{copy.ownReactionsEmpty}</p>
      ) : null}
      {reader.reactionsEnabled ? (
        <div className="mt-3.5 flex gap-2">
          {GALLERY_REACTIONS.map((reaction) => (
            <ReactionTile
              key={reaction}
              reaction={reaction}
              count={story.reactionCounts[reaction]}
              selected={!isOwnStory && story.myReaction === reaction}
              onTap={isOwnStory || state.reactionPending ? null : () => void reader.react(reaction)}
              locale={locale}
            />
          ))}
        </div>
      ) : null}
      <p role="status" aria-live="polite" className={cx('type-caption text-[12.5px] text-danger', error ? 'mt-2' : 'sr-only')}>
        {error}
      </p>
      {onLeaveMark ? (
        <button
          type="button"
          onClick={onLeaveMark}
          className="ink-focus ink-dim mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-pill bg-blue-fill type-button-sm text-[14px] text-inverse"
        >
          <span aria-hidden="true">✎</span>
          {copy.leaveMark}
        </button>
      ) : null}
    </section>
  );
}

/** The yellow «SIGUIENTE RELATO» card (the Works reader's next-chapter card). */
function NextStoryCard({ story, onOpen, locale }: { story: GalleryStory; onOpen: () => void; locale: Locale }) {
  const copy = READING_COPY[locale];
  const author = story.authorDisplayName.startsWith('@') ? story.authorDisplayName : `@${story.authorDisplayName}`;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="ink-focus ink-press flex w-full items-center gap-2.5 rounded-button border-brand border-outline bg-yellow pt-3 pr-4 pb-3.5 pl-[18px] text-left text-on-accent ink-shadow-button"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="type-label text-[11.5px] text-on-accent">{copy.nextStory}</span>
        <span className="mt-[5px] line-clamp-3 font-literary text-[17px] leading-[1.35] font-semibold italic">{openingQuote(story.storyText || story.storyPreview)}</span>
        <span className="mt-1.5 truncate type-caption text-[13px] font-bold">{author}</span>
      </span>
      <ArrowRightIcon size={24} />
    </button>
  );
}

function NextSection({ state, reader, locale }: { state: StoryReaderState; reader: StoryReader; locale: Locale }) {
  const copy = READING_COPY[locale];
  const searchDuel = (
    <InkButton href="/ranked" variant="secondary">
      {copy.searchDuel}
    </InkButton>
  );
  const next = state.upcoming[0];
  if (state.nextStatus === 'exhausted') return <ReadingExhausted locale={locale} />;
  return (
    <div className="flex flex-col gap-4">
      {state.nextStatus === 'loading' ? <InkSkeleton lines={1} height="h-[104px]" label={copy.nextStory} /> : null}
      {state.nextStatus === 'ready' && next ? <NextStoryCard story={next} onOpen={() => reader.openNext()} locale={locale} /> : null}
      {searchDuel}
    </div>
  );
}

/**
 * Marks the relato read when «Fin del relato» comes into view by the
 * reader's own scrolling. Landing with the end already visible (a short
 * relato) is not reading; the jump to the top on «Siguiente» is not either.
 */
function useEndReached(node: React.RefObject<HTMLElement | null>, storyKey: string, onReached: () => void) {
  const callback = useRef(onReached);
  useEffect(() => {
    callback.current = onReached;
  });
  useEffect(() => {
    const element = node.current;
    if (!element) return;
    const baseline = window.scrollY;
    let visible = false;
    let scrolled = false;
    const check = () => {
      if (visible && scrolled) callback.current();
    };
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      check();
    });
    const onScroll = () => {
      if (window.scrollY !== baseline) scrolled = true;
      check();
    };
    observer.observe(element);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [node, storyKey]);
}

export function StoryReaderArticle({
  options,
  locale,
  backHref,
}: {
  /** Read once: remount (key) to read another relato from scratch. */
  options: StoryReaderOptions;
  locale: Locale;
  /** «‹ Historias» above the relato (opened from the list). */
  backHref?: string;
}) {
  const [reader] = useState(() => new StoryReader(options));
  useEffect(() => {
    reader.start();
    return () => reader.close();
  }, [reader]);
  const state = useSyncExternalStore(reader.subscribe, reader.getSnapshot, reader.getSnapshot);
  const { story } = state;
  const copy = SESSION_COPY[locale].stories;
  const readingCopy = READING_COPY[locale];
  const reason = winReason(story, locale);
  const isOwnStory = reader.isOwnStory;
  const readingFlow = reader.queueEnabled || reader.reactionsEnabled;
  const endMark = useRef<HTMLParagraphElement>(null);
  const [notice, setNotice] = useNotice();

  // Before paint, so the end-of-text observer never sees the old position.
  // A block, not an expression: recent Chrome returns a promise from scrollTo.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [story.key]);

  useEndReached(endMark, story.key, () => reader.markEndReached());

  const failures = state.reactionFailures;
  useEffect(() => {
    if (failures > 0) setNotice(readingCopy.reactionError);
  }, [failures, readingCopy.reactionError, setNotice]);

  const exhausted = reader.queueEnabled && state.nextStatus === 'exhausted';
  useEffect(() => {
    if (exhausted) readingAnalytics.exhaustedViewed(locale);
  }, [exhausted, state.storyVersion, locale]);

  const leaveMark = isOwnStory
    ? null
    : () => {
        const section = document.getElementById(storyCommentsSectionId(story.duelId, story.storyId));
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        section?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        section?.querySelector('textarea')?.focus({ preventScroll: true });
      };

  return (
    <article className="mx-auto flex w-full max-w-[680px] flex-col gap-4 pt-2">
      {backHref ? (
        <Link
          href={backHref}
          className="ink-focus ink-dim -ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-control pr-3 pl-1 type-button-sm text-[14px] text-secondary"
        >
          <ChevronLeftIcon size={20} />
          {copy.title}
        </Link>
      ) : null}
      {story.prompt.trim() ? <Consigna label={copy.promptLabel} text={story.prompt.trim()} /> : null}
      <ByLine name={story.authorDisplayName} authorId={story.authorId || undefined} extra={story.authorRank} size="md" />
      {reason ? (
        <p className="type-caption text-[13.5px] text-secondary">
          {reason} · {copy.score(Math.round(story.score))}
        </p>
      ) : null}
      <div className="mt-4">
        <StoryText text={story.storyText || story.storyPreview} />
      </div>
      {readingFlow ? (
        <>
          <p ref={endMark} className="pt-[30px] pb-1 text-center type-label text-[11.5px] tracking-[0.14em] text-reader-muted">
            {readingCopy.endMark}
          </p>
          {reader.reactionsEnabled || leaveMark ? (
            <ReactionPanel state={state} reader={reader} isOwnStory={isOwnStory} onLeaveMark={leaveMark} error={notice} locale={locale} />
          ) : null}
        </>
      ) : null}
      {isOwnStory && story.storyText.trim() ? (
        <div className="mt-6">
          <GrowStoryCta duelId={story.duelId} storyId={story.storyId} locale={locale} />
        </div>
      ) : null}
      <StoryComments
        key={story.key}
        duelId={story.duelId}
        storyId={story.storyId}
        isOwnStory={isOwnStory}
        initialCount={story.commentsCount}
        locale={locale}
      />
      {reader.queueEnabled ? (
        <div className="mt-7">
          <NextSection state={state} reader={reader} locale={locale} />
        </div>
      ) : null}
    </article>
  );
}

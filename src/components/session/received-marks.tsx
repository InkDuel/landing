'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cx } from '@/components/ink/cx';
import { InkButton } from '@/components/ink/ink-button';
import { InkHeadline } from '@/components/ink/ink-headline';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkEmptyState, InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import type { Locale } from '@/lib/i18n';
import { ApiError } from '@/lib/session/api';
import { useSession } from '@/lib/session/auth-context';
import { type ReceivedMark, inkMarksApi, markFailure, storyCommentsApi } from '@/lib/session/marks';
import { MARKS_COPY, shortMarkDate } from '@/lib/session/marks-copy';
import { ReceivedMarksMerge, markKey, markSeen, readSeen } from '@/lib/session/received-marks';

import { useSessionLocale } from './session-root';

// «Marcas recibidas» (17 - Social): what readers left on your relatos and
// chapters, newest first, from both sources through the same merge for the
// three-row preview on /me and the full list on /me/marks. A source the
// backend switched off (503) leaves the merge; any other failure keeps what
// loaded, offers a retry of that source only, and never reads as «empty».

export const receivedMarksHref = () => '/me/marks';

export function receivedMarkHref(mark: ReceivedMark): string {
  if (mark.source === 'workChapter') {
    return `/work/${encodeURIComponent(mark.workId)}/chapter/${encodeURIComponent(mark.chapterId)}?mark=${encodeURIComponent(mark.rootId)}`;
  }
  return `/me/marks/story/${encodeURIComponent(mark.duelId)}/${encodeURIComponent(mark.storyId)}?comment=${encodeURIComponent(mark.id)}`;
}

type Row = { mark: ReceivedMark; unread: boolean };
type FailureKind = 'unavailable' | 'session' | 'network' | 'generic';

type InboxState = {
  status: 'loading' | 'ready' | 'empty' | 'error' | 'unavailable';
  rows: Row[];
  hasMore: boolean;
  loadingMore: boolean;
  /** Set while one source blocks the merge: rows stay, a retry is offered. */
  failure: FailureKind | null;
};

function failureKind(error: unknown): FailureKind {
  const failure = markFailure(error);
  return failure === 'session' || failure === 'network' || failure === 'unavailable' ? failure : 'generic';
}

const isUnavailable = (error: unknown) => error instanceof ApiError && error.status === 503;

/** Rows are new against «visto hasta» as it was when the list opened. */
const toRows = (marks: ReceivedMark[], baseline: number | null): Row[] =>
  marks.map((mark) => ({ mark, unread: baseline === null || Date.parse(mark.createdAt) > baseline }));

export function useReceivedMarks(pageSize: number) {
  const { user } = useSession();
  const { locale } = useSessionLocale();
  const uid = user?.id ?? '';
  const engine = useRef<ReceivedMarksMerge | null>(null);
  const baseline = useRef<number | null>(null);
  const generation = useRef(0);
  const [state, setState] = useState<InboxState>({ status: 'loading', rows: [], hasMore: false, loadingMore: false, failure: null });

  const load = useCallback(async () => {
    const merge = engine.current;
    if (!merge) return;
    const gen = generation.current;
    setState({ status: 'loading', rows: [], hasMore: false, loadingMore: false, failure: null });
    const merged = await merge.take(pageSize);
    if (gen !== generation.current) return;
    if (merge.allUnavailable) {
      setState({ status: 'unavailable', rows: [], hasMore: false, loadingMore: false, failure: null });
      return;
    }
    // Nothing assembled because a source failed: an error, never «no Marcas».
    if (merged.length === 0 && merge.blockingSource) {
      setState({ status: 'error', rows: [], hasMore: merge.hasMore, loadingMore: false, failure: failureKind(merge.blockingFailure) });
      return;
    }
    setState({
      status: merged.length === 0 && !merge.hasMore ? 'empty' : 'ready',
      rows: toRows(merged, baseline.current),
      hasMore: merge.hasMore,
      loadingMore: false,
      failure: merge.blockingSource ? failureKind(merge.blockingFailure) : null,
    });
    // Opening the inbox counts as seeing what it shows — only when every
    // active source answered: a partial load must not retire unread rows.
    if (merge.allSourcesHealthy && merged.length > 0) markSeen(uid, merged[0].createdAt);
  }, [pageSize, uid]);

  /** [count] more rows after the ones on screen; what loaded always stays. */
  const append = useCallback(async (count: number) => {
    const merge = engine.current;
    if (!merge) return;
    const gen = generation.current;
    setState((s) => ({ ...s, loadingMore: true, failure: null }));
    const merged = await merge.take(count);
    if (gen !== generation.current) return;
    setState((s) => {
      const seen = new Set(s.rows.map((row) => markKey(row.mark)));
      return {
        ...s,
        rows: [...s.rows, ...toRows(merged.filter((mark) => !seen.has(markKey(mark))), baseline.current)],
        hasMore: merge.hasMore,
        loadingMore: false,
        failure: merge.blockingSource ? failureKind(merge.blockingFailure) : null,
      };
    });
  }, []);

  useEffect(() => {
    if (!uid) return;
    generation.current += 1;
    const ctx = { locale };
    engine.current = new ReceivedMarksMerge(
      [
        { source: 'duelStory', fetch: (limit, cursor) => storyCommentsApi.received(cursor, limit, ctx) },
        { source: 'workChapter', fetch: (limit, cursor) => inkMarksApi.received(cursor, limit, ctx) },
      ],
      { isUnavailable },
    );
    baseline.current = readSeen(uid);
    void load();
  }, [uid, locale, load]);

  const loadMore = () => {
    if (state.loadingMore || !state.hasMore || state.status !== 'ready' || state.failure) return;
    void append(pageSize);
  };

  /**
   * Retries only the source that stopped the merge; the others keep their
   * pages. It completes the page that stopped short (the preview stays at
   * three), it does not add another one.
   */
  const retry = () => {
    engine.current?.clearFailures();
    void (state.rows.length === 0 ? load() : append(pageSize - (state.rows.length % pageSize)));
  };

  const newCount = state.rows.filter((row) => row.unread).length;
  const capped = newCount > 0 && newCount === state.rows.length && state.hasMore;
  return { ...state, newCount, capped, loadMore, retry };
}

function contextLine(mark: ReceivedMark, locale: Locale): string | null {
  const copy = MARKS_COPY[locale].inbox;
  if (mark.source === 'duelStory') return mark.prompt.trim() ? copy.storyContext(mark.prompt.trim()) : null;
  return copy.workContext(mark.workTitle.trim(), mark.chapterOrderIndex, mark.chapterTitle.trim());
}

/** One received Marca: the row opens the conversation, the name the profile. */
export function ReceivedMarkRow({ row, preview = false, locale }: { row: Row; preview?: boolean; locale: Locale }) {
  const copy = MARKS_COPY[locale];
  const { mark, unread } = row;
  const name = mark.author.displayName.replace(/^@/, '') || copy.anonymous;
  const context = contextLine(mark, locale);
  return (
    <li
      className={cx(
        'relative flex list-none flex-col gap-1 border-t border-divider py-3.5 first:border-t-0',
        'border-l-[3px] pl-3', unread ? 'border-l-pink' : 'border-l-transparent',
      )}
    >
      <p className="flex flex-wrap items-center gap-x-2 type-body text-[13.5px] text-secondary">
        {mark.author.userId ? (
          <Link
            href={`/profile/${encodeURIComponent(mark.author.userId)}`}
            className="ink-focus ink-dim relative z-10 rounded-control font-bold text-primary no-underline"
          >
            @{name}
          </Link>
        ) : (
          <span className="font-bold text-primary">@{name}</span>
        )}
        <span aria-hidden="true">·</span>
        <time dateTime={mark.createdAt}>{shortMarkDate(mark.createdAt, locale)}</time>
      </p>
      <Link
        href={receivedMarkHref(mark)}
        className={cx(
          'ink-focus rounded-control font-literary text-[16px] leading-[1.5] break-words whitespace-pre-wrap no-underline after:absolute after:inset-0 after:content-[\'\']',
          unread ? 'text-content' : 'text-secondary',
          preview && 'line-clamp-2',
        )}
      >
        {mark.content}
      </Link>
      {context ? <p className="type-caption text-[12.5px] text-tertiary line-clamp-1">{context}</p> : null}
    </li>
  );
}

/** The three newest on your profile, and the way into the full list. */
export function ReceivedMarksPreview() {
  const { locale } = useSessionLocale();
  const copy = MARKS_COPY[locale];
  const inbox = useReceivedMarks(3);
  // Both sources switched off: nothing to show on the profile.
  if (inbox.status === 'unavailable') return null;
  return (
    <section aria-labelledby="received-marks" className="flex flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="received-marks" className="flex items-baseline gap-2 type-title-section text-[20px] text-primary">
          {copy.inbox.title}
          {inbox.newCount > 0 ? (
            <span className="rounded-pill bg-tint-pink px-2 py-0.5 type-label text-[10px] text-pink">{copy.inbox.newBadge(inbox.newCount, inbox.capped)}</span>
          ) : null}
        </h2>
        <Link href={receivedMarksHref()} className="ink-focus ink-dim min-h-11 shrink-0 rounded-control px-1 py-2.5 type-button-sm text-[14px] text-blue">
          {copy.inbox.viewAll}
        </Link>
      </div>
      {inbox.status === 'loading' ? <InkSkeleton className="mt-2" lines={2} height="h-14" label={copy.inbox.title} /> : null}
      {inbox.status === 'empty' ? <p className="mt-1 type-body text-[14px] text-secondary">{copy.inbox.previewEmpty}</p> : null}
      {inbox.status === 'error' && inbox.failure ? (
        <p className="mt-1 flex flex-wrap items-center gap-x-3 type-body text-[14px] text-secondary">
          {copy.inbox.failure[inbox.failure]}
          {inbox.failure !== 'session' ? <InkTextAction onClick={inbox.retry}>{copy.retry}</InkTextAction> : null}
        </p>
      ) : null}
      {inbox.rows.length > 0 ? (
        <ol className="m-0 mt-1 p-0">
          {inbox.rows.map((row) => (
            <ReceivedMarkRow key={markKey(row.mark)} row={row} preview locale={locale} />
          ))}
        </ol>
      ) : null}
      {/* Rows loaded and a source then failed: keep them, say so, offer the retry. */}
      {inbox.status === 'ready' && inbox.failure ? (
        <p className="mt-1 flex flex-wrap items-center gap-x-3 type-body text-[14px] text-secondary">
          {copy.inbox.partial}
          <InkTextAction onClick={inbox.retry}>{copy.retry}</InkTextAction>
        </p>
      ) : null}
    </section>
  );
}

/** /me/marks: the full list, twenty at a time. */
export function ReceivedMarksView() {
  const { locale } = useSessionLocale();
  const copy = MARKS_COPY[locale];
  const inbox = useReceivedMarks(20);
  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-5 pt-2">
      <header className="flex flex-col gap-2">
        <InkHeadline text={copy.inbox.headline} as="h1" />
        <p className="type-body text-secondary">{copy.inbox.lead}</p>
      </header>
      {inbox.status === 'loading' ? <InkSkeleton lines={4} height="h-16" label={copy.inbox.title} /> : null}
      {inbox.status === 'unavailable' ? <InkInlineBanner tone="info" title={copy.inbox.failure.unavailable} /> : null}
      {inbox.status === 'empty' ? <InkEmptyState title={copy.inbox.emptyTitle} message={copy.inbox.emptyBody} /> : null}
      {inbox.status === 'error' && inbox.failure ? (
        <InkInlineBanner
          title={copy.inbox.failure[inbox.failure]}
          action={inbox.failure !== 'session' ? <InkTextAction onClick={inbox.retry}>{copy.retry}</InkTextAction> : undefined}
        />
      ) : null}
      {inbox.rows.length > 0 ? (
        <ol className="m-0 p-0">
          {inbox.rows.map((row) => (
            <ReceivedMarkRow key={markKey(row.mark)} row={row} locale={locale} />
          ))}
        </ol>
      ) : null}
      {inbox.status === 'ready' && inbox.failure ? (
        <p className="flex flex-wrap items-center gap-x-3 type-body text-[14px] text-secondary">
          {copy.inbox.partial}
          <InkTextAction onClick={inbox.retry}>{copy.retry}</InkTextAction>
        </p>
      ) : null}
      {inbox.status === 'ready' && inbox.hasMore && !inbox.failure ? (
        <div>
          <InkButton variant="secondary" fullWidth={false} busy={inbox.loadingMore} onClick={inbox.loadMore}>
            {copy.inbox.loadMore}
          </InkButton>
        </div>
      ) : null}
    </div>
  );
}

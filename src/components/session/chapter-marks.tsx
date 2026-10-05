'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { cx } from '@/components/ink/cx';
import { InkButton } from '@/components/ink/ink-button';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import type { Locale } from '@/lib/i18n';
import {
  type ChapterMarksSummary,
  type InkMarkReply,
  type InkMarkRoot,
  type MarkFailure,
  type ReportReason,
  inkMarksApi,
  markFailure,
} from '@/lib/session/marks';
import { MARKS_COPY } from '@/lib/session/marks-copy';

import {
  DeleteMarkDialog,
  MarkAction,
  MarkComposer,
  MarkItem,
  MarkNotice,
  ReportMarkDialog,
  useNotice,
  useRequestIdentity,
} from './marks-parts';

// Marcas of a chapter (17 - Social), ported from work_ink_marks_cubit.dart.
// The chapter text never depends on this: opening a chapter costs one cheap
// summary read, a failed or switched-off summary renders nothing, and the
// conversation is fetched only when the reader opens or reaches it. Replies
// are fetched only on an explicit «Ver N respuestas». Writes are serialized.
// Web layout (founder, phase 3): the conversation lives under the chapter,
// never in a floating panel; the chip in the header scrolls to it.

/** Pages the ?mark= search may scan before giving up (the app's budget). */
const FOCUS_PAGE_BUDGET = 5;

type Thread = {
  expanded: boolean;
  items: InkMarkReply[];
  nextCursor: string | null;
  loaded: boolean;
  loading: boolean;
  failed: boolean;
};

const NEW_THREAD: Thread = { expanded: false, items: [], nextCursor: null, loaded: false, loading: false, failed: false };

type Target = { rootId: string | null; parentId: string | null; name: string };

type State = {
  summary: ChapterMarksSummary | null;
  /** The summary failed or the feature is off: nothing renders. */
  hidden: boolean;
  requested: boolean;
  rootsStatus: 'idle' | 'loading' | 'ready' | 'error';
  rootsFailure: MarkFailure | null;
  roots: InkMarkRoot[];
  nextCursor: string | null;
  loadingMore: boolean;
  moreFailed: boolean;
  pagesScanned: number;
  threads: Record<string, Thread>;
  composer: Target | null;
  /** A create or delete in flight: the next one waits. */
  busy: boolean;
  createError: string | null;
  /** Create answered 503: reading stays, writing is not offered. */
  writesOff: boolean;
  focusId: string | null;
  reported: string[];
  reporting: string | null;
};

const initialState = (focusId: string | null): State => ({
  summary: null,
  hidden: false,
  requested: focusId !== null,
  rootsStatus: 'idle',
  rootsFailure: null,
  roots: [],
  nextCursor: null,
  loadingMore: false,
  moreFailed: false,
  pagesScanned: 0,
  threads: {},
  composer: null,
  busy: false,
  createError: null,
  writesOff: false,
  focusId,
  reported: [],
  reporting: null,
});

/** First occurrence wins, so a replayed create never paints a Marca twice. */
function dedupe<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function useChapterMarks(workId: string, chapterId: string, locale: Locale) {
  const [state, setState] = useState<State>(() => initialState(null));
  // Bumped on every chapter change: a slow answer for chapter 3 never lands on 4.
  const generation = useRef(0);
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const identity = useRequestIdentity();
  const focusShown = useRef<string | null>(null);
  const [notice, setNotice] = useNotice();
  const copy = MARKS_COPY[locale].chapter;

  const live = (gen: number) => gen === generation.current;
  /** Copy for a failed write: the load-oriented generic does not fit. */
  const writeFailure = (error: unknown) => {
    const failure = markFailure(error);
    return failure === 'generic' ? copy.actionFailed : copy.failure[failure];
  };
  const ctx = () => ({ locale: localeRef.current });

  useEffect(() => {
    const gen = ++generation.current;
    // A notification's ?mark= opens the conversation on that thread.
    const focus = new URLSearchParams(window.location.search).get('mark');
    setState(initialState(focus || null));
    inkMarksApi
      .summary(workId, chapterId, ctx())
      .then((summary) => live(gen) && setState((s) => ({ ...s, summary })))
      // Swallowed by design: no summary means no chip and no section.
      .catch(() => live(gen) && setState((s) => ({ ...s, hidden: true })));
    return () => {
      generation.current += 1;
    };
  }, [workId, chapterId]);

  const loadRoots = useCallback(
    async (cursor: string | null) => {
      const gen = generation.current;
      setState((s) => (cursor ? { ...s, loadingMore: true, moreFailed: false } : { ...s, rootsStatus: 'loading', rootsFailure: null }));
      try {
        const page = await inkMarksApi.roots(workId, chapterId, cursor, ctx());
        if (!live(gen)) return;
        setState((s) => ({
          ...s,
          rootsStatus: 'ready',
          loadingMore: false,
          roots: dedupe(cursor ? [...s.roots, ...page.items] : page.items),
          nextCursor: page.nextCursor,
          pagesScanned: s.pagesScanned + 1,
          // The listing carries fresher counters than the summary did.
          summary: { markCount: page.markCount, rootCount: page.rootCount, canMark: page.canMark },
        }));
      } catch (error) {
        if (!live(gen)) return;
        const failure = markFailure(error);
        // Reads switched off take writes with them (the backend's writes gate
        // requires reads): nothing to open, nothing to offer.
        setState((s) =>
          cursor
            ? { ...s, loadingMore: false, moreFailed: true }
            : { ...s, rootsStatus: 'error', rootsFailure: failure, writesOff: s.writesOff || failure === 'unavailable' },
        );
      }
    },
    [workId, chapterId],
  );

  // First page once the conversation is requested (opened, reached, ?mark=).
  useEffect(() => {
    if (!state.requested || state.rootsStatus !== 'idle' || state.hidden || !state.summary) return;
    if (state.summary.rootCount === 0 && !state.focusId) {
      setState((s) => ({ ...s, rootsStatus: 'ready' }));
      return;
    }
    void loadRoots(null);
  }, [state.requested, state.rootsStatus, state.hidden, state.summary, state.focusId, loadRoots]);

  const loadReplies = useCallback(
    async (rootId: string, cursor: string | null) => {
      const gen = generation.current;
      setState((s) => ({
        ...s,
        threads: { ...s.threads, [rootId]: { ...(s.threads[rootId] ?? NEW_THREAD), expanded: true, loading: true, failed: false } },
      }));
      try {
        const page = await inkMarksApi.replies(workId, chapterId, rootId, cursor, ctx());
        if (!live(gen)) return;
        setState((s) => {
          const thread = s.threads[rootId] ?? NEW_THREAD;
          return {
            ...s,
            threads: {
              ...s.threads,
              [rootId]: {
                ...thread,
                loading: false,
                loaded: true,
                items: dedupe(cursor ? [...thread.items, ...page.items] : [...page.items, ...thread.items]),
                nextCursor: page.nextCursor,
              },
            },
            roots: s.roots.map((root) => (root.id === rootId ? { ...root, replyCount: page.replyCount } : root)),
          };
        });
      } catch {
        if (!live(gen)) return;
        setState((s) => ({
          ...s,
          threads: { ...s.threads, [rootId]: { ...(s.threads[rootId] ?? NEW_THREAD), loading: false, failed: true } },
        }));
      }
    },
    [workId, chapterId],
  );

  // ?mark=: page through the roots (bounded) until the thread appears, then
  // expand it. Not found by the end: an ordinary, working conversation.
  useEffect(() => {
    const focus = state.focusId;
    if (!focus || state.rootsStatus !== 'ready' || state.loadingMore) return;
    const root = state.roots.find((item) => item.id === focus);
    if (root) {
      if (focusShown.current === focus) return;
      focusShown.current = focus;
      if (root.replyCount > 0 && !state.threads[focus]) void loadReplies(focus, null);
      document.getElementById(`mark-${focus}`)?.scrollIntoView({ block: 'center', behavior: 'instant' });
      return;
    }
    if (state.nextCursor && !state.moreFailed && state.pagesScanned < FOCUS_PAGE_BUDGET) void loadRoots(state.nextCursor);
  }, [state.focusId, state.rootsStatus, state.loadingMore, state.roots, state.threads, state.nextCursor, state.moreFailed, state.pagesScanned, loadRoots, loadReplies]);

  const request = useCallback(() => setState((s) => (s.requested ? s : { ...s, requested: true })), []);

  function toggleThread(rootId: string) {
    const thread = state.threads[rootId];
    if (thread?.expanded) {
      // Collapsing keeps the replies: expanding again does not re-fetch.
      setState((s) => ({ ...s, threads: { ...s.threads, [rootId]: { ...thread, expanded: false } } }));
      return;
    }
    if (thread?.loaded) {
      setState((s) => ({ ...s, threads: { ...s.threads, [rootId]: { ...thread, expanded: true } } }));
      return;
    }
    void loadReplies(rootId, null);
  }

  const canCreateRoot = !!state.summary?.canMark && !state.writesOff;

  function openComposer(target: Target) {
    // A draft in progress is never replaced silently: cancel it first.
    if (state.composer || state.busy || state.writesOff) return;
    if (!target.rootId && !canCreateRoot) return;
    if (target.rootId && state.roots.find((root) => root.id === target.rootId)?.isDeleted) return;
    request();
    setState((s) => ({ ...s, composer: target, createError: null }));
  }

  function closeComposer() {
    // Cancelling ends the attempt: the same text typed later is a new Marca.
    identity.clear();
    setState((s) => ({ ...s, composer: null, createError: null }));
  }

  async function create(text: string): Promise<boolean> {
    const target = state.composer;
    if (!target || state.busy || state.writesOff) return false;
    const gen = generation.current;
    const requestId = identity.idFor(text, target.parentId);
    setState((s) => ({ ...s, busy: true, createError: null }));
    try {
      const result = await inkMarksApi.create(workId, chapterId, requestId, text, target.parentId, ctx());
      if (!live(gen)) return false;
      identity.clear();
      setState((s) => {
        const add = result.created ? 1 : 0;
        const summary = s.summary ? { ...s.summary, markCount: s.summary.markCount + add } : s.summary;
        if (result.root) {
          return {
            ...s,
            busy: false,
            composer: null,
            rootsStatus: 'ready',
            roots: dedupe([result.root, ...s.roots]),
            summary: summary ? { ...summary, rootCount: summary.rootCount + add } : summary,
          };
        }
        const reply = result.reply as InkMarkReply;
        const rootId = target.rootId as string;
        const thread = s.threads[rootId] ?? NEW_THREAD;
        return {
          ...s,
          busy: false,
          composer: null,
          summary,
          roots: s.roots.map((root) => (root.id === rootId ? { ...root, replyCount: root.replyCount + add } : root)),
          threads: { ...s.threads, [rootId]: { ...thread, expanded: true, items: dedupe([...thread.items, reply]) } },
        };
      });
      // A reply in a thread never opened: bring in the replies before it.
      const repliedRoot = state.roots.find((root) => root.id === target.rootId);
      if (result.reply && repliedRoot && repliedRoot.replyCount > 0 && !state.threads[repliedRoot.id]?.loaded) {
        void loadReplies(repliedRoot.id, null);
      }
      // A replay describes a Marca already counted (its first response was
      // lost): adopt the server's counters instead of guessing, silently.
      if (!result.created) {
        inkMarksApi
          .summary(workId, chapterId, ctx())
          .then((summary) => live(gen) && setState((s) => ({ ...s, summary })))
          .catch(() => undefined);
      }
      setNotice(copy.created);
      return true;
    } catch (error) {
      if (!live(gen)) return false;
      const failure = markFailure(error);
      // A conflict means this id cannot be reused; anything else keeps it,
      // so retrying the same text is free and never duplicates.
      if (failure === 'conflict') identity.clear();
      setState((s) => ({
        ...s,
        busy: false,
        writesOff: s.writesOff || failure === 'unavailable',
        createError: failure === 'unavailable' ? copy.createUnavailable : failure === 'generic' ? copy.actionFailed : copy.failure[failure],
      }));
      return false;
    }
  }

  /** Optimistic, with rollback; the counters then come from the server. */
  async function remove(markId: string, parentRootId: string | null) {
    if (state.busy) return;
    const gen = generation.current;
    const before = { roots: state.roots, threads: state.threads, summary: state.summary };
    setState((s) => {
      if (!parentRootId) {
        const root = s.roots.find((item) => item.id === markId);
        // Replies of other readers stay, under a tombstone.
        const roots =
          root && root.replyCount > 0
            ? s.roots.map((item) => (item.id === markId ? { ...item, isDeleted: true, author: null, content: '', canDelete: false } : item))
            : s.roots.filter((item) => item.id !== markId);
        return { ...s, busy: true, roots };
      }
      const thread = s.threads[parentRootId] ?? NEW_THREAD;
      const root = s.roots.find((item) => item.id === parentRootId);
      const remaining = Math.max(0, (root?.replyCount ?? 1) - 1);
      // A tombstone only exists to hold its replies up.
      const roots =
        root?.isDeleted && remaining === 0
          ? s.roots.filter((item) => item.id !== parentRootId)
          : s.roots.map((item) => (item.id === parentRootId ? { ...item, replyCount: remaining } : item));
      return {
        ...s,
        busy: true,
        roots,
        threads: { ...s.threads, [parentRootId]: { ...thread, items: thread.items.filter((item) => item.id !== markId) } },
      };
    });
    try {
      const result = await inkMarksApi.remove(workId, chapterId, markId, ctx());
      if (!live(gen)) return;
      setState((s) => {
        let roots = s.roots;
        if (!parentRootId) {
          const original = before.roots.find((item) => item.id === markId);
          const kept = roots.some((item) => item.id === markId);
          if (result.visible && !kept && original) {
            const at = before.roots.indexOf(original);
            const tombstone = { ...original, isDeleted: true, author: null, content: '', canDelete: false };
            roots = [...roots.slice(0, at), tombstone, ...roots.slice(at)];
          }
          if (!result.visible && kept) roots = roots.filter((item) => item.id !== markId);
        }
        return {
          ...s,
          busy: false,
          roots,
          summary: s.summary ? { ...s.summary, markCount: result.markCount, rootCount: result.rootCount } : s.summary,
        };
      });
      setNotice(copy.deletedNotice);
    } catch (error) {
      if (!live(gen)) return;
      setState((s) => ({ ...s, busy: false, ...before, createError: null }));
      setNotice(writeFailure(error));
    }
  }

  /** A report never hides the Marca: moderation is not instant. */
  async function report(markId: string, reason: ReportReason): Promise<boolean> {
    if (state.reporting) return false;
    const gen = generation.current;
    setState((s) => ({ ...s, reporting: markId }));
    try {
      await inkMarksApi.report(workId, chapterId, markId, reason, ctx());
      if (!live(gen)) return false;
      setState((s) => ({ ...s, reporting: null, reported: [...s.reported, markId] }));
      setNotice(copy.reported);
      return true;
    } catch (error) {
      if (!live(gen)) return false;
      setState((s) => ({ ...s, reporting: null }));
      setNotice(writeFailure(error));
      return false;
    }
  }

  return {
    state,
    notice,
    canCreateRoot,
    request,
    retryRoots: () => void loadRoots(null),
    loadMoreRoots: () => state.nextCursor && !state.loadingMore && void loadRoots(state.nextCursor),
    toggleThread,
    moreReplies: (rootId: string) => void loadReplies(rootId, state.threads[rootId]?.nextCursor ?? null),
    openComposer,
    closeComposer,
    create,
    remove,
    report,
  };
}

export type ChapterMarks = ReturnType<typeof useChapterMarks>;

const SECTION_ID = 'marcas';

function scrollToSection() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(SECTION_ID)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

/** «N Marcas» beside the chapter header, only when there is a conversation. */
export function ChapterMarksChip({ marks, locale }: { marks: ChapterMarks; locale: Locale }) {
  const { summary, hidden } = marks.state;
  if (hidden || !summary || summary.rootCount === 0) return null;
  const copy = MARKS_COPY[locale].chapter;
  return (
    <button
      type="button"
      aria-label={copy.openConversation}
      onClick={() => {
        marks.request();
        scrollToSection();
      }}
      className="ink-focus ink-dim inline-flex min-h-9 items-center gap-1.5 self-start rounded-pill bg-tint-blue px-3 type-button-sm text-[13px] text-blue"
    >
      <span aria-hidden="true">✎</span>
      {copy.count(summary.markCount)}
    </button>
  );
}

/** The conversation under the chapter. */
export function ChapterMarksSection({
  marks,
  isWorkAuthor,
  locale,
}: {
  marks: ChapterMarks;
  isWorkAuthor: boolean;
  locale: Locale;
}) {
  const all = MARKS_COPY[locale];
  const copy = all.chapter;
  const { state } = marks;
  const section = useRef<HTMLElement>(null);
  const [deleting, setDeleting] = useState<{ markId: string; parentRootId: string | null; withReplies: boolean } | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const { request } = marks;
  const summary = state.summary;
  const visible = !state.hidden && !!summary && (summary.rootCount > 0 || marks.canCreateRoot || state.requested);

  // Reaching the section opens it: the conversation is fetched then, not before.
  useEffect(() => {
    const node = section.current;
    if (!node || !visible || state.requested) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) request();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, state.requested, request]);

  if (!visible || !summary) return null;

  const idle = !state.composer && !state.busy && !state.writesOff;
  const replyAction = (rootId: string, parentId: string, name: string) =>
    idle ? <MarkAction onClick={() => marks.openComposer({ rootId, parentId, name })}>{copy.reply}</MarkAction> : null;
  const ownOrReport = (markId: string, canDelete: boolean, parentRootId: string | null, withReplies: boolean) =>
    canDelete ? (
      <MarkAction tone="danger" disabled={state.busy} onClick={() => setDeleting({ markId, parentRootId, withReplies })}>
        {copy.delete}
      </MarkAction>
    ) : state.reported.includes(markId) ? (
      <MarkAction disabled onClick={() => undefined}>
        {all.alreadyReported}
      </MarkAction>
    ) : (
      <MarkAction onClick={() => setReportingId(markId)}>{copy.report}</MarkAction>
    );

  const composerFor = (rootId: string | null) =>
    state.composer && state.composer.rootId === rootId ? (
      <div className={cx(rootId ? 'mt-2' : 'mt-1')}>
        <MarkComposer
          hint={rootId ? copy.hintReply : copy.hintRoot}
          replyingTo={rootId ? state.composer.name : undefined}
          sending={state.busy}
          error={state.createError}
          blocked={state.writesOff}
          autoFocus
          onSubmit={marks.create}
          onCancel={marks.closeComposer}
          locale={locale}
        />
      </div>
    ) : null;

  return (
    <section ref={section} id={SECTION_ID} aria-labelledby="marcas-title" className="mt-12 flex scroll-mt-16 flex-col gap-4">
      <div className="flex flex-col gap-3 border-y border-divider py-3.5">
        <h2 id="marcas-title" className="type-title-section text-[22px] text-primary">
          {summary.markCount > 0 ? copy.title(summary.markCount) : copy.titleEmpty}
        </h2>
        <div className="flex items-center justify-between gap-3">
          <p className="type-body text-[14.5px] font-semibold text-content">{copy.leaveTitle}</p>
          {marks.canCreateRoot && idle ? (
            <button
              type="button"
              onClick={() => marks.openComposer({ rootId: null, parentId: null, name: '' })}
              className="ink-focus ink-dim min-h-11 shrink-0 rounded-control px-1 type-button-sm text-[14.5px] text-blue"
            >
              {copy.leaveAction}
            </button>
          ) : null}
        </div>
        {isWorkAuthor ? <p className="type-caption text-[13px] text-secondary">{copy.authorCannotStart}</p> : null}
      </div>

      {composerFor(null)}
      <MarkNotice text={marks.notice} />

      {state.rootsStatus === 'loading' || (state.requested && state.rootsStatus === 'idle') ? (
        <InkSkeleton lines={3} height="h-16" label={copy.openConversation} />
      ) : null}

      {state.rootsStatus === 'error' && state.rootsFailure ? (
        <InkInlineBanner
          tone={state.rootsFailure === 'unavailable' ? 'info' : 'error'}
          title={copy.failure[state.rootsFailure === 'notFound' ? 'generic' : state.rootsFailure]}
          action={state.rootsFailure === 'unavailable' ? undefined : <InkTextAction onClick={marks.retryRoots}>{all.retry}</InkTextAction>}
        />
      ) : null}

      {state.rootsStatus === 'ready' && state.roots.length === 0 && !state.composer ? (
        <div className="flex flex-col gap-1 py-2">
          <p className="type-title-section text-[18px] text-primary">{copy.emptyTitle}</p>
          <p className="type-body text-secondary">{marks.canCreateRoot ? copy.emptyBodyCanMark : copy.emptyBody}</p>
        </div>
      ) : null}

      {state.roots.length > 0 ? (
        <ol className="m-0 flex list-none flex-col p-0">
          {state.roots.map((root) => {
            const thread = state.threads[root.id];
            const name = root.author?.displayName || all.anonymous;
            return (
              <li key={root.id} id={`mark-${root.id}`} className="flex scroll-mt-20 flex-col border-t border-divider py-4 first:border-t-0">
                <MarkItem
                  authorName={root.author?.displayName ?? null}
                  authorId={root.author?.userId || undefined}
                  badge={root.isAuthor ? all.authorBadge : null}
                  createdAt={root.createdAt}
                  content={root.content}
                  deletedLabel={root.isDeleted ? copy.deleted : undefined}
                  highlight={state.focusId === root.id}
                  locale={locale}
                  actions={
                    root.isDeleted ? null : (
                      <>
                        {replyAction(root.id, root.id, name)}
                        {ownOrReport(root.id, root.canDelete, null, root.replyCount > 0)}
                      </>
                    )
                  }
                />
                {root.replyCount > 0 ? (
                  <div className="-ml-2">
                    <MarkAction tone="blue" onClick={() => marks.toggleThread(root.id)}>
                      {thread?.expanded ? copy.hideReplies : copy.viewReplies(root.replyCount)}
                    </MarkAction>
                  </div>
                ) : null}
                {thread?.expanded ? (
                  <div className="mt-1 ml-1 flex flex-col gap-4 border-l-2 border-divider pl-4">
                    {thread.items.map((reply) => (
                      <MarkItem
                        key={reply.id}
                        authorName={reply.author.displayName}
                        authorId={reply.author.userId || undefined}
                        badge={reply.isAuthor ? all.authorBadge : null}
                        createdAt={reply.createdAt}
                        content={reply.content}
                        replyingTo={reply.replyingTo || undefined}
                        locale={locale}
                        actions={
                          <>
                            {!root.isDeleted ? replyAction(root.id, reply.id, reply.author.displayName || all.anonymous) : null}
                            {ownOrReport(reply.id, reply.canDelete, root.id, false)}
                          </>
                        }
                      />
                    ))}
                    {thread.loading ? <InkSkeleton lines={1} height="h-12" label={copy.viewReplies(root.replyCount)} /> : null}
                    {thread.failed ? (
                      <div className="-ml-2">
                        <MarkAction tone="blue" onClick={() => marks.moreReplies(root.id)}>
                          {all.retry}
                        </MarkAction>
                      </div>
                    ) : null}
                    {thread.nextCursor && !thread.loading && !thread.failed ? (
                      <div className="-ml-2">
                        <MarkAction tone="blue" onClick={() => marks.moreReplies(root.id)}>
                          {copy.moreReplies}
                        </MarkAction>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {composerFor(root.id)}
              </li>
            );
          })}
        </ol>
      ) : null}

      {state.nextCursor && state.rootsStatus === 'ready' ? (
        <div>
          <InkButton variant="secondary" fullWidth={false} busy={state.loadingMore} onClick={() => marks.loadMoreRoots()}>
            {state.moreFailed ? all.retry : copy.loadMore}
          </InkButton>
        </div>
      ) : null}

      <DeleteMarkDialog
        open={deleting !== null}
        title={copy.deleteTitle}
        body={deleting?.withReplies ? copy.deleteBodyWithReplies : copy.deleteBody}
        confirm={copy.deleteConfirm}
        cancel={all.cancel}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (target) void marks.remove(target.markId, target.parentRootId);
        }}
      />
      <ReportMarkDialog
        open={reportingId !== null}
        title={copy.reportTitle}
        actionLabel={copy.report}
        busy={state.reporting !== null}
        onClose={() => setReportingId(null)}
        onReport={(reason) => {
          const id = reportingId;
          if (id) void marks.report(id, reason).then(() => setReportingId(null));
        }}
        locale={locale}
      />
    </section>
  );
}

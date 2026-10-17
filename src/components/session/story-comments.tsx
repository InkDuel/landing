'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { InkButton } from '@/components/ink/ink-button';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import type { Locale } from '@/lib/i18n';
import { useSession } from '@/lib/session/auth-context';
import {
  type MarkFailure,
  type ReportReason,
  type StoryComment,
  type StoryCommentReply,
  markFailure,
  mergeReplies,
  normalizeMarkDraft,
  storyCommentsApi,
  storyRepliesApi,
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

// Marcas of a duel story (17 - Social), ported from gallery_comments_cubit.dart:
// Marcas plus one level of replies; on your own relato there is no field for a
// Marca, but you can answer one. Inline under the relato (web layout); the
// list is fetched when the reader reaches it, a thread only on «Ver N
// respuestas». Create and delete are optimistic with rollback; a report hides
// nothing. Deleting a Marca takes its thread with it (no tombstones).

const FOCUS_PAGE_BUDGET = 5;
const PENDING_ID = '__pending__';

type Pending = StoryComment & { pending?: boolean };
type PendingReply = StoryCommentReply & { pending?: boolean };

type Thread = {
  expanded: boolean;
  items: PendingReply[];
  nextCursor: string | null;
  loaded: boolean;
  loading: boolean;
  failure: MarkFailure | null;
};

const NEW_THREAD: Thread = { expanded: false, items: [], nextCursor: null, loaded: false, loading: false, failure: null };

/** What «Responder» pointed the composer at: the Marca, or one of its replies. */
type ReplyTarget = { rootId: string; parentReplyId: string | null; name: string };

type Confirm = { rootId: string; replyId: string | null };

type State = {
  requested: boolean;
  status: 'idle' | 'loading' | 'ready' | 'error';
  failure: MarkFailure | null;
  items: Pending[];
  nextCursor: string | null;
  loadingMore: boolean;
  moreFailed: boolean;
  pagesScanned: number;
  count: number;
  canComment: boolean;
  /** Creation answered 503: reading stays, the field goes. */
  writesOff: boolean;
  busy: boolean;
  createError: string | null;
  reported: string[];
  reporting: string | null;
  canReply: boolean;
  /** Reply creation answered 503: threads stay readable, «Responder» goes. */
  repliesOff: boolean;
  threads: Record<string, Thread>;
  replyTarget: ReplyTarget | null;
  replyBusy: boolean;
  replyError: string | null;
};

export function StoryComments({
  duelId,
  storyId,
  isOwnStory,
  initialCount,
  focusId = null,
  autoOpen = false,
  locale,
}: {
  duelId: string;
  storyId: string;
  isOwnStory: boolean;
  initialCount: number;
  /** ?comment=: the received comment to bring into view. */
  focusId?: string | null;
  /** Open without waiting to be reached (the received-comment page). */
  autoOpen?: boolean;
  locale: Locale;
}) {
  const all = MARKS_COPY[locale];
  const copy = all.story;
  const [state, setState] = useState<State>({
    requested: autoOpen || !!focusId,
    status: 'idle',
    failure: null,
    items: [],
    nextCursor: null,
    loadingMore: false,
    moreFailed: false,
    pagesScanned: 0,
    count: Math.max(0, initialCount),
    canComment: false,
    writesOff: false,
    busy: false,
    createError: null,
    reported: [],
    reporting: null,
    canReply: false,
    repliesOff: false,
    threads: {},
    replyTarget: null,
    replyBusy: false,
    replyError: null,
  });
  const alive = useRef(true);
  const section = useRef<HTMLElement>(null);
  const focusShown = useRef(false);
  const identity = useRequestIdentity();
  const replyIdentity = useRequestIdentity();
  const { user } = useSession();
  const [notice, setNotice] = useNotice();
  const [deleting, setDeleting] = useState<Confirm | null>(null);
  const [reportingTarget, setReportingTarget] = useState<Confirm | null>(null);
  const ctx = { locale };

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Reaching the section opens it.
  useEffect(() => {
    const node = section.current;
    if (!node || state.requested) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setState((s) => ({ ...s, requested: true }));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [state.requested]);

  const load = useCallback(
    async (cursor: string | null) => {
      setState((s) => (cursor ? { ...s, loadingMore: true, moreFailed: false } : { ...s, status: 'loading', failure: null }));
      try {
        const page = await storyCommentsApi.list(duelId, storyId, cursor, { locale });
        if (!alive.current) return;
        setState((s) => {
          const seen = new Set(s.items.map((item) => item.id));
          const items = cursor ? [...s.items, ...page.items.filter((item) => !seen.has(item.id))] : page.items;
          return {
            ...s,
            status: 'ready',
            loadingMore: false,
            items,
            nextCursor: page.nextCursor,
            pagesScanned: s.pagesScanned + 1,
            count: page.commentsCount,
            canComment: page.canComment,
            canReply: page.canReply,
          };
        });
      } catch (error) {
        if (!alive.current) return;
        const failure = markFailure(error);
        setState((s) =>
          cursor
            ? { ...s, loadingMore: false, moreFailed: true }
            : { ...s, status: 'error', failure, writesOff: s.writesOff || failure === 'unavailable' },
        );
      }
    },
    [duelId, storyId, locale],
  );

  useEffect(() => {
    if (state.requested && state.status === 'idle') void load(null);
  }, [state.requested, state.status, load]);

  const loadReplies = useCallback(
    async (rootId: string, cursor: string | null) => {
      setState((s) => ({
        ...s,
        threads: { ...s.threads, [rootId]: { ...(s.threads[rootId] ?? NEW_THREAD), expanded: true, loading: true, failure: null } },
      }));
      try {
        const page = await storyRepliesApi.list(duelId, storyId, rootId, cursor, { locale });
        if (!alive.current) return;
        setState((s) => {
          const thread = s.threads[rootId] ?? NEW_THREAD;
          return {
            ...s,
            canReply: page.canReply,
            items: s.items.map((item) => (item.id === rootId ? { ...item, replyCount: page.replyCount } : item)),
            threads: {
              ...s.threads,
              // Merged, never replaced: a reply sent before this page keeps
              // its chronological place, and a pending one stays last.
              [rootId]: { ...thread, loading: false, loaded: true, items: mergeReplies(thread.items, page.items), nextCursor: page.nextCursor },
            },
          };
        });
      } catch (error) {
        if (!alive.current) return;
        const failure = markFailure(error);
        setState((s) => ({
          ...s,
          threads: { ...s.threads, [rootId]: { ...(s.threads[rootId] ?? NEW_THREAD), loading: false, failure } },
        }));
      }
    },
    [duelId, storyId, locale],
  );

  // ?comment=: page (bounded) until it appears, then bring it into view.
  useEffect(() => {
    if (!focusId || focusShown.current || state.status !== 'ready' || state.loadingMore) return;
    const focused = state.items.find((item) => item.id === focusId);
    if (focused) {
      focusShown.current = true;
      if (focused.replyCount > 0) void loadReplies(focusId, null);
      document.getElementById(`comment-${focusId}`)?.scrollIntoView({ block: 'center', behavior: 'instant' });
      return;
    }
    if (state.nextCursor && !state.moreFailed && state.pagesScanned < FOCUS_PAGE_BUDGET) void load(state.nextCursor);
  }, [focusId, state.status, state.loadingMore, state.items, state.nextCursor, state.moreFailed, state.pagesScanned, load, loadReplies]);

  const canWrite = !isOwnStory && state.canComment && !state.writesOff;
  /** The backend decides who may answer (the relato's author included). */
  const canStartReply = state.canReply && !state.repliesOff && !state.replyTarget && !state.replyBusy;

  function toggleThread(rootId: string) {
    const thread = state.threads[rootId];
    if (thread?.loading) return;
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

  function startReply(target: ReplyTarget) {
    if (!canStartReply) return;
    setState((s) => ({ ...s, replyTarget: target, replyError: null }));
    const thread = state.threads[target.rootId];
    const root = state.items.find((item) => item.id === target.rootId);
    if (!thread?.expanded && (root?.replyCount ?? 0) > 0) toggleThread(target.rootId);
  }

  function cancelReply() {
    if (state.replyBusy) return;
    // Cancelling ends the attempt: the same text typed later is a new reply.
    replyIdentity.clear();
    setState((s) => ({ ...s, replyTarget: null, replyError: null }));
  }

  async function createReply(text: string): Promise<boolean> {
    const target = state.replyTarget;
    if (!target || state.replyBusy || state.repliesOff || !state.canReply) return false;
    const { rootId, parentReplyId } = target;
    const requestId = replyIdentity.idFor(text, `${rootId}\n${parentReplyId ?? ''}`);
    const pending: PendingReply = {
      id: PENDING_ID,
      author: { userId: '', displayName: user?.username ?? '' },
      content: normalizeMarkDraft(text),
      createdAt: new Date().toISOString(),
      canDelete: false,
      parentReplyId: parentReplyId ?? '',
      replyingTo: parentReplyId ? target.name : '',
      pending: true,
    };
    const neverOpened = !state.threads[rootId]?.loaded && (state.items.find((item) => item.id === rootId)?.replyCount ?? 0) > 0;
    setState((s) => {
      const thread = s.threads[rootId] ?? NEW_THREAD;
      const items = [...thread.items.filter((item) => item.id !== PENDING_ID), pending];
      return { ...s, replyBusy: true, replyError: null, threads: { ...s.threads, [rootId]: { ...thread, expanded: true, items } } };
    });
    try {
      const result = await storyRepliesApi.create(duelId, storyId, rootId, requestId, text, parentReplyId, ctx);
      if (!alive.current) return false;
      replyIdentity.clear();
      setState((s) => {
        const thread = s.threads[rootId] ?? NEW_THREAD;
        const items = mergeReplies<PendingReply>(thread.items.filter((item) => item.id !== PENDING_ID), [result.reply]);
        return {
          ...s,
          replyBusy: false,
          replyTarget: null,
          items: s.items.map((item) => (item.id === rootId ? { ...item, replyCount: result.replyCount } : item)),
          threads: { ...s.threads, [rootId]: { ...thread, items } },
        };
      });
      // A reply in a thread never opened: bring in the replies before it.
      if (neverOpened) void loadReplies(rootId, null);
      setNotice(copy.replyCreated);
      return true;
    } catch (error) {
      if (!alive.current) return false;
      const failure = markFailure(error);
      // A conflict means this id cannot be reused; anything else keeps it,
      // so retrying the same text is free and never duplicates.
      if (failure === 'conflict') replyIdentity.clear();
      setState((s) => {
        const thread = s.threads[rootId] ?? NEW_THREAD;
        return {
          ...s,
          replyBusy: false,
          repliesOff: s.repliesOff || failure === 'unavailable',
          replyError: failure === 'notFound' ? copy.threadUnavailable : copy.failure[failure],
          threads: { ...s.threads, [rootId]: { ...thread, items: thread.items.filter((item) => item.id !== PENDING_ID) } },
        };
      });
      return false;
    }
  }

  async function removeReply(rootId: string, replyId: string) {
    if (state.replyBusy) return;
    const thread = state.threads[rootId];
    const removed = thread?.items.find((item) => item.id === replyId);
    if (!thread || !removed?.canDelete) return;
    const previousCount = state.items.find((item) => item.id === rootId)?.replyCount ?? 0;
    const withCount = (items: Pending[], replyCount: number) =>
      items.map((item) => (item.id === rootId ? { ...item, replyCount: Math.max(0, replyCount) } : item));
    setState((s) => {
      const current = s.threads[rootId] ?? NEW_THREAD;
      return {
        ...s,
        replyBusy: true,
        items: withCount(s.items, previousCount - 1),
        threads: { ...s.threads, [rootId]: { ...current, items: current.items.filter((item) => item.id !== replyId) } },
      };
    });
    try {
      const result = await storyRepliesApi.remove(duelId, storyId, rootId, replyId, ctx);
      if (!alive.current) return;
      setState((s) => ({ ...s, replyBusy: false, items: withCount(s.items, result.replyCount) }));
      setNotice(copy.replyDeleted);
    } catch (error) {
      if (!alive.current) return;
      setState((s) => {
        const current = s.threads[rootId] ?? NEW_THREAD;
        return {
          ...s,
          replyBusy: false,
          items: withCount(s.items, previousCount),
          threads: { ...s.threads, [rootId]: { ...current, items: mergeReplies(current.items, [removed]) } },
        };
      });
      setNotice(copy.failure[markFailure(error)]);
    }
  }

  async function create(text: string): Promise<boolean> {
    if (!canWrite || state.busy) return false;
    const requestId = identity.idFor(text, null);
    const pending: Pending = {
      id: PENDING_ID,
      author: { userId: '', displayName: user?.username ?? '' },
      content: normalizeMarkDraft(text),
      createdAt: new Date().toISOString(),
      canDelete: false,
      replyCount: 0,
      pending: true,
    };
    setState((s) => ({ ...s, busy: true, createError: null, items: [pending, ...s.items.filter((item) => item.id !== PENDING_ID)] }));
    try {
      const result = await storyCommentsApi.create(duelId, storyId, requestId, text, ctx);
      if (!alive.current) return false;
      identity.clear();
      setState((s) => ({
        ...s,
        busy: false,
        count: result.commentsCount,
        items: [result.comment, ...s.items.filter((item) => item.id !== PENDING_ID && item.id !== result.comment.id)],
      }));
      setNotice(copy.created);
      return true;
    } catch (error) {
      if (!alive.current) return false;
      const failure = markFailure(error);
      if (failure === 'conflict') identity.clear();
      setState((s) => ({
        ...s,
        busy: false,
        items: s.items.filter((item) => item.id !== PENDING_ID),
        writesOff: s.writesOff || failure === 'unavailable',
        createError: failure === 'unavailable' ? copy.createUnavailable : copy.failure[failure],
      }));
      return false;
    }
  }

  async function remove(commentId: string) {
    if (state.busy) return;
    const index = state.items.findIndex((item) => item.id === commentId);
    if (index < 0 || !state.items[index].canDelete) return;
    const removed = state.items[index];
    const previousCount = state.count;
    setState((s) => ({ ...s, busy: true, count: Math.max(0, s.count - 1), items: s.items.filter((item) => item.id !== commentId) }));
    try {
      const result = await storyCommentsApi.remove(duelId, storyId, commentId, ctx);
      if (!alive.current) return;
      setState((s) => {
        // The thread goes with its Marca.
        const threads = { ...s.threads };
        delete threads[commentId];
        return { ...s, busy: false, count: result.commentsCount, threads };
      });
      setNotice(copy.deletedNotice);
    } catch (error) {
      if (!alive.current) return;
      setState((s) => {
        const items = [...s.items];
        items.splice(Math.min(index, items.length), 0, removed);
        return { ...s, busy: false, count: previousCount, items };
      });
      setNotice(copy.failure[markFailure(error)]);
    }
  }

  async function report(target: Confirm, reason: ReportReason) {
    if (state.reporting) return;
    const key = target.replyId ?? target.rootId;
    setState((s) => ({ ...s, reporting: key }));
    try {
      if (target.replyId) {
        await storyRepliesApi.report(duelId, storyId, target.rootId, target.replyId, reason, ctx);
      } else {
        await storyCommentsApi.report(duelId, storyId, target.rootId, reason, ctx);
      }
      if (!alive.current) return;
      setState((s) => ({ ...s, reporting: null, reported: [...s.reported, key] }));
      setNotice(copy.reported);
    } catch (error) {
      if (!alive.current) return;
      setState((s) => ({ ...s, reporting: null }));
      setNotice(copy.failure[markFailure(error)]);
    } finally {
      setReportingTarget(null);
    }
  }

  /** Borrar for your own, Reportar (once) for anyone else's. */
  const ownOrReport = (target: Confirm, canDelete: boolean, disabled: boolean) => {
    const key = target.replyId ?? target.rootId;
    if (canDelete) {
      return (
        <MarkAction tone="danger" disabled={disabled} onClick={() => setDeleting(target)}>
          {copy.delete}
        </MarkAction>
      );
    }
    if (state.reported.includes(key)) {
      return (
        <MarkAction disabled onClick={() => undefined}>
          {all.alreadyReported}
        </MarkAction>
      );
    }
    return <MarkAction onClick={() => setReportingTarget(target)}>{copy.report}</MarkAction>;
  };

  const replyAction = (target: ReplyTarget) =>
    canStartReply ? <MarkAction onClick={() => startReply(target)}>{copy.reply}</MarkAction> : null;

  const sendingLabel = <span className="px-2 type-caption text-[12.5px] text-tertiary">{all.sending}</span>;

  function renderThread(root: Pending) {
    const thread = state.threads[root.id];
    const rootName = root.author.displayName || all.anonymous;
    const composing = state.replyTarget?.rootId === root.id;
    return (
      <>
        {root.replyCount > 0 ? (
          <div className="-ml-2">
            <MarkAction tone="blue" disabled={thread?.loading} onClick={() => toggleThread(root.id)}>
              {thread?.expanded ? copy.hideReplies : copy.viewReplies(root.replyCount)}
            </MarkAction>
          </div>
        ) : null}
        {thread?.expanded && (thread.items.length > 0 || thread.loading || thread.failure) ? (
          <ol className="m-0 mt-1 ml-1 flex list-none flex-col gap-4 border-l-2 border-divider p-0 pl-4">
            {thread.items.map((reply) => (
              <li key={reply.id} id={`reply-${reply.id}`}>
                <MarkItem
                  authorName={reply.author.displayName}
                  authorId={reply.pending ? undefined : reply.author.userId || undefined}
                  badge={reply.canDelete || reply.pending ? all.youBadge : null}
                  createdAt={reply.createdAt}
                  content={reply.content}
                  replyingTo={reply.replyingTo || undefined}
                  locale={locale}
                  actions={
                    reply.pending ? (
                      sendingLabel
                    ) : (
                      <>
                        {replyAction({ rootId: root.id, parentReplyId: reply.id, name: reply.author.displayName || all.anonymous })}
                        {ownOrReport({ rootId: root.id, replyId: reply.id }, reply.canDelete, state.replyBusy)}
                      </>
                    )
                  }
                />
              </li>
            ))}
            {thread.loading ? (
              <li>
                <InkSkeleton lines={1} height="h-12" label={copy.viewReplies(root.replyCount)} />
              </li>
            ) : null}
            {thread.failure && !thread.loading ? (
              <li className="-ml-2 flex flex-wrap items-center gap-x-1">
                {thread.failure === 'notFound' ? (
                  <p className="px-2 type-caption text-[13px] text-secondary">{copy.threadUnavailable}</p>
                ) : (
                  <MarkAction tone="blue" onClick={() => void loadReplies(root.id, thread.loaded ? thread.nextCursor : null)}>
                    {all.retry}
                  </MarkAction>
                )}
              </li>
            ) : null}
            {thread.nextCursor && !thread.loading && !thread.failure ? (
              <li className="-ml-2">
                <MarkAction tone="blue" onClick={() => void loadReplies(root.id, thread.nextCursor)}>
                  {copy.moreReplies}
                </MarkAction>
              </li>
            ) : null}
          </ol>
        ) : null}
        {composing && state.replyTarget ? (
          <div className="mt-2">
            <MarkComposer
              hint={copy.hintReply}
              replyingTo={state.replyTarget.parentReplyId ? state.replyTarget.name : rootName}
              sending={state.replyBusy}
              error={state.replyError}
              blocked={state.repliesOff}
              autoFocus
              onSubmit={createReply}
              onCancel={cancelReply}
              locale={locale}
            />
          </div>
        ) : null}
      </>
    );
  }

  return (
    <section ref={section} aria-labelledby={`comments-${storyId}`} className="mt-12 flex scroll-mt-16 flex-col gap-4">
      <div className="border-y border-divider py-3.5">
        <h2 id={`comments-${storyId}`} className="type-title-section text-[22px] text-primary">
          {state.count > 0 ? copy.title(state.count) : copy.titleEmpty}
        </h2>
      </div>

      {isOwnStory ? <p className="type-caption text-[13px] text-secondary">{copy.selfComment}</p> : null}
      {canWrite || (state.createError && !isOwnStory) ? (
        <MarkComposer
          hint={copy.hint}
          sending={state.busy}
          error={state.createError}
          blocked={!canWrite}
          onSubmit={create}
          locale={locale}
        />
      ) : null}
      <MarkNotice text={notice} />

      {state.status === 'loading' || (state.requested && state.status === 'idle') ? (
        <InkSkeleton lines={3} height="h-14" label={all.story.titleEmpty} />
      ) : null}

      {state.status === 'error' && state.failure ? (
        <InkInlineBanner
          tone={state.failure === 'unavailable' ? 'info' : 'error'}
          title={state.failure === 'unavailable' ? copy.failure.unavailable : all.chapter.failure[state.failure === 'notFound' ? 'generic' : state.failure]}
          action={state.failure === 'unavailable' ? undefined : <InkTextAction onClick={() => void load(null)}>{all.retry}</InkTextAction>}
        />
      ) : null}

      {state.status === 'ready' && state.items.length === 0 ? (
        <div className="flex flex-col gap-1 py-2">
          <p className="type-title-section text-[18px] text-primary">{copy.emptyTitle}</p>
          {canWrite ? <p className="type-body text-secondary">{copy.emptyBody}</p> : null}
        </div>
      ) : null}

      {state.items.length > 0 ? (
        <ol className="m-0 flex list-none flex-col p-0">
          {state.items.map((item) => (
            <li key={item.id} id={`comment-${item.id}`} className="flex scroll-mt-20 flex-col border-t border-divider py-4 first:border-t-0">
              <MarkItem
                authorName={item.author.displayName}
                authorId={item.pending ? undefined : item.author.userId || undefined}
                badge={item.canDelete || item.pending ? all.youBadge : null}
                createdAt={item.createdAt}
                content={item.content}
                highlight={focusId === item.id}
                locale={locale}
                actions={
                  item.pending ? (
                    sendingLabel
                  ) : (
                    <>
                      {replyAction({ rootId: item.id, parentReplyId: null, name: item.author.displayName || all.anonymous })}
                      {ownOrReport(
                        { rootId: item.id, replyId: null },
                        item.canDelete,
                        state.busy || state.replyTarget?.rootId === item.id,
                      )}
                    </>
                  )
                }
              />
              {item.pending ? null : renderThread(item)}
            </li>
          ))}
        </ol>
      ) : null}

      {state.nextCursor && state.status === 'ready' ? (
        <div>
          <InkButton variant="secondary" fullWidth={false} busy={state.loadingMore} onClick={() => void load(state.nextCursor)}>
            {state.moreFailed ? all.retry : copy.loadMore}
          </InkButton>
        </div>
      ) : null}

      <DeleteMarkDialog
        open={deleting !== null}
        title={deleting?.replyId ? copy.replyDeleteTitle : copy.deleteTitle}
        body={deleting?.replyId ? copy.replyDeleteBody : copy.deleteBody}
        confirm={copy.deleteConfirm}
        cancel={all.cancel}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (!target) return;
          if (target.replyId) void removeReply(target.rootId, target.replyId);
          else void remove(target.rootId);
        }}
      />
      <ReportMarkDialog
        open={reportingTarget !== null}
        title={copy.reportTitle}
        actionLabel={copy.report}
        busy={state.reporting !== null}
        onClose={() => setReportingTarget(null)}
        onReport={(reason) => reportingTarget && void report(reportingTarget, reason)}
        locale={locale}
      />
    </section>
  );
}

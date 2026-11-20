'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Locale } from '@/lib/i18n';
import { useSession } from '@/lib/session/auth-context';
import {
  type MarkFailure,
  type ReportReason,
  type StoryComment,
  type StoryCommentReply,
  type StoryPassageDraft,
  isBareBadRequest,
  isPassageInvalid,
  isPassagesUnavailable,
  markFailure,
  mergeReplies,
  normalizeMarkDraft,
  storyCommentsApi,
  storyRepliesApi,
} from '@/lib/session/marks';
import { MARKS_COPY } from '@/lib/session/marks-copy';

import { useNotice, useRequestIdentity } from './marks-parts';

// State and actions of the Marcas of a duel story (see story-comments.tsx for
// the behaviour notes): lifted out of the view so other surfaces can reuse it.

/** Pages a ?comment= search may scan, as the app's duel-story thread search
 * (gallery_comments_cubit.dart _maxThreadSearchPages). Not found by then: the
 * conversation opens as usual. */
const FOCUS_PAGE_BUDGET = 10;
const PENDING_ID = '__pending__';

export type Pending = StoryComment & { pending?: boolean };
export type PendingReply = StoryCommentReply & { pending?: boolean };

export type Thread = {
  expanded: boolean;
  items: PendingReply[];
  nextCursor: string | null;
  loaded: boolean;
  loading: boolean;
  failure: MarkFailure | null;
};

const NEW_THREAD: Thread = { expanded: false, items: [], nextCursor: null, loaded: false, loading: false, failure: null };

/** What «Responder» pointed the composer at: the Marca, or one of its replies. */
export type ReplyTarget = { rootId: string; parentReplyId: string | null; name: string };

export type Confirm = { rootId: string; replyId: string | null };

export type State = {
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
  /**
   * A quoted Marca the server refused with one of the two quote codes: the
   * reader is offered «Dejarla sin cita». The text is kept; nothing is sent
   * without the reader's yes.
   */
  quoteOffer: { text: string; passage: StoryPassageDraft } | null;
};

/**
 * What a surface hangs on the instance. All optional: the plain conversation
 * (StoryComments on its own) passes none of them.
 */
export type StoryMarksOptions = {
  duelId: string;
  storyId: string;
  isOwnStory: boolean;
  initialCount: number;
  /** ?comment=: the received comment to bring into view. */
  focusId?: string | null;
  /** Open without waiting to be reached (the received-comment page). */
  autoOpen?: boolean;
  locale: Locale;
  /**
   * The instance of one paragraph's panel: it lists `?passage=` and handles
   * replies, delete and report, but can NOT create roots.
   */
  passageKey?: string | null;
  /** Marca con cita: how the text hears what happens to quoted roots. */
  quotes?: {
    /** A quoted root is on its way: mark the paragraph at once. */
    onPending?: (key: string) => void;
    /** It did not make it: undo what onPending did. */
    onFailed?: (key: string) => void;
    /** A Marca went in: the key of its quote, or null for a general one. */
    onCreated?: (key: string | null) => void;
    /** A quoted root was deleted: the summary must be re-read. */
    onRemoved?: () => void;
    /** 503 passages_unavailable: stop offering quotes. */
    onUnavailable?: () => void;
    /** After a bare 400 on a quoted create: does the summary still carry `passages`? */
    stillAvailable?: () => Promise<boolean>;
  };
  /** A reply or a delete went through (the panel reloads the general list on close). */
  onMutated?: () => void;
};

export function useStoryMarks({
  duelId,
  storyId,
  isOwnStory,
  initialCount,
  focusId = null,
  autoOpen = false,
  locale,
  passageKey = null,
  quotes,
  onMutated,
}: StoryMarksOptions) {
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
    quoteOffer: null,
  });
  // The latest callbacks, read from async code without making it re-run.
  const hooks = useRef({ quotes, onMutated });
  useEffect(() => {
    hooks.current = { quotes, onMutated };
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
        const page = await storyCommentsApi.list(duelId, storyId, cursor, passageKey ? { locale, passage: passageKey } : { locale });
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
    [duelId, storyId, locale, passageKey],
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

  // The panel of a paragraph never starts a root.
  const canWrite = !passageKey && !isOwnStory && state.canComment && !state.writesOff;
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
      // It happened on the server even if this instance is gone (a panel closed
      // mid-flight): the owner must hear it. The callback lives in a ref.
      hooks.current.onMutated?.();
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
      hooks.current.onMutated?.();
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

  /**
   * A general Marca, or a root quoting one paragraph when [passage] is given
   * (the instance of a paragraph's panel can do neither). The quote is part of
   * the attempt's identity: the same text on another quote is another Marca.
   */
  async function create(text: string, passage?: StoryPassageDraft): Promise<boolean> {
    if (!canWrite || state.busy) return false;
    const requestId = identity.idFor(text, null, passage ? `${passage.paragraphKey}\n${passage.quote}` : '');
    const pending: Pending = {
      id: PENDING_ID,
      author: { userId: '', displayName: user?.username ?? '' },
      content: normalizeMarkDraft(text),
      createdAt: new Date().toISOString(),
      canDelete: false,
      replyCount: 0,
      pending: true,
      ...(passage ? { passage: { paragraphKey: passage.paragraphKey, located: true, quote: passage.quote } } : {}),
    };
    setState((s) => ({
      ...s,
      busy: true,
      createError: null,
      quoteOffer: null,
      items: [pending, ...s.items.filter((item) => item.id !== PENDING_ID)],
    }));
    if (passage) hooks.current.quotes?.onPending?.(passage.paragraphKey);
    try {
      const result = passage
        ? await storyCommentsApi.create(duelId, storyId, requestId, text, ctx, passage)
        : await storyCommentsApi.create(duelId, storyId, requestId, text, ctx);
      if (!alive.current) return false;
      identity.clear();
      setState((s) => ({
        ...s,
        busy: false,
        count: result.commentsCount,
        // A quoted Marca may land before the conversation was ever read: let it load.
        requested: s.requested || !!passage,
        items: [result.comment, ...s.items.filter((item) => item.id !== PENDING_ID && item.id !== result.comment.id)],
      }));
      hooks.current.quotes?.onCreated?.(passage ? passage.paragraphKey : null);
      setNotice(copy.created);
      return true;
    } catch (error) {
      if (!alive.current) return false;
      const failure = markFailure(error);
      if (failure === 'conflict') identity.clear();
      if (passage) hooks.current.quotes?.onFailed?.(passage.paragraphKey);

      // Only the two quote codes (or a bare 400 once the summary has lost
      // `passages`) end in the explicit offer: never a silent plain Marca.
      let offer = false;
      if (passage) {
        const unavailable = isPassagesUnavailable(error);
        if (unavailable) hooks.current.quotes?.onUnavailable?.();
        if (unavailable || isPassageInvalid(error)) offer = true;
        else if (isBareBadRequest(error)) {
          const still = await (hooks.current.quotes?.stillAvailable?.() ?? Promise.resolve(true)).catch(() => true);
          if (!alive.current) return false;
          offer = !still;
        }
      }
      if (offer && passage) {
        // The old id is dead: the plain attempt gets a new one.
        identity.clear();
        setState((s) => ({
          ...s,
          busy: false,
          items: s.items.filter((item) => item.id !== PENDING_ID),
          quoteOffer: { text, passage },
        }));
        return false;
      }
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

  /** «Dejarla sin cita»: the same text as a general Marca, on a new request id. */
  async function leaveWithoutQuote(): Promise<boolean> {
    const offer = state.quoteOffer;
    if (!offer || state.busy) return false;
    identity.clear();
    return create(offer.text);
  }

  /** «Cancelar»: the offer goes away; the text stays where the reader typed it. */
  function dismissQuoteOffer() {
    setState((s) => (s.quoteOffer ? { ...s, quoteOffer: null } : s));
  }

  /** Counters and permissions from the summary, before the list is read. */
  function applySummary(summary: { commentsCount: number; canComment: boolean; canReply: boolean }) {
    setState((s) => ({
      ...s,
      count: summary.commentsCount,
      canComment: summary.canComment,
      canReply: summary.canReply,
    }));
  }

  /** Opens the conversation (what reaching it does). */
  function request() {
    setState((s) => (s.requested ? s : { ...s, requested: true }));
  }

  /** Reads the first page again, after a change made elsewhere (the paragraph panel). */
  function reload() {
    if (state.requested) void load(null);
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
      hooks.current.onMutated?.();
      if (!alive.current) return;
      setState((s) => {
        // The thread goes with its Marca.
        const threads = { ...s.threads };
        delete threads[commentId];
        return { ...s, busy: false, count: result.commentsCount, threads };
      });
      setNotice(copy.deletedNotice);
      if (removed.passage) hooks.current.quotes?.onRemoved?.();
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
  return {
    all,
    copy,
    state,
    section,
    notice,
    deleting,
    setDeleting,
    reportingTarget,
    setReportingTarget,
    canWrite,
    canStartReply,
    load,
    loadReplies,
    toggleThread,
    startReply,
    cancelReply,
    createReply,
    removeReply,
    create,
    leaveWithoutQuote,
    dismissQuoteOffer,
    applySummary,
    request,
    reload,
    remove,
    report,
  };
}

/** What a surface gets from the hook: the state and every action. */
export type StoryMarksApi = ReturnType<typeof useStoryMarks>;

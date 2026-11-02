'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { cx } from '@/components/ink/cx';
import { InkButton } from '@/components/ink/ink-button';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { track } from '@/lib/analytics';
import type { Locale } from '@/lib/i18n';
import {
  type ChapterMarksSummary,
  type InkMarkReply,
  type InkMarkRoot,
  type MarkFailure,
  type PassageDraft,
  type ReportReason,
  inkMarksApi,
  isPassageChanged,
  isPassagesUnavailable,
  markFailure,
  mergeReplies,
} from '@/lib/session/marks';
import { MARKS_COPY } from '@/lib/session/marks-copy';
import type { PassageSource } from '@/lib/session/passages';
import { SESSION_COPY } from '@/lib/session/copy';

import {
  DeleteMarkDialog,
  MarkAction,
  MarkComposer,
  MarkItem,
  MarkNotice,
  QuoteLine,
  ReportMarkDialog,
  useNotice,
  useRequestIdentity,
} from './marks-parts';
import { PassageSheet } from './passage-sheet';

// Marcas of a chapter (17 - Social), ported from work_ink_marks_cubit.dart.
// The chapter text never depends on this: opening a chapter costs one cheap
// summary read, a failed or switched-off summary renders nothing, and the
// conversation is fetched only when the reader opens or reaches it. Replies
// are fetched only on an explicit «Ver N respuestas». Writes are serialized.
// Web layout (founder, phase 3): the conversation lives under the chapter,
// never in a floating panel; the chip in the header scrolls to it.

/** Pages the ?mark= search may scan before giving up (the app's budget). */
export const FOCUS_PAGE_BUDGET = 5;

/** Reply pages a ?reply= search may load beyond the first (the first comes with the thread). */
export const REPLY_FOCUS_EXTRA_PAGES = 2;

/** How long the reply a notification pointed at stays highlighted. */
const REPLY_HIGHLIGHT_MS = 3000;

type Thread = {
  expanded: boolean;
  items: InkMarkReply[];
  nextCursor: string | null;
  loaded: boolean;
  loading: boolean;
  failed: boolean;
};

const NEW_THREAD: Thread = { expanded: false, items: [], nextCursor: null, loaded: false, loading: false, failed: false };

type Target = {
  rootId: string | null;
  parentId: string | null;
  name: string;
  /** A root quoting part of a paragraph (Marca con cita). */
  passage?: PassageDraft;
  /** Where a root was started, for analytics. */
  source?: PassageSource;
};

/** The sheet «Marcas de este párrafo»: always the server's own answer for one key. */
type PassagePanel = {
  key: string;
  status: 'loading' | 'ready' | 'error';
  failure: MarkFailure | null;
  items: InkMarkRoot[];
  nextCursor: string | null;
  loadingMore: boolean;
  moreFailed: boolean;
};

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
  /** ?reply=: a reply of the focused thread to bring into view. */
  replyFocusId: string | null;
  /** The reply highlighted for a moment once found. */
  replyHighlight: string | null;
  reported: string[];
  reporting: string | null;
  passage: PassagePanel | null;
  /** Create answered 503 passages_unavailable: quoting is off, plain Marcas are not. */
  quoteOff: boolean;
  /** A paragraph whose thread count promised Marcas the server did not return. */
  hiddenKeys: string[];
  /** Create answered 409 passage_changed: the reader must choose the passage again. */
  conflict: boolean;
};

const initialState = (focusId: string | null, replyFocusId: string | null = null): State => ({
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
  replyFocusId: focusId && replyFocusId && replyFocusId !== focusId ? replyFocusId : null,
  replyHighlight: null,
  reported: [],
  reporting: null,
  passage: null,
  quoteOff: false,
  hiddenKeys: [],
  conflict: false,
});

/** The same change on the chapter's roots and on the open paragraph's roots. */
function mapRoots(s: State, fn: (roots: InkMarkRoot[]) => InkMarkRoot[]): Pick<State, 'roots' | 'passage'> {
  return { roots: fn(s.roots), passage: s.passage ? { ...s.passage, items: fn(s.passage.items) } : null };
}

/** First occurrence wins, so a replayed create never paints a Marca twice. */
function dedupe<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/**
 * The app's Marca events (V0 §7), only for a new Marca: an idempotent replay
 * (created=false) was already counted. isAuthor is the server's, never inferred.
 */
function trackMarkCreated(
  chapter: { workId: string; chapterId: string; orderIndex: number },
  result: { root: InkMarkRoot | null; reply: InkMarkReply | null },
  origin: { hasPassage: boolean; source: PassageSource | null },
) {
  const base = { work_id: chapter.workId, chapter_id: chapter.chapterId, order_index: chapter.orderIndex };
  if (result.root) {
    track('ink_mark_created', {
      ...base,
      is_reply: false,
      is_author: result.root.isAuthor,
      has_passage: origin.hasPassage,
      source: origin.source,
    });
  }
  if (result.reply) {
    track('ink_mark_reply_created', { ...base, is_author: result.reply.isAuthor });
    if (result.reply.isAuthor) track('ink_mark_author_reply_created', base);
  }
}

export type ChapterMarksOptions = {
  /** Re-reads the chapter text without leaving the page (after a passage conflict). */
  reloadChapter?: () => Promise<void>;
  /** The reader just left their first quoted Marca. */
  onQuoted?: () => void;
};

export function useChapterMarks(
  workId: string,
  chapterId: string,
  orderIndex: number,
  locale: Locale,
  options: ChapterMarksOptions = {},
) {
  const [state, setState] = useState<State>(() => initialState(null));
  const optionsRef = useRef(options);
  optionsRef.current = options;
  // Reply pages the ?reply= search has loaded for the focused thread.
  const replyPages = useRef(0);
  const replyFocusDone = useRef(false);
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
    const params = new URLSearchParams(window.location.search);
    const focus = params.get('mark');
    replyPages.current = 0;
    replyFocusDone.current = false;
    focusShown.current = null;
    setState(initialState(focus || null, params.get('reply')));
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
          summary: { markCount: page.markCount, rootCount: page.rootCount, canMark: page.canMark, passages: s.summary?.passages ?? null },
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
                items: mergeReplies(thread.items, page.items),
                nextCursor: page.nextCursor,
              },
            },
            ...mapRoots(s, (roots) => roots.map((root) => (root.id === rootId ? { ...root, replyCount: page.replyCount } : root))),
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

  // ?reply=: with the root's thread open, look for that reply in the pages it
  // already has and load at most REPLY_FOCUS_EXTRA_PAGES more. Not found: the
  // thread stays open, as a link without ?reply= would leave it.
  useEffect(() => {
    const focus = state.focusId;
    const reply = state.replyFocusId;
    if (!focus || !reply || replyFocusDone.current || focusShown.current !== focus) return;
    const root = state.roots.find((item) => item.id === focus);
    if (!root || root.replyCount === 0) {
      replyFocusDone.current = true;
      return;
    }
    const thread = state.threads[focus];
    if (!thread || thread.loading) return;
    if (!thread.loaded) {
      // The first page is on its way (or failed): nothing to search in.
      if (thread.failed) replyFocusDone.current = true;
      return;
    }
    if (thread.items.some((item) => item.id === reply)) {
      replyFocusDone.current = true;
      setState((s) => ({ ...s, replyHighlight: reply }));
      document.getElementById(`mark-${reply}`)?.scrollIntoView({ block: 'center', behavior: 'instant' });
      return;
    }
    if (thread.failed || !thread.nextCursor || replyPages.current >= REPLY_FOCUS_EXTRA_PAGES) {
      replyFocusDone.current = true;
      return;
    }
    replyPages.current += 1;
    void loadReplies(focus, thread.nextCursor);
  }, [state.focusId, state.replyFocusId, state.roots, state.threads, loadReplies]);

  useEffect(() => {
    if (!state.replyHighlight) return;
    const timer = setTimeout(() => setState((s) => ({ ...s, replyHighlight: null })), REPLY_HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [state.replyHighlight]);

  // ?mark= is only «unavailable» when the whole listing was read and the root
  // is not in it. Stopping at the page budget with more pages left proves
  // nothing — it stays silent, as before.
  const focusUnavailable =
    !!state.focusId &&
    state.rootsStatus === 'ready' &&
    !state.loadingMore &&
    !state.nextCursor &&
    !state.moreFailed &&
    !state.roots.some((item) => item.id === state.focusId);

  const request = useCallback(() => setState((s) => (s.requested ? s : { ...s, requested: true })), []);

  /** Adopt the server's summary (and with it, the keys of the text it describes). */
  const refreshSummary = useCallback(async () => {
    const gen = generation.current;
    try {
      const summary = await inkMarksApi.summary(workId, chapterId, { locale: localeRef.current });
      if (live(gen)) setState((s) => ({ ...s, summary }));
    } catch {
      // Best effort: the previous summary keeps working.
    }
  }, [workId, chapterId]);

  const loadPassage = useCallback(
    async (key: string, pageCursor: string | null) => {
      const gen = generation.current;
      setState((s) =>
        s.passage?.key === key
          ? { ...s, passage: { ...s.passage, loadingMore: !!pageCursor, moreFailed: false, status: pageCursor ? s.passage.status : 'loading' } }
          : s,
      );
      try {
        const page = await inkMarksApi.roots(workId, chapterId, pageCursor, { locale: localeRef.current, passage: key });
        if (!live(gen)) return;
        setState((s) => {
          if (s.passage?.key !== key) return s;
          // Counted but not returned: drift. The drop hides for this session.
          const drift = !pageCursor && page.items.length === 0 && !page.nextCursor;
          return {
            ...s,
            passage: {
              ...s.passage,
              status: 'ready',
              failure: null,
              items: dedupe(pageCursor ? [...s.passage.items, ...page.items] : page.items),
              nextCursor: page.nextCursor,
              loadingMore: false,
            },
            hiddenKeys: drift && !s.hiddenKeys.includes(key) ? [...s.hiddenKeys, key] : s.hiddenKeys,
          };
        });
      } catch (error) {
        if (!live(gen)) return;
        const failure = markFailure(error);
        setState((s) =>
          s.passage?.key !== key
            ? s
            : pageCursor
              ? { ...s, passage: { ...s.passage, loadingMore: false, moreFailed: true } }
              : { ...s, passage: { ...s.passage, status: 'error', failure, loadingMore: false } },
        );
      }
    },
    [workId, chapterId],
  );

  function openPassage(key: string) {
    setState((s) => ({
      ...s,
      requested: true,
      passage: { key, status: 'loading', failure: null, items: [], nextCursor: null, loadingMore: false, moreFailed: false },
    }));
    track('ink_mark_passage_thread_opened', { work_id: workId, chapter_id: chapterId, order_index: orderIndex, source: 'gota' });
    void loadPassage(key, null);
  }

  function closePassage() {
    setState((s) => (s.passage ? { ...s, passage: null } : s));
  }

  function seeAllInChapter() {
    closePassage();
    request();
    requestAnimationFrame(scrollToSection);
  }

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
    if (target.passage && state.quoteOff) return;
    if (target.rootId && [...state.roots, ...(state.passage?.items ?? [])].find((root) => root.id === target.rootId)?.isDeleted) return;
    request();
    // The cuadro opens on the quote: the selection has done its job.
    if (target.passage) window.getSelection()?.removeAllRanges();
    track('ink_mark_composer_opened', {
      work_id: workId,
      chapter_id: chapterId,
      order_index: orderIndex,
      kind: target.rootId ? 'reply' : 'root',
      has_passage: !!target.passage,
      source: target.rootId ? null : (target.source ?? 'end_cta'),
    });
    setState((s) => ({ ...s, composer: target, createError: null, conflict: false }));
  }

  /** «Dejar una Marca» over a selection (or a paragraph): a root with its quote. */
  function openPassageComposer(selection: { key: string; quote: string; source: PassageSource }) {
    const revision = state.summary?.passages?.chapterRevision;
    if (revision === undefined) return;
    openComposer({
      rootId: null,
      parentId: null,
      name: '',
      passage: { paragraphKey: selection.key, quote: selection.quote, chapterRevision: revision },
      source: selection.source,
    });
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
    const draft = target.passage;
    const requestId = identity.idFor(text, target.parentId, draft ? `${draft.paragraphKey}\n${draft.quote}` : '');
    setState((s) => ({ ...s, busy: true, createError: null }));
    try {
      const result = await inkMarksApi.create(workId, chapterId, requestId, text, target.parentId, ctx(), draft);
      if (result.created) {
        trackMarkCreated({ workId, chapterId, orderIndex }, result, {
          hasPassage: !!draft,
          source: result.root ? (target.source ?? 'end_cta') : null,
        });
      }
      if (draft) optionsRef.current.onQuoted?.();
      if (!live(gen)) return false;
      identity.clear();
      setState((s) => {
        const add = result.created ? 1 : 0;
        const summary = s.summary ? { ...s.summary, markCount: s.summary.markCount + add } : s.summary;
        if (result.root) {
          // The drop appears now; the quote's paragraph is marked from here on.
          const passages = summary?.passages;
          const marked = draft && passages && !passages.markedKeys.includes(draft.paragraphKey);
          const withPassages =
            summary && marked && passages ? { ...summary, passages: { ...passages, markedKeys: [...passages.markedKeys, draft.paragraphKey] } } : summary;
          // A quoted Marca on a conversation never fetched must not make a
          // one-item list look complete: it will load, with the new one in it.
          const listed = !draft || s.rootsStatus === 'ready';
          return {
            ...s,
            busy: false,
            composer: null,
            ...(listed ? { rootsStatus: 'ready' as const, roots: dedupe([result.root, ...s.roots]) } : {}),
            hiddenKeys: draft ? s.hiddenKeys.filter((key) => key !== draft.paragraphKey) : s.hiddenKeys,
            summary: withPassages ? { ...withPassages, rootCount: withPassages.rootCount + add } : withPassages,
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
          ...mapRoots(s, (roots) => roots.map((root) => (root.id === rootId ? { ...root, replyCount: root.replyCount + add } : root))),
          threads: { ...s.threads, [rootId]: { ...thread, expanded: true, items: mergeReplies(thread.items, [reply]) } },
        };
      });
      // A reply in a thread never opened: bring in the replies before it.
      const repliedRoot = [...state.roots, ...(state.passage?.items ?? [])].find((root) => root.id === target.rootId);
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
        if (result.reply && target.rootId) reconcileReplyCount(target.rootId, gen);
      }
      setNotice(copy.created);
      return true;
    } catch (error) {
      if (!live(gen)) return false;
      if (isPassageChanged(error)) {
        // The text moved under the reader: drop the draft (its quote may no
        // longer exist), re-read chapter and summary, and ask for a new choice.
        identity.clear();
        setState((s) => ({ ...s, busy: false, composer: null, createError: null, conflict: true }));
        void Promise.allSettled([optionsRef.current.reloadChapter?.(), refreshSummary()]);
        return false;
      }
      if (draft && isPassagesUnavailable(error)) {
        // Quoting went off; plain Marcas and replies are untouched.
        setState((s) => ({ ...s, busy: false, quoteOff: true, createError: copy.createUnavailable }));
        return false;
      }
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

  /**
   * After a replayed reply, re-read ONE root's replyCount (the app's
   * _reconcileReplyCount): a one-item request whose count alone is adopted.
   * The thread's items, cursor and expansion are left alone; best-effort.
   */
  function reconcileReplyCount(rootId: string, gen: number) {
    inkMarksApi
      .replies(workId, chapterId, rootId, null, { ...ctx(), limit: 1 })
      .then((page) => {
        if (!live(gen)) return;
        setState((s) => ({
          ...s,
          roots: s.roots.map((root) => (root.id === rootId ? { ...root, replyCount: page.replyCount } : root)),
        }));
      })
      .catch(() => undefined);
  }

  /** Optimistic, with rollback; the counters then come from the server. */
  async function remove(markId: string, parentRootId: string | null) {
    if (state.busy) return;
    const gen = generation.current;
    const before = { roots: state.roots, passage: state.passage, threads: state.threads, summary: state.summary };
    const quoted = !parentRootId && [...state.roots, ...(state.passage?.items ?? [])].some((item) => item.id === markId && item.passage);
    const tombstone = (item: InkMarkRoot): InkMarkRoot => ({ ...item, isDeleted: true, author: null, content: '', canDelete: false, passage: null });
    setState((s) => {
      if (!parentRootId) {
        // Replies of other readers stay, under a tombstone.
        return {
          ...s,
          busy: true,
          ...mapRoots(s, (roots) => {
            const root = roots.find((item) => item.id === markId);
            return root && root.replyCount > 0 ? roots.map((item) => (item.id === markId ? tombstone(item) : item)) : roots.filter((item) => item.id !== markId);
          }),
        };
      }
      const thread = s.threads[parentRootId] ?? NEW_THREAD;
      return {
        ...s,
        busy: true,
        // A tombstone only exists to hold its replies up.
        ...mapRoots(s, (roots) => {
          const root = roots.find((item) => item.id === parentRootId);
          const remaining = Math.max(0, (root?.replyCount ?? 1) - 1);
          return root?.isDeleted && remaining === 0
            ? roots.filter((item) => item.id !== parentRootId)
            : roots.map((item) => (item.id === parentRootId ? { ...item, replyCount: remaining } : item));
        }),
        threads: { ...s.threads, [parentRootId]: { ...thread, items: thread.items.filter((item) => item.id !== markId) } },
      };
    });
    try {
      const result = await inkMarksApi.remove(workId, chapterId, markId, ctx());
      if (!live(gen)) return;
      setState((s) => {
        const reconcile = (roots: InkMarkRoot[], original: InkMarkRoot | undefined, originalAt: number) => {
          const kept = roots.some((item) => item.id === markId);
          if (result.visible && !kept && original) {
            return [...roots.slice(0, originalAt), tombstone(original), ...roots.slice(originalAt)];
          }
          if (!result.visible && kept) return roots.filter((item) => item.id !== markId);
          return roots;
        };
        let next: Pick<State, 'roots' | 'passage'> = { roots: s.roots, passage: s.passage };
        if (!parentRootId) {
          const originalRoot = before.roots.find((item) => item.id === markId);
          const originalPanel = before.passage?.items.find((item) => item.id === markId);
          next = {
            roots: reconcile(s.roots, originalRoot, originalRoot ? before.roots.indexOf(originalRoot) : 0),
            passage: s.passage
              ? { ...s.passage, items: reconcile(s.passage.items, originalPanel, originalPanel && before.passage ? before.passage.items.indexOf(originalPanel) : 0) }
              : null,
          };
        }
        return {
          ...s,
          busy: false,
          ...next,
          summary: s.summary ? { ...s.summary, markCount: result.markCount, rootCount: result.rootCount } : s.summary,
        };
      });
      setNotice(copy.deletedNotice);
      // The paragraph may have lost its last thread: its drop is the server's to say.
      if (quoted) void refreshSummary();
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
    focusUnavailable,
    request,
    refreshSummary,
    openPassage,
    closePassage,
    seeAllInChapter,
    loadMorePassage: () => {
      const panel = state.passage;
      if (panel?.nextCursor && !panel.loadingMore) void loadPassage(panel.key, panel.nextCursor);
    },
    retryPassage: () => state.passage && void loadPassage(state.passage.key, null),
    openPassageComposer,
    clearConflict: () => setState((s) => (s.conflict ? { ...s, conflict: false } : s)),
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
  endHint = false,
  onJumpQuote,
}: {
  marks: ChapterMarks;
  isWorkAuthor: boolean;
  locale: Locale;
  /** The soft «also select a phrase» line: readers who can quote and have not yet. */
  endHint?: boolean;
  /** Set only while the text is drawn with places: quotes become links. */
  onJumpQuote?: (paragraphKey: string, quote: string | null) => void;
}) {
  const all = MARKS_COPY[locale];
  const copy = all.chapter;
  const passageCopy = all.passage;
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
  const panelOpen = state.passage !== null;
  const quoting = state.composer?.passage;
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
    state.composer && state.composer.rootId === rootId && !(rootId === null && quoting) ? (
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

  /** One thread: the Marca, its replies and the reply composer. In the list or in a paragraph's sheet. */
  const renderRoot = (root: InkMarkRoot, inPanel: boolean) => {
    const thread = state.threads[root.id];
    const name = root.author?.displayName || all.anonymous;
    const prefix = inPanel ? 'pmark-' : 'mark-';
    return (
      <li key={root.id} id={`${prefix}${root.id}`} className="flex scroll-mt-20 flex-col border-t border-divider py-4 first:border-t-0">
        <MarkItem
          authorName={root.author?.displayName ?? null}
          authorId={root.author?.userId || undefined}
          badge={root.isAuthor ? all.authorBadge : null}
          createdAt={root.createdAt}
          content={root.content}
          deletedLabel={root.isDeleted ? copy.deleted : undefined}
          highlight={!inPanel && state.focusId === root.id}
          passage={root.passage}
          onJumpQuote={
            !inPanel && onJumpQuote && root.passage?.located && root.passage.quote
              ? () => onJumpQuote(root.passage!.paragraphKey, root.passage!.quote)
              : undefined
          }
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
                id={inPanel ? undefined : `mark-${reply.id}`}
                authorName={reply.author.displayName}
                authorId={reply.author.userId || undefined}
                badge={reply.isAuthor ? all.authorBadge : null}
                createdAt={reply.createdAt}
                content={reply.content}
                replyingTo={reply.replyingTo || undefined}
                highlight={!inPanel && state.replyHighlight === reply.id}
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
        {panelOpen === inPanel ? composerFor(root.id) : null}
      </li>
    );
  };

  const panel = state.passage;
  const hasJumpableQuote = !!onJumpQuote && state.roots.some((root) => root.passage?.located && root.passage.quote);

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
              onClick={() => marks.openComposer({ rootId: null, parentId: null, name: '', source: 'end_cta' })}
              className="ink-focus ink-dim min-h-11 shrink-0 rounded-control px-1 type-button-sm text-[14.5px] text-blue"
            >
              {copy.leaveAction}
            </button>
          ) : null}
        </div>
        {endHint ? <p className="type-caption text-[13px] text-secondary">{passageCopy.endHint}</p> : null}
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

      {marks.focusUnavailable ? (
        <p role="status" className="type-caption text-[13px] text-secondary">
          {copy.threadUnavailable}
        </p>
      ) : null}

      {state.rootsStatus === 'ready' && state.roots.length === 0 && !state.composer ? (
        <div className="flex flex-col gap-1 py-2">
          <p className="type-title-section text-[18px] text-primary">{copy.emptyTitle}</p>
          <p className="type-body text-secondary">{marks.canCreateRoot ? copy.emptyBodyCanMark : copy.emptyBody}</p>
        </div>
      ) : null}

      {hasJumpableQuote ? <p className="type-caption text-[13px] text-secondary">{passageCopy.jumpHelp}</p> : null}

      {state.roots.length > 0 ? <ol className="m-0 flex list-none flex-col p-0">{state.roots.map((root) => renderRoot(root, false))}</ol> : null}

      {state.nextCursor && state.rootsStatus === 'ready' ? (
        <div>
          <InkButton variant="secondary" fullWidth={false} busy={state.loadingMore} onClick={() => marks.loadMoreRoots()}>
            {state.moreFailed ? all.retry : copy.loadMore}
          </InkButton>
        </div>
      ) : null}

      <PassageSheet
        open={panel !== null}
        title={passageCopy.threadTitle}
        closeLabel={SESSION_COPY[locale].reader.close}
        onClose={marks.closePassage}
      >
        {panel ? (
          <div className="flex flex-col gap-3">
            {panel.status === 'loading' ? <InkSkeleton lines={2} height="h-16" label={passageCopy.threadTitle} /> : null}
            {panel.status === 'error' && panel.failure ? (
              <InkInlineBanner
                tone={panel.failure === 'unavailable' ? 'info' : 'error'}
                title={copy.failure[panel.failure === 'notFound' ? 'generic' : panel.failure]}
                action={panel.failure === 'unavailable' ? undefined : <InkTextAction onClick={marks.retryPassage}>{all.retry}</InkTextAction>}
              />
            ) : null}
            {panel.status === 'ready' && panel.items.length === 0 ? (
              <p className="type-body text-secondary">{passageCopy.empty}</p>
            ) : null}
            {panel.items.length > 0 ? <ol className="m-0 flex list-none flex-col p-0">{panel.items.map((root) => renderRoot(root, true))}</ol> : null}
            {panel.nextCursor && panel.status === 'ready' ? (
              <div>
                <InkButton variant="secondary" fullWidth={false} busy={panel.loadingMore} onClick={marks.loadMorePassage}>
                  {panel.moreFailed ? all.retry : copy.loadMore}
                </InkButton>
              </div>
            ) : null}
            <div className="flex flex-col gap-1 border-t border-divider pt-3">
              <div className="-ml-2">
                <MarkAction tone="blue" onClick={marks.seeAllInChapter}>
                  {passageCopy.seeAll}
                </MarkAction>
              </div>
              {marks.canCreateRoot && !state.quoteOff ? (
                <p className="type-caption text-[13px] text-secondary">{passageCopy.threadHelp}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </PassageSheet>

      <PassageSheet
        open={!!quoting}
        title={passageCopy.kicker}
        closeLabel={SESSION_COPY[locale].reader.close}
        onClose={marks.closeComposer}
        kicker
      >
        {quoting && state.composer ? (
          <div className="flex flex-col gap-3">
            <QuoteLine text={quoting.quote} lines={3} />
            <MarkComposer
              hint={copy.hintRoot}
              sending={state.busy}
              error={state.createError}
              blocked={state.writesOff}
              autoFocus
              onSubmit={marks.create}
              onCancel={marks.closeComposer}
              locale={locale}
            />
          </div>
        ) : null}
      </PassageSheet>

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

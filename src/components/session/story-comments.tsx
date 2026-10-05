'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { InkButton } from '@/components/ink/ink-button';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import type { Locale } from '@/lib/i18n';
import { useSession } from '@/lib/session/auth-context';
import { type MarkFailure, type ReportReason, type StoryComment, markFailure, normalizeMarkDraft, storyCommentsApi } from '@/lib/session/marks';
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
// one level, no replies; on your own relato there is no field. Inline under
// the relato (web layout); the list is fetched when the reader reaches it.
// Create and delete are optimistic with rollback; a report hides nothing.

const FOCUS_PAGE_BUDGET = 5;
const PENDING_ID = '__pending__';

type Pending = StoryComment & { pending?: boolean };

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
  });
  const alive = useRef(true);
  const section = useRef<HTMLElement>(null);
  const focusShown = useRef(false);
  const identity = useRequestIdentity();
  const { user } = useSession();
  const [notice, setNotice] = useNotice();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
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

  // ?comment=: page (bounded) until it appears, then bring it into view.
  useEffect(() => {
    if (!focusId || focusShown.current || state.status !== 'ready' || state.loadingMore) return;
    if (state.items.some((item) => item.id === focusId)) {
      focusShown.current = true;
      document.getElementById(`comment-${focusId}`)?.scrollIntoView({ block: 'center', behavior: 'instant' });
      return;
    }
    if (state.nextCursor && !state.moreFailed && state.pagesScanned < FOCUS_PAGE_BUDGET) void load(state.nextCursor);
  }, [focusId, state.status, state.loadingMore, state.items, state.nextCursor, state.moreFailed, state.pagesScanned, load]);

  const canWrite = !isOwnStory && state.canComment && !state.writesOff;

  async function create(text: string): Promise<boolean> {
    if (!canWrite || state.busy) return false;
    const requestId = identity.idFor(text, null);
    const pending: Pending = {
      id: PENDING_ID,
      author: { userId: '', displayName: user?.username ?? '' },
      content: normalizeMarkDraft(text),
      createdAt: new Date().toISOString(),
      canDelete: false,
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
      setState((s) => ({ ...s, busy: false, count: result.commentsCount }));
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

  async function report(commentId: string, reason: ReportReason) {
    if (state.reporting) return;
    setState((s) => ({ ...s, reporting: commentId }));
    try {
      await storyCommentsApi.report(duelId, storyId, commentId, reason, ctx);
      if (!alive.current) return;
      setState((s) => ({ ...s, reporting: null, reported: [...s.reported, commentId] }));
      setNotice(copy.reported);
    } catch (error) {
      if (!alive.current) return;
      setState((s) => ({ ...s, reporting: null }));
      setNotice(copy.failure[markFailure(error)]);
    } finally {
      setReportingId(null);
    }
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
                    <span className="px-2 type-caption text-[12.5px] text-tertiary">{all.sending}</span>
                  ) : item.canDelete ? (
                    <MarkAction tone="danger" disabled={state.busy} onClick={() => setDeletingId(item.id)}>
                      {copy.delete}
                    </MarkAction>
                  ) : state.reported.includes(item.id) ? (
                    <MarkAction disabled onClick={() => undefined}>
                      {all.alreadyReported}
                    </MarkAction>
                  ) : (
                    <MarkAction onClick={() => setReportingId(item.id)}>{copy.report}</MarkAction>
                  )
                }
              />
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
        open={deletingId !== null}
        title={copy.deleteTitle}
        body={copy.deleteBody}
        confirm={copy.deleteConfirm}
        cancel={all.cancel}
        onClose={() => setDeletingId(null)}
        onConfirm={() => {
          const id = deletingId;
          setDeletingId(null);
          if (id) void remove(id);
        }}
      />
      <ReportMarkDialog
        open={reportingId !== null}
        title={copy.reportTitle}
        actionLabel={copy.report}
        busy={state.reporting !== null}
        onClose={() => setReportingId(null)}
        onReport={(reason) => reportingId && void report(reportingId, reason)}
        locale={locale}
      />
    </section>
  );
}

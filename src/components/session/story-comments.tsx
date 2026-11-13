'use client';

import { InkButton } from '@/components/ink/ink-button';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import type { Locale } from '@/lib/i18n';
import type { ReportReason } from '@/lib/session/marks';

import {
  DeleteMarkDialog,
  MarkAction,
  MarkComposer,
  MarkItem,
  MarkNotice,
  ReportMarkDialog,
} from './marks-parts';
import { type Confirm, type Pending, type ReplyTarget, useStoryMarks } from './use-story-marks';

// Marcas of a duel story (17 - Social), ported from gallery_comments_cubit.dart:
// Marcas plus one level of replies; on your own relato there is no field for a
// Marca, but you can answer one. Inline under the relato (web layout); the
// list is fetched when the reader reaches it, a thread only on «Ver N
// respuestas». Create and delete are optimistic with rollback; a report hides
// nothing. Deleting a Marca takes its thread with it (no tombstones).


/** The Marcas section of a relato, for «Deja tu Marca» to scroll to. */
export function storyCommentsSectionId(duelId: string, storyId: string): string {
  return `marcas-${duelId}-${storyId}`;
}

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
  const {
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
    loadReplies,
    toggleThread,
    startReply,
    cancelReply,
    createReply,
    removeReply,
    create,
    remove,
    report,
    load,
  } = useStoryMarks({ duelId, storyId, isOwnStory, initialCount, focusId, autoOpen, locale });

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
    <section
      ref={section}
      id={storyCommentsSectionId(duelId, storyId)}
      aria-labelledby={`comments-${storyId}`}
      className="mt-12 flex scroll-mt-16 flex-col gap-4"
    >
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

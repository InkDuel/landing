'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cx } from '@/components/ink/cx';
import { CheckIcon, WarningIcon } from '@/components/ink/icons';
import { InkButton } from '@/components/ink/ink-button';
import { InkChip } from '@/components/ink/ink-chip';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton } from '@/components/ink/ink-states';
import { StoryText } from '@/components/reading/story-parts';
import { INTL_LOCALE } from '@/lib/i18n';
import { ApiError } from '@/lib/session/api';
import { conflictData, draftConflict, publishedConflict, studioApi } from '@/lib/session/studio/api';
import type { Draft, ManuscriptEntry } from '@/lib/session/studio/models';
import { studioAnalytics } from '@/lib/session/studio/studio-analytics';
import { STUDIO_COPY } from '@/lib/session/studio/studio-copy';
import { countChars, countWords } from '@/lib/session/studio/words';
import { newClientId, worksApi } from '@/lib/session/works';

import { WorkPublishPanel } from '../work-manage';
import { CompareView } from './editor-parts';
import { StudioExportPanel } from './portability';
import { entryChars, entryTitle, useStudio } from './studio-context';
import { StudioSheet } from './studio-ui';

// «Publicar»: the only place where a private draft becomes what readers see.
// Each publish pins the exact draft revision that was previewed and the public
// revision it replaces; the server refuses anything else (409) instead of
// guessing. Publication stays within 5,000 characters (what installed app
// builds can edit), longer drafts are refused, never truncated.

function Check({ ok, label, hint, soft = false, status }: { ok: boolean; label: string; hint?: string; soft?: boolean; status: { met: string; missing: string } }) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden="true"
        className={cx(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-quiet',
          ok ? 'border-outline bg-yellow text-on-accent' : soft ? 'border-control bg-surface text-tertiary' : 'border-danger bg-tint-danger text-danger',
        )}
      >
        {ok ? <CheckIcon size={16} /> : soft ? null : <WarningIcon size={16} />}
      </span>
      <span className="min-w-0">
        <span className={cx('type-body text-[15px]', ok ? 'text-primary' : soft ? 'text-secondary' : 'text-danger')}>{label}</span>
        <span className="sr-only">: {ok ? status.met : status.missing}</span>
        {hint ? <span className="block type-caption text-tertiary">{hint}</span> : null}
      </span>
    </li>
  );
}

type Review = {
  entry: ManuscriptEntry;
  draft: Draft;
  published: { title: string; body: string; revision: number } | null;
  requestId: string;
};

function ReviewSheet({ review, onClose, onPublished }: { review: Review | null; onClose: () => void; onPublished: (message: string) => void }) {
  const studio = useStudio();
  const { workId, locale, limits, overview } = studio;
  const copy = STUDIO_COPY[locale];
  const p = copy.publish;
  const fmt = (n: number) => n.toLocaleString(INTL_LOCALE[locale]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ revision: number; title: string; body: string } | null>(null);
  const requestId = useRef<string>('');

  useEffect(() => {
    setError(null);
    setConflict(null);
    if (review) requestId.current = review.requestId;
  }, [review]);

  if (!review) return <StudioSheet open={false} onClose={onClose} title={p.reviewTitle} closeLabel={copy.shell.close}>{null}</StudioSheet>;
  const { draft, entry } = review;
  const chars = countChars(draft.body);
  const isNewChapter = !entry.chapterId;
  const orderForNew = overview.work.nextChapterOrder;
  const label = entry.chapterId ? copy.manuscript.chapterLabel(entry.orderIndex) : copy.manuscript.chapterLabel(orderForNew);
  const checks = {
    body: draft.body.trim() !== '',
    limit: chars <= limits.publishBody,
    title: draft.title.trim() !== '',
    ready: draft.status === 'ready',
    available: overview.work.moderationState === 'active',
    capacity: !isNewChapter || overview.work.chapterCount < limits.maxChapters,
  };
  const blocked = !checks.body || !checks.limit || !checks.available || !checks.capacity;
  const delta = review.published ? countWords(draft.body) - countWords(review.published.body) : null;
  const unchanged = review.published !== null && review.published.body === draft.body && review.published.title === draft.title.trim();

  async function publish(expectedPublishedRevision: number | null) {
    setBusy(true);
    setError(null);
    const type = entry.published ? 'update' : 'first_publish';
    studioAnalytics.publishAttempt(workId, entry.chapterId ?? draft.id, type);
    try {
      const result = await studioApi.publishDraft(
        workId,
        draft.id,
        { expectedDraftRevision: draft.revision, expectedPublishedRevision, publishRequestId: requestId.current },
        { locale },
      );
      studioAnalytics.publishCompleted(workId, result.chapterId, result.kind);
      studio.applyDraft(result.draft);
      await studio.refresh();
      onPublished(result.kind === 'update' ? p.done : p.doneFirst);
    } catch (e) {
      studioAnalytics.publishFailed(workId, e);
      const pub = publishedConflict(e);
      if (pub && pub.revision >= 0) {
        setConflict({ revision: pub.revision, title: pub.title, body: pub.body });
        // A deliberate replacement is a new attempt.
        requestId.current = newClientId();
      } else if (draftConflict(e)) {
        setError(p.draftConflict);
      } else {
        const code = conflictData(e)?.code;
        setError(
          code === 'too_long'
            ? p.blockedTooLong(fmt(limits.publishBody))
            : code === 'empty'
              ? p.blockedEmpty
              : code === 'work_hidden'
                ? p.blockedHidden
                : code === 'chapter_limit'
                  ? p.blockedLimit
                  : e instanceof ApiError && e.status === 409
                    ? p.draftConflict
                    : p.failed,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <StudioSheet
      open
      onClose={() => !busy && onClose()}
      title={p.reviewTitle}
      description={entry.published ? p.publishedNote : undefined}
      closeLabel={copy.shell.close}
      wide
      footer={
        conflict ? (
          <>
            <InkButton variant="secondary" fullWidth={false} onClick={onClose} disabled={busy}>
              {copy.shell.cancel}
            </InkButton>
            <InkButton variant="destructive" fullWidth={false} busy={busy} busyLabel={p.publishing} onClick={() => void publish(conflict.revision)}>
              {p.replace}
            </InkButton>
          </>
        ) : (
          <>
            <InkButton variant="secondary" fullWidth={false} onClick={onClose} disabled={busy}>
              {copy.shell.cancel}
            </InkButton>
            {blocked ? (
              <span id="publish-blocked" className="type-caption text-danger">
                {p.blockedReason}
              </span>
            ) : null}
            <InkButton
              fullWidth={false}
              aria-describedby={blocked ? 'publish-blocked' : undefined}
              disabled={blocked || unchanged}
              busy={busy}
              busyLabel={p.publishing}
              onClick={() => void publish(entry.chapterId ? (draft.basePublishedRevision ?? entry.chapterRevision) : null)}
            >
              {isNewChapter ? p.confirmNew(orderForNew) : p.confirm}
            </InkButton>
          </>
        )
      }
    >
      <div className="flex flex-col gap-5">
        {error ? <InkInlineBanner title={error} /> : null}
        {conflict ? (
          <>
            <InkInlineBanner tone="notice" title={p.publishedConflictTitle} detail={p.publishedConflictBody} />
            <CompareView before={conflict.body} after={draft.body} beforeLabel={p.currentPublished} afterLabel={p.yourVersion} />
          </>
        ) : null}
        <section aria-labelledby="publish-checklist">
          <h3 id="publish-checklist" className="type-label text-secondary">
            {p.checklist}
          </h3>
          <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
            <Check status={{ met: p.checkMet, missing: p.checkMissing }} ok={checks.body} label={p.checkBody} />
            <Check status={{ met: p.checkMet, missing: p.checkMissing }} ok={checks.limit} label={p.checkLimit(fmt(limits.publishBody))} hint={!checks.limit ? p.blockedTooLong(fmt(limits.publishBody)) : `${fmt(chars)} / ${fmt(limits.publishBody)}`} />
            <Check status={{ met: p.checkMet, missing: p.checkMissing }} ok={true} label={p.checkSynced} />
            <Check status={{ met: p.checkMet, missing: p.checkMissing }} ok={checks.title} soft label={p.checkTitle} hint={!checks.title ? label : undefined} />
            <Check status={{ met: p.checkMet, missing: p.checkMissing }} ok={checks.ready} soft label={p.checkReady} hint={p.checkReadyHint} />
            {!checks.available ? <Check status={{ met: p.checkMet, missing: p.checkMissing }} ok={false} label={p.blockedHidden} /> : null}
            {!checks.capacity ? <Check status={{ met: p.checkMet, missing: p.checkMissing }} ok={false} label={p.blockedLimit} /> : null}
          </ul>
          {delta !== null ? <p className="mt-3 type-caption text-secondary">{unchanged ? p.nothingToPublish : p.wordsDelta(delta > 0 ? `+${fmt(delta)}` : fmt(delta))}</p> : null}
          {isNewChapter ? <p className="mt-2 type-caption text-secondary">{p.willBe(orderForNew)}</p> : null}
        </section>
        <section aria-labelledby="publish-preview" className="flex flex-col gap-2">
          <div>
            <h3 id="publish-preview" className="type-label text-secondary">
              {p.preview}
            </h3>
            <p className="type-caption text-tertiary">{p.previewHint}</p>
          </div>
          <div className="ctx-reading rounded-card border-quiet border-divider px-5 py-6 sm:px-8">
            <p className="font-literary text-[16.5px] italic text-reader-muted">{overview.work.title || copy.shell.untitled}</p>
            <p className="mt-[15px] type-label text-[12px] tracking-[0.13em] text-reader-muted">{label}</p>
            <h4 className="mt-[7px] font-literary text-[31px] leading-[1.12] font-bold tracking-[-0.01em] break-words text-primary">
              {draft.title.trim() || label}
            </h4>
            <div className="mt-6">
              <StoryText text={draft.body} />
            </div>
          </div>
        </section>
      </div>
    </StudioSheet>
  );
}

export function PublishArea() {
  const studio = useStudio();
  const { overview, locale, workId, docId } = studio;
  const copy = STUDIO_COPY[locale];
  const p = copy.publish;
  const fmt = (n: number) => n.toLocaleString(INTL_LOCALE[locale]);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const openedFor = useRef<string | null>(null);

  const openReview = useCallback(
    async (entry: ManuscriptEntry) => {
      setError(null);
      setNotice(null);
      setLoading(entry.id);
      try {
        // Nothing unsynced may be published: the editor saves first.
        const ed = studio.editor();
        if (ed && ed.draftId === entry.id && !(await ed.flush())) {
          setError(p.blockedUnsaved);
          return;
        }
        if (!entry.draft && entry.chapterId) {
          const { draft } = await studioApi.createDraft(workId, { draftId: entry.id, chapterId: entry.chapterId }, { locale });
          studio.applyDraft(draft);
        }
        const draft = await studioApi.draft(workId, entry.id, { locale });
        let published: Review['published'] = null;
        if (entry.chapterId && entry.published) {
          const chapter = await worksApi.chapter(workId, entry.chapterId, { locale });
          published = { title: chapter.title, body: chapter.content, revision: chapter.revision };
        }
        setReview({ entry, draft, published, requestId: newClientId() });
      } catch {
        setError(copy.editor.openFailed);
      } finally {
        setLoading(null);
      }
    },
    [studio, workId, locale, p.blockedUnsaved, copy.editor.openFailed],
  );

  // «Publicar…» from the editor lands here with the document to review.
  useEffect(() => {
    if (!docId || openedFor.current === docId) return;
    const entry = overview.manuscript.find((e) => e.id === docId);
    if (!entry) return;
    openedFor.current = docId;
    void openReview(entry);
  }, [docId, overview.manuscript, openReview]);

  async function mutateWork(action: () => Promise<unknown>) {
    if (busy) return false;
    setBusy(true);
    try {
      await action();
      await studio.refresh();
      return true;
    } catch {
      setError(copy.publish.failed);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const labels = { chapter: copy.manuscript.chapterLabel, untitled: copy.manuscript.untitledDraft };
  const work = overview.work;

  return (
    <div className="flex flex-col gap-8 pb-10 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-12">
      <div className="flex min-w-0 flex-col gap-4">
        <div>
          <h2 className="type-title-section text-primary">{p.chaptersTitle}</h2>
          <p className="mt-1 type-body text-secondary">{p.intro}</p>
        </div>
        {notice ? <InkInlineBanner tone="success" title={notice} /> : null}
        {error ? <InkInlineBanner title={error} /> : null}
        {overview.manuscript.length === 0 ? <p className="type-body text-secondary">{copy.manuscript.empty}</p> : null}
        <ol className="m-0 flex list-none flex-col p-0">
          {overview.manuscript.map((entry) => {
            const chars = entryChars(entry);
            const tooLong = chars > overview.limits.publishBody;
            const pending = entry.published && entry.draft?.pendingChanges;
            const state = entry.published ? (pending ? p.pendingChanges : p.upToDate) : entry.chapterId ? p.neverPublished : p.willBe(work.nextChapterOrder);
            return (
              <li key={entry.id} className="flex flex-col gap-2 border-t border-divider py-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="type-label text-[11px] text-secondary">{entry.chapterId ? copy.manuscript.chapterLabel(entry.orderIndex) : copy.manuscript.newDraftLabel}</p>
                  <p className="font-literary text-[19px] leading-[1.25] font-semibold break-words text-primary">{entryTitle(entry, labels)}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 type-caption text-secondary">
                    <InkChip tone={entry.published ? (pending ? 'draw' : 'success') : 'muted'}>{state}</InkChip>
                    <span className={cx('tabular-nums', tooLong && 'text-warning')}>
                      {fmt(chars)} / {fmt(overview.limits.publishBody)}
                    </span>
                    {entry.publishedChanged ? <span className="text-warning">{copy.manuscript.changedElsewhere}</span> : null}
                  </p>
                  {tooLong ? <p className="mt-1 type-caption text-warning">{p.blockedTooLong(fmt(overview.limits.publishBody))}</p> : null}
                </div>
                <InkButton
                  variant={entry.published && !pending ? 'secondary' : 'primary'}
                  fullWidth={false}
                  busy={loading === entry.id}
                  disabled={loading !== null}
                  onClick={() => void openReview(entry)}
                >
                  {p.review}
                </InkButton>
              </li>
            );
          })}
        </ol>
      </div>

      <aside className="flex flex-col gap-6 lg:sticky lg:top-6">
        <section aria-labelledby="publish-work" className="flex flex-col gap-3">
          <h2 id="publish-work" className="type-title-section text-primary">
            {p.workTitle}
          </h2>
          <p className="type-body-sm text-secondary">{p.workIntro}</p>
          <WorkPublishPanel
            work={{
              id: work.id,
              title: work.title,
              published: work.published,
              isGalleryEligible: work.isGalleryEligible,
              moderationState: work.moderationState,
              publishedChapterCount: work.publishedChapterCount,
            }}
            busy={busy}
            mutate={mutateWork}
          />
          <p className="type-caption text-secondary">{work.moderationState === 'active' ? p.moderationActive : p.moderationHidden}</p>
          {work.isGalleryEligible ? (
            <Link href={`/work/${encodeURIComponent(work.id)}`} className="ink-focus type-button-sm text-blue">
              {p.readerLink}
            </Link>
          ) : null}
        </section>
        <StudioExportPanel workId={workId} editor={studio.editor} />
      </aside>

      {review ? (
        <ReviewSheet
          review={review}
          onClose={() => setReview(null)}
          onPublished={(message) => {
            setReview(null);
            setNotice(message);
          }}
        />
      ) : null}
      {loading && !review ? <InkSkeleton className="sr-only" lines={1} label={copy.shell.loading} /> : null}
    </div>
  );
}

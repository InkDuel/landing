'use client';

import Link from 'next/link';
import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { cx } from '@/components/ink/cx';
import { CheckIcon } from '@/components/ink/icons';
import { InkButton } from '@/components/ink/ink-button';
import { InkChip } from '@/components/ink/ink-chip';
import { InkDialog } from '@/components/ink/ink-dialog';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { InkTextField } from '@/components/ink/ink-text-field';
import { Kicker } from '@/components/ink/kicker';
import { BackLink } from '@/components/legal/legal-page';
import { ListFooter } from './historias';
import { useSessionLocale } from './session-root';
import { chapterEditHref, myWorksHref } from './works-parts';
import { INTL_LOCALE } from '@/lib/i18n';
import { ApiError } from '@/lib/session/api';
import { SESSION_COPY } from '@/lib/session/copy';
import { type AuthorChapter, type AuthorWork, WORK_LIMITS, worksApi } from '@/lib/session/works';
import { useInfiniteSentinel } from '@/lib/session/use-paged-list';
import { WORKS_COPY } from '@/lib/session/works-copy';

// A work (16, Producto): its state over the title, the chapters (open,
// publish, delete drafts) and the publish panel with its requirements.
//
// Web rule approved for phase 2: «Publicar obra» stays disabled until the
// work has a title AND at least one published chapter. Works already
// published without one (legacy) show «Publicada · Nadie puede leerla
// todavía» and can be completed or unpublished; nothing is migrated.
// A work out of moderation's «active» state cannot be (re)published (the
// backend answers 409); it shows a generic notice and no Publish action.

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 type-body text-[15px]">
      <span
        aria-hidden="true"
        className={cx(
          'flex size-5 shrink-0 items-center justify-center rounded-full border-quiet',
          met ? 'border-outline bg-yellow text-on-accent' : 'border-control bg-surface',
        )}
      >
        {met ? <CheckIcon size={16} /> : null}
      </span>
      <span className={met ? 'text-primary' : 'text-secondary'}>{label}</span>
    </li>
  );
}

function ChapterItem({
  chapter,
  workId,
  busy,
  onPublish,
  onDelete,
}: {
  chapter: AuthorChapter;
  workId: string;
  busy: boolean;
  onPublish: (chapter: AuthorChapter) => void;
  onDelete: (chapter: AuthorChapter) => void;
}) {
  const { locale } = useSessionLocale();
  const copy = WORKS_COPY[locale];
  const label = copy.chapterDefault(chapter.orderIndex);
  return (
    <li className="flex list-none flex-col gap-2 border-t border-divider py-4 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <Link href={chapterEditHref(workId, chapter.id)} className="ink-focus ink-dim min-w-0 flex-1 rounded-control no-underline">
          <p className="type-label text-[11px] text-secondary">{label}</p>
          <p className="mt-0.5 font-literary text-[19px] leading-[1.25] font-semibold break-words text-primary">
            {chapter.title || label}
          </p>
          <p className="mt-1 type-caption text-secondary">{copy.words(words(chapter.content))}</p>
        </Link>
        <InkChip tone={chapter.published ? 'success' : 'muted'} className="mt-0.5 shrink-0">
          {chapter.published ? copy.chapterPublished : copy.chipDraft}
        </InkChip>
      </div>
      <div className="flex flex-wrap gap-x-1">
        <InkButton href={chapterEditHref(workId, chapter.id)} variant="link" fullWidth={false}>
          {copy.edit}
        </InkButton>
        {!chapter.published ? (
          <>
            <InkButton variant="link" fullWidth={false} disabled={busy} onClick={() => onPublish(chapter)}>
              {copy.publishChapter}
            </InkButton>
            <InkButton variant="link" fullWidth={false} disabled={busy} className="text-danger" onClick={() => onDelete(chapter)}>
              {copy.deleteChapter}
            </InkButton>
          </>
        ) : null}
      </div>
    </li>
  );
}

function TitleDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSave: (title: string) => Promise<boolean>;
}) {
  const { locale } = useSessionLocale();
  const copy = WORKS_COPY[locale];
  const [title, setTitle] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setTitle(initial);
  }, [open, initial]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    const ok = await onSave(title.trim());
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <InkDialog open={open} onClose={() => !busy && onClose()} title={initial ? copy.editTitle : copy.addTitleHeader}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <InkTextField
          label={copy.workTitleHint}
          value={title}
          maxLength={WORK_LIMITS.workTitle}
          onChange={(event) => setTitle(event.target.value)}
          autoFocus
          disabled={busy}
        />
        <InkButton type="submit" variant="secondary" disabled={!title.trim()} busy={busy}>
          {copy.saveTitle}
        </InkButton>
        <InkButton variant="ghost" fullWidth={false} className="self-center" onClick={onClose}>
          {copy.cancel}
        </InkButton>
      </form>
    </InkDialog>
  );
}

type Confirm = { kind: 'publish' | 'delete'; chapter: AuthorChapter } | null;

export function WorkManageView({ workId }: { workId: string }) {
  const { locale } = useSessionLocale();
  const copy = WORKS_COPY[locale];
  const [work, setWork] = useState<AuthorWork | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notFound' | 'error'>('loading');
  const [chapters, setChapters] = useState<AuthorChapter[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mutationFailed, setMutationFailed] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);

  const apply = useCallback((next: AuthorWork) => {
    setWork(next);
    setChapters(next.chapters);
    setCursor(next.chaptersNextCursor);
    setLoadMoreFailed(false);
  }, []);

  const reload = useCallback(async () => {
    try {
      apply(await worksApi.get(workId, { locale }));
    } catch {
      // The mutation already happened; the list stays as it was.
    }
  }, [apply, workId, locale]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    worksApi
      .get(workId, { locale, signal: controller.signal })
      .then((next) => {
        apply(next);
        setStatus('ready');
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setStatus(error instanceof ApiError && (error.status === 404 || error.status === 403) ? 'notFound' : 'error');
      });
    return () => controller.abort();
  }, [workId, locale, apply, attempt]);

  async function mutate(action: () => Promise<unknown>, reloadAfter = true): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setMutationFailed(false);
    try {
      const result = await action();
      if (result && typeof result === 'object' && 'id' in result && 'chapters' in result) apply(result as AuthorWork);
      else if (reloadAfter) await reload();
      return true;
    } catch {
      setMutationFailed(true);
      return false;
    } finally {
      setBusy(false);
    }
  }

  // Like usePagedList: a failed page disables the sentinel until the explicit
  // retry, so a 429/5xx/network error never turns into a request loop.
  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreFailed(false);
    try {
      const page = await worksApi.chapters(workId, cursor, { locale });
      setChapters((prev) => [...prev, ...page.items.filter((item) => !prev.some((p) => p.id === item.id))]);
      setCursor(page.nextCursor);
    } catch {
      setLoadMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, workId, locale]);
  const sentinel = useInfiniteSentinel(
    () => void loadMore(),
    status === 'ready' && cursor !== null && !loadingMore && !loadMoreFailed,
  );

  if (status === 'loading') return <InkSkeleton className="mt-6" lines={4} label={SESSION_COPY[locale].common.loading} />;
  if (status !== 'ready' || !work) {
    return (
      <InkInlineBanner
        className="mt-6"
        title={copy.loadError}
        action={status === 'error' ? <InkTextAction onClick={() => setAttempt((v) => v + 1)}>{copy.retry}</InkTextAction> : undefined}
      />
    );
  }

  const hasTitle = work.title.trim() !== '';
  const hasPublishedChapter = work.publishedChapterCount > 0;
  const available = work.moderationState === 'active';
  const canPublish = available && hasTitle && hasPublishedChapter;
  // MaxChaptersPerWork: past it AddWorkChapter only answers 409.
  const atChapterLimit = work.chapterCount >= WORK_LIMITS.maxChapters;
  const kicker = !work.published ? copy.statusDraft : work.isGalleryEligible ? copy.statusInStories : copy.statusPublished;

  const panel = work.published ? (
    <div className="flex flex-col gap-3">
      <InkButton variant="secondary" busy={busy} onClick={() => void mutate(() => worksApi.unpublish(work.id, { locale }))}>
        {copy.unpublishWork}
      </InkButton>
    </div>
  ) : (
    <section aria-label={copy.publishWork} className="flex flex-col gap-3 rounded-card border-quiet border-divider bg-surface p-4">
      <ul className="m-0 flex flex-col gap-2 p-0">
        <Requirement met={hasTitle} label={copy.requirementTitle} />
        <Requirement met={hasPublishedChapter} label={copy.requirementChapter} />
      </ul>
      <p className="type-caption text-secondary">
        {!available
          ? copy.unavailableTitle
          : canPublish
            ? copy.readyToPublish
            : !hasTitle
              ? copy.addTitleToPublish
              : copy.needsChapter}
      </p>
      <InkButton disabled={!canPublish} busy={busy} onClick={() => void mutate(() => worksApi.publish(work.id, { locale }))}>
        {copy.publishWork}
      </InkButton>
      <p className="text-center type-caption text-tertiary">{copy.onlyYouCanSee}</p>
    </section>
  );

  return (
    <div className="flex flex-col gap-6 pt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-x-14">
      <div className="flex min-w-0 flex-col gap-5">
        <BackLink href={myWorksHref()} label={copy.backToWorks} />
        <header className="flex flex-col gap-2">
          <Kicker className={work.isGalleryEligible ? 'text-success' : undefined}>{kicker}</Kicker>
          <h1 className="font-literary text-[30px] leading-[1.1] font-bold break-words text-primary sm:text-[34px]">
            {hasTitle ? work.title : copy.untitled}
          </h1>
          <div>
            <InkButton variant="link" fullWidth={false} className="-ml-2" onClick={() => setEditingTitle(true)}>
              {hasTitle ? copy.editTitle : copy.addTitleHeader}
            </InkButton>
          </div>
        </header>

        {!available ? (
          <InkInlineBanner tone="notice" title={copy.unavailableTitle} detail={copy.unavailableBody} />
        ) : work.published && !hasPublishedChapter ? (
          <InkInlineBanner tone="notice" title={copy.notReadableTitle} detail={copy.notReadableBody} />
        ) : null}
        {mutationFailed ? <InkInlineBanner title={copy.mutationError} /> : null}

        <section aria-labelledby="chapters" className="flex flex-col">
          <h2 id="chapters" className="type-title-section text-primary">
            {copy.chapters}
          </h2>
          {chapters.length === 0 ? <p className="mt-2 type-body text-secondary">{copy.emptyWork}</p> : null}
          <ul className="m-0 mt-1 p-0">
            {chapters.map((chapter) => (
              <ChapterItem
                key={chapter.id}
                chapter={chapter}
                workId={work.id}
                busy={busy}
                onPublish={(c) => setConfirm({ kind: 'publish', chapter: c })}
                onDelete={(c) => setConfirm({ kind: 'delete', chapter: c })}
              />
            ))}
          </ul>
          <ListFooter
            sentinel={sentinel}
            loadingMore={loadingMore}
            failed={loadMoreFailed}
            onRetry={() => void loadMore()}
            locale={locale}
          />
          {atChapterLimit ? (
            <p className="mt-3 type-caption text-secondary">
              {copy.chapterLimit(WORK_LIMITS.maxChapters.toLocaleString(INTL_LOCALE[locale]))}
            </p>
          ) : (
            <InkButton href={chapterEditHref(work.id, 'new')} variant="secondary" className="mt-3">
              {chapters.length === 0 ? copy.newChapter : copy.writeNextChapter}
            </InkButton>
          )}
        </section>
      </div>

      <aside className="lg:sticky lg:top-6">{panel}</aside>

      <TitleDialog
        open={editingTitle}
        initial={work.title}
        onClose={() => setEditingTitle(false)}
        onSave={(title) => mutate(() => worksApi.updateTitle(work.id, title, { locale }))}
      />

      <InkDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={
          confirm?.kind === 'publish'
            ? copy.publishChapterTitle(confirm.chapter.orderIndex)
            : copy.deleteChapterTitle
        }
        body={confirm?.kind === 'publish' ? copy.publishChapterBody : copy.deleteChapterBody}
      >
        {confirm?.kind === 'publish' ? (
          <InkButton
            busy={busy}
            onClick={async () => {
              const chapter = confirm.chapter;
              await mutate(() => worksApi.publishChapter(work.id, chapter.id, { locale }));
              setConfirm(null);
            }}
          >
            {copy.publishChapterAction}
          </InkButton>
        ) : (
          <InkButton
            variant="destructive"
            busy={busy}
            onClick={async () => {
              const chapter = confirm?.chapter;
              if (chapter) await mutate(() => worksApi.deleteChapter(work.id, chapter.id, { locale }));
              setConfirm(null);
            }}
          >
            {copy.deleteChapter}
          </InkButton>
        )}
        <InkButton variant="secondary" onClick={() => setConfirm(null)}>
          {copy.cancel}
        </InkButton>
      </InkDialog>
    </div>
  );
}

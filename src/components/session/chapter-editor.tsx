'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { cx } from '@/components/ink/cx';
import { ChevronLeftIcon } from '@/components/ink/icons';
import { InkButton } from '@/components/ink/ink-button';
import { InkChip } from '@/components/ink/ink-chip';
import { InkDialog } from '@/components/ink/ink-dialog';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { INTL_LOCALE, type Locale } from '@/lib/i18n';
import { ApiError, isTransient } from '@/lib/session/api';
import {
  ChapterAutosave,
  type ChapterEditorState,
  hasUnsavedWork,
  isDirty,
} from '@/lib/session/chapter-autosave';
import { SESSION_COPY } from '@/lib/session/copy';
import { WORK_LIMITS, conflictSnapshot, newClientId, runeLength, worksApi } from '@/lib/session/works';
import { WORKS_COPY } from '@/lib/session/works-copy';

import { useSessionLocale } from './session-root';
import { chapterEditHref, workManageHref } from './works-parts';

// Chapter editor (16, Lectura): plain text only — no rich text, no HTML.
// The text lives in memory and on the server (founder decision 5: no local
// copy). Leaving with unsaved text first saves it; closing the tab can only
// be warned about (beforeunload), never guaranteed.

type Loaded = { initial: ChapterEditorState; workTitle: string };

function useEditorState(engine: ChapterAutosave): ChapterEditorState {
  return useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);
}

/** Saves before any in-app navigation while the editor holds unsaved text. */
function useLeaveGuard(engine: ChapterAutosave) {
  const router = useRouter();
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (!hasUnsavedWork(engine.getState())) return;
      event.preventDefault();
      event.stopPropagation();
      void engine.flush().then((clean) => {
        if (clean) router.push(`${url.pathname}${url.search}${url.hash}`);
      });
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedWork(engine.getState())) return;
      engine.flushBestEffort();
      event.preventDefault();
      event.returnValue = '';
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden' && isDirty(engine.getState())) engine.flushBestEffort();
    };
    const onPageHide = () => {
      if (isDirty(engine.getState())) engine.flushBestEffort();
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [engine, router]);
}

function statusText(state: ChapterEditorState, locale: Locale): string | null {
  const copy = WORKS_COPY[locale];
  if (state.isNew && state.localContent.trim() === '') return null;
  switch (state.status) {
    case 'saving':
      return copy.saveSaving;
    case 'saved':
      return isDirty(state) ? copy.saveIdle : copy.saveSaved;
    case 'retrying':
      return copy.saveRetrying;
    case 'failed':
      return copy.saveFailed;
    case 'conflict':
      return copy.saveConflict;
    default:
      return copy.saveIdle;
  }
}

export function ChapterEditorView({ engine, workTitle }: { engine: ChapterAutosave; workTitle: string }) {
  const { locale } = useSessionLocale();
  const copy = WORKS_COPY[locale];
  const state = useEditorState(engine);
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishFailed, setPublishFailed] = useState(false);
  useLeaveGuard(engine);

  // Once the chapter exists, its URL replaces /chapter/new so a reload opens
  // this chapter instead of starting another one.
  useEffect(() => {
    if (!state.isNew && window.location.pathname.endsWith('/chapter/new')) {
      window.history.replaceState(window.history.state, '', chapterEditHref(state.workId, state.chapterId));
    }
  }, [state.isNew, state.workId, state.chapterId]);

  const format = (n: number) => n.toLocaleString(INTL_LOCALE[locale]);
  const length = runeLength(state.localContent);
  const label = copy.chapterDefault(state.orderIndex);
  const text = statusText(state, locale);
  const canPublish =
    !state.published &&
    !(state.isNew && state.localContent.trim() === '') &&
    state.status !== 'conflict' &&
    state.status !== 'invalid';

  async function startPublish() {
    setPublishFailed(false);
    setPublishing(true);
    // Invariant of 16: persist the newest buffer first (and wait for the
    // create of a new chapter); only a clean chapter reaches the dialog.
    const clean = await engine.flush();
    setPublishing(false);
    if (clean && !engine.getState().isNew) setConfirming(true);
  }

  async function publish() {
    setPublishing(true);
    try {
      // Nothing may have changed between the dialog and the request: if it
      // did, save again before publishing what the server holds.
      if (!(await engine.flush())) {
        setConfirming(false);
        return;
      }
      await worksApi.publishChapter(state.workId, state.chapterId, { locale });
      engine.markPublished();
      setConfirming(false);
    } catch {
      setPublishFailed(true);
      setConfirming(false);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="flex flex-col">
      {/* Bar: back to the work, chapter and save state, Publicar. */}
      <div className="sticky top-0 z-20 -mx-5 flex min-h-12 items-center gap-2 border-b border-divider bg-page px-3">
        <button
          type="button"
          aria-label={copy.backToWork}
          onClick={() => void engine.flush().then((clean) => clean && router.push(workManageHref(state.workId)))}
          className="ink-focus ink-dim flex size-11 shrink-0 items-center justify-center rounded-control text-primary"
        >
          <ChevronLeftIcon size={24} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate font-literary text-[14px] italic text-reader-muted">{workTitle || copy.untitled}</span>
          <span className="flex items-center gap-2 type-caption">
            <span className="text-secondary">{label}</span>
            {text ? (
              <span
                role="status"
                className={cx(
                  state.status === 'failed' || state.status === 'conflict' ? 'text-danger' : 'text-tertiary',
                )}
              >
                · {text}
              </span>
            ) : null}
          </span>
        </div>
        {state.published ? (
          <InkChip tone="success">{copy.chapterPublished}</InkChip>
        ) : (
          <button
            type="button"
            onClick={() => void startPublish()}
            disabled={!canPublish || publishing}
            aria-busy={publishing || undefined}
            className={cx(
              'ink-focus inline-flex min-h-11 shrink-0 items-center rounded-control border-brand px-4 type-button-sm',
              canPublish && !publishing
                ? 'border-outline bg-yellow text-on-accent ink-shadow-press ink-press'
                : 'border-default bg-sunken text-disabled',
            )}
          >
            {copy.publishChapter}
          </button>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4 pt-5">
        {state.published ? <InkInlineBanner tone="info" title={copy.publishedLive} /> : null}
        {state.status === 'conflict' ? (
          <InkInlineBanner
            tone="notice"
            title={copy.saveConflict}
            detail={copy.conflictMessage}
            action={
              <div className="flex flex-wrap gap-x-4">
                <InkTextAction onClick={() => engine.keepMine()}>{copy.keepMine}</InkTextAction>
                <InkTextAction onClick={() => engine.useServer()}>{copy.useServer}</InkTextAction>
              </div>
            }
          />
        ) : null}
        {state.status === 'failed' ? (
          <InkInlineBanner title={copy.saveFailed} action={<InkTextAction onClick={() => engine.retryNow()}>{copy.retry}</InkTextAction>} />
        ) : null}
        {publishFailed ? <InkInlineBanner title={copy.mutationError} /> : null}

        <label className="sr-only" htmlFor="chapter-title">
          {copy.chapterTitleHint(state.orderIndex)}
        </label>
        <input
          id="chapter-title"
          value={state.localTitle}
          onChange={(event) => engine.setTitle(event.target.value)}
          maxLength={WORK_LIMITS.chapterTitle}
          placeholder={copy.chapterTitleHint(state.orderIndex)}
          className="w-full bg-transparent font-literary text-[26px] leading-[1.15] font-bold text-content outline-none placeholder:font-normal placeholder:text-placeholder sm:text-[31px]"
        />

        <label className="sr-only" htmlFor="chapter-body">
          {copy.contentHint}
        </label>
        <textarea
          id="chapter-body"
          value={state.localContent}
          onChange={(event) => engine.setContent(event.target.value)}
          placeholder={copy.contentHint}
          aria-invalid={state.invalid ? true : undefined}
          aria-describedby="chapter-counter chapter-invalid"
          spellCheck
          className="min-h-[50vh] w-full resize-none bg-transparent type-literary-body text-content outline-none [field-sizing:content] placeholder:text-placeholder"
        />

        <div className="flex items-start justify-between gap-4 border-t border-divider pt-2">
          <p id="chapter-invalid" className="type-caption text-danger" aria-live="polite">
            {state.invalid === 'tooLong'
              ? copy.tooLong(format(WORK_LIMITS.chapterContent))
              : state.invalid === 'empty'
                ? state.published
                  ? copy.emptyPublishedChapter
                  : copy.emptyDraft
                : null}
          </p>
          <p
            id="chapter-counter"
            className={cx('shrink-0 type-caption tabular-nums', length > WORK_LIMITS.chapterContent ? 'text-danger' : 'text-tertiary')}
          >
            {copy.counter(format(length), format(WORK_LIMITS.chapterContent))}
          </p>
        </div>
      </div>

      <InkDialog
        open={confirming}
        onClose={() => !publishing && setConfirming(false)}
        title={copy.publishChapterTitle(state.orderIndex)}
        body={copy.publishChapterBody}
      >
        <InkButton busy={publishing} onClick={() => void publish()}>
          {copy.publishChapterAction}
        </InkButton>
        <InkButton variant="secondary" onClick={() => setConfirming(false)}>
          {copy.cancel}
        </InkButton>
      </InkDialog>
    </div>
  );
}

export function ChapterEditor({ workId, chapterId }: { workId: string; chapterId: string }) {
  const { locale } = useSessionLocale();
  const copy = WORKS_COPY[locale];
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notFound' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [engine, setEngine] = useState<ChapterAutosave | null>(null);
  // The id of a new chapter is generated once per visit (create-on-first-save).
  const newId = useRef<string>(chapterId === 'new' ? newClientId() : chapterId);

  useEffect(() => {
    if (loaded) return;
    const controller = new AbortController();
    const ctx = { locale: localeRef.current, signal: controller.signal };
    (async () => {
      try {
        const work = await worksApi.get(workId, ctx);
        let initial: ChapterEditorState;
        if (chapterId === 'new') {
          const order = work.chapters.reduce((max, c) => Math.max(max, c.orderIndex), 0) + 1;
          initial = {
            workId,
            chapterId: newId.current,
            isNew: true,
            orderIndex: order,
            published: false,
            localContent: '',
            localTitle: '',
            savedContent: '',
            savedTitle: '',
            savedRevision: 0,
            status: 'saved',
            invalid: null,
            conflict: null,
          };
        } else {
          const chapter = await worksApi.chapter(workId, chapterId, ctx);
          initial = {
            workId,
            chapterId: chapter.id,
            isNew: false,
            orderIndex: chapter.orderIndex,
            published: chapter.published,
            localContent: chapter.content,
            localTitle: chapter.title,
            savedContent: chapter.content,
            savedTitle: chapter.title,
            savedRevision: chapter.revision,
            status: 'saved',
            invalid: null,
            conflict: null,
          };
        }
        setLoaded({ initial, workTitle: work.title });
        setStatus('ready');
      } catch (error) {
        if (controller.signal.aborted) return;
        setStatus(error instanceof ApiError && (error.status === 404 || error.status === 403) ? 'notFound' : 'error');
      }
    })();
    return () => controller.abort();
  }, [workId, chapterId, attempt, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const id = loaded.initial.chapterId;
    const created = new ChapterAutosave(loaded.initial, {
      add: (content, title, keepalive) => worksApi.addChapter(workId, id, content, title, { locale: localeRef.current, keepalive }),
      patch: (content, title, revision, keepalive) =>
        worksApi.patchChapter(workId, id, content, title, revision, { locale: localeRef.current, keepalive }),
      remove: () => worksApi.deleteChapter(workId, id, { locale: localeRef.current }),
      readConflict: (error) => (error instanceof ApiError && error.status === 409 ? conflictSnapshot(error.data) : null),
      isTransient,
    });
    setEngine(created);
    return () => {
      // Leaving by any other way (browser back): best-effort save, then stop.
      if (isDirty(created.getState())) created.flushBestEffort();
      created.dispose();
    };
  }, [loaded, workId]);

  if (status === 'loading' || (status === 'ready' && !engine)) {
    return <InkSkeleton className="mt-6" lines={6} height="h-6" label={SESSION_COPY[locale].common.loading} />;
  }
  if (status !== 'ready' || !engine || !loaded) {
    return (
      <InkInlineBanner
        className="mt-6"
        title={copy.loadError}
        action={status === 'error' ? <InkTextAction onClick={() => setAttempt((v) => v + 1)}>{copy.retry}</InkTextAction> : undefined}
      />
    );
  }
  return <ChapterEditorView engine={engine} workTitle={loaded.workTitle} />;
}

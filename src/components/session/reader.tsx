'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { cx } from '@/components/ink/cx';
import { ChevronLeftIcon } from '@/components/ink/icons';
import { InkButton } from '@/components/ink/ink-button';
import { InkDialog } from '@/components/ink/ink-dialog';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { StoryText } from '@/components/reading/story-parts';
import type { Locale } from '@/lib/i18n';
import { ApiError, apiGet, apiPath } from '@/lib/session/api';
import { SESSION_COPY } from '@/lib/session/copy';
import {
  type Chapter,
  type ChapterSummary,
  type WorkDetail,
  parseChapterSummaries,
  parsePublicChapter,
  parseWorkDetail,
} from '@/lib/session/models';

import { useSession } from '@/lib/session/auth-context';

import { ChapterMarksChip, ChapterMarksSection, useChapterMarks } from './chapter-marks';
import { ByLine } from './historias';
import { FollowCompact, FollowEndRow, FollowError, useWorkFollow } from './work-follow';
import { useSessionLocale } from './session-root';

// Reader (10), ported from features/continue_stories/presentation/pages/
// public_reader_page.dart: «InkDuel afuera, la historia adentro». Literata
// 19/30, no indent or drop cap, a thin progress line under the bar.
// Marcas (phase 3) sit under the chapter; following the work (phase 4) sits
// beside the author and at the end. Reporting the work is not part of the web.

const MAX_SUMMARY_PAGES = 20;

export type Load =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'error' }
  | { status: 'empty'; work: WorkDetail }
  | { status: 'ready'; work: WorkDetail; chapter: Chapter };

export function chapterHref(workId: string, chapterId: string): string {
  return `/work/${encodeURIComponent(workId)}/chapter/${encodeURIComponent(chapterId)}`;
}

/**
 * The work, then the chapter to read: [chapterId], or the work's first
 * published chapter. The work only carries a summary of that chapter
 * (ChapterSummaryPublicDTO), so its text always comes from the same chapter
 * endpoint as /work/{id}/chapter/{cid}.
 */
export async function loadReaderContent(
  workId: string,
  chapterId: string | null,
  get: (path: string) => Promise<unknown>,
): Promise<Load> {
  try {
    const work = parseWorkDetail(await get(apiPath('api', 'gallery', 'works', workId)));
    if (!work) return { status: 'unavailable' };
    const targetId = chapterId ?? work.firstPublishedChapter?.id ?? null;
    if (!targetId) return { status: 'empty', work };
    const chapter = parsePublicChapter(await get(apiPath('api', 'gallery', 'works', workId, 'chapters', targetId)));
    return chapter ? { status: 'ready', work, chapter } : { status: 'unavailable' };
  } catch (error) {
    const gone = error instanceof ApiError && (error.status === 404 || error.status === 403 || error.status === 410);
    return { status: gone ? 'unavailable' : 'error' };
  }
}

function useReader(workId: string, chapterId: string | null, locale: Locale, attempt: number) {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [summaries, setSummaries] = useState<ChapterSummary[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setLoad({ status: 'loading' });
    loadReaderContent(workId, chapterId, (path) => apiGet(path, { locale, signal }))
      .then((result) => {
        if (!signal.aborted) setLoad(result);
      })
      .catch(() => {
        if (!signal.aborted) setLoad({ status: 'error' });
      });
    return () => controller.abort();
  }, [workId, chapterId, locale, attempt]);

  // The chapter list drives previous/next and the index.
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const all: ChapterSummary[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < MAX_SUMMARY_PAGES; page += 1) {
        const data = parseChapterSummaries(
          await apiGet(apiPath('api', 'gallery', 'works', workId, 'chapters'), {
            locale,
            query: { cursor: cursor ?? undefined },
            signal: controller.signal,
          }),
        );
        all.push(...data.items);
        cursor = data.nextCursor;
        if (!cursor) break;
      }
      if (!controller.signal.aborted) setSummaries(all.sort((a, b) => a.orderIndex - b.orderIndex));
    })().catch(() => {
      // Without the list the reader still works; only navigation is hidden.
    });
    return () => controller.abort();
  }, [workId, locale]);

  return { load, summaries };
}

function useScrollProgress(target: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const node = target.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      setProgress(total <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / total)));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [target]);
  return progress;
}

export function ReaderBar({
  title,
  progress,
  onIndex,
  locale,
}: {
  title: string;
  progress: number;
  onIndex: (() => void) | null;
  locale: Locale;
}) {
  const copy = SESSION_COPY[locale];
  return (
    <div className="sticky top-0 z-20 -mx-5 bg-page">
      <div className="flex h-11 items-center gap-1 px-1.5">
        <Link
          href="/stories?tab=works"
          aria-label={copy.common.back}
          className="ink-focus ink-dim flex size-11 shrink-0 items-center justify-center rounded-control text-primary"
        >
          <ChevronLeftIcon size={24} />
        </Link>
        <p className="min-w-0 flex-1 truncate text-center font-literary text-[16px] italic text-reader-muted">{title}</p>
        {onIndex ? (
          <button
            type="button"
            onClick={onIndex}
            className="ink-focus ink-dim min-h-11 shrink-0 rounded-control px-2 type-button-sm text-[14px] text-primary"
          >
            {copy.reader.chapters}
          </button>
        ) : (
          <span className="w-11 shrink-0" />
        )}
      </div>
      {/* Progress line: reader.line track, blue fill, ink tip. */}
      <div aria-hidden="true" className="relative h-0.5 bg-divider">
        <div className="absolute inset-y-0 left-0 bg-[var(--ink-brand-blue)]" style={{ width: `${(progress * 100).toFixed(2)}%` }}>
          {progress > 0 ? <span className="absolute top-1/2 right-0 h-1 w-1.5 -translate-y-1/2 bg-inverse" /> : null}
        </div>
      </div>
    </div>
  );
}

function ChapterIndex({
  open,
  onClose,
  workId,
  current,
  summaries,
  total,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  workId: string;
  current: string;
  summaries: ChapterSummary[];
  total: number;
  locale: Locale;
}) {
  const copy = SESSION_COPY[locale].reader;
  return (
    <InkDialog open={open} onClose={onClose} title={`${copy.chapters} (${total || summaries.length})`}>
      <ol className="-mx-2 m-0 flex max-h-[55vh] list-none flex-col overflow-y-auto p-0">
        {summaries.map((summary) => (
          <li key={summary.id}>
            <Link
              href={chapterHref(workId, summary.id)}
              onClick={onClose}
              aria-current={summary.id === current ? 'page' : undefined}
              className={cx(
                'ink-focus flex min-h-11 items-baseline gap-2 rounded-control px-2 py-2.5',
                summary.id === current ? 'bg-sunken' : 'ink-dim',
              )}
            >
              <span className="shrink-0 type-caption text-secondary">{copy.chapter(summary.orderIndex)}</span>
              <span className="min-w-0 truncate font-literary text-[16px] text-primary">{summary.title}</span>
            </Link>
          </li>
        ))}
      </ol>
      <InkButton variant="secondary" onClick={onClose}>
        {copy.close}
      </InkButton>
    </InkDialog>
  );
}

export function ReaderView({ workId, chapterId }: { workId: string; chapterId: string | null }) {
  const { locale } = useSessionLocale();
  const copy = SESSION_COPY[locale];
  const [attempt, setAttempt] = useState(0);
  const [indexOpen, setIndexOpen] = useState(false);
  const { load, summaries } = useReader(workId, chapterId, locale, attempt);
  const article = useRef<HTMLElement>(null);
  const progress = useScrollProgress(article);

  useEffect(() => {
    if (load.status === 'ready') window.scrollTo(0, 0);
  }, [load.status, chapterId]);

  const workTitle = load.status === 'ready' || load.status === 'empty' ? load.work.title || copy.common.untitled : '';
  const bar = (
    <ReaderBar
      title={workTitle}
      progress={load.status === 'ready' ? progress : 0}
      onIndex={summaries.length > 0 ? () => setIndexOpen(true) : null}
      locale={locale}
    />
  );

  if (load.status === 'loading') {
    return (
      <>
        {bar}
        <InkSkeleton className="mt-8" lines={5} height="h-6" label={copy.common.loading} />
      </>
    );
  }
  if (load.status === 'unavailable' || load.status === 'error' || load.status === 'empty') {
    const title =
      load.status === 'unavailable' ? copy.reader.unavailable : load.status === 'empty' ? copy.reader.emptyWork : copy.reader.loadError;
    return (
      <>
        {bar}
        <InkInlineBanner
          className="mt-8"
          tone={load.status === 'error' ? 'error' : 'info'}
          title={title}
          action={
            load.status === 'error' ? (
              <InkTextAction onClick={() => setAttempt((value) => value + 1)}>{copy.common.retry}</InkTextAction>
            ) : undefined
          }
        />
      </>
    );
  }

  return (
    <ReaderReady
      work={load.work}
      chapter={load.chapter}
      summaries={summaries}
      bar={bar}
      article={article}
      indexOpen={indexOpen}
      onCloseIndex={() => setIndexOpen(false)}
    />
  );
}


/** The loaded chapter: header, text, end of chapter and navigation. */
export function ReaderReady({
  work,
  chapter,
  summaries,
  bar,
  article,
  indexOpen,
  onCloseIndex,
}: {
  work: WorkDetail;
  chapter: Chapter;
  summaries: ChapterSummary[];
  bar: React.ReactNode;
  article?: React.RefObject<HTMLElement | null>;
  indexOpen: boolean;
  onCloseIndex: () => void;
}) {
  const { locale } = useSessionLocale();
  const copy = SESSION_COPY[locale];
  const workTitle = work.title || copy.common.untitled;
  const index = summaries.findIndex((summary) => summary.id === chapter.id);
  const summary = index >= 0 ? summaries[index] : null;
  const previous = index > 0 ? summaries[index - 1] : null;
  const next = index >= 0 && index < summaries.length - 1 ? summaries[index + 1] : null;
  const chapterTitle = chapter.title || summary?.title || copy.reader.chapter(chapter.orderIndex);
  const words = chapter.content.trim().split(/\s+/).filter(Boolean).length;
  const kicker = `${copy.reader.chapter(chapter.orderIndex)} · ${copy.reader.readTime(Math.max(1, Math.ceil(words / 200)))}`;
  const total = work.publishedChapterCount || summaries.length;
  const { user } = useSession();
  const marks = useChapterMarks(work.id, chapter.id, locale);
  const follow = useWorkFollow(work.id, locale);

  return (
    <>
      {bar}
      <article ref={article}>
        <header className="flex flex-col pt-6 pb-6">
          <p className="font-literary text-[16.5px] italic text-reader-muted">{workTitle}</p>
          <p className="mt-[15px] type-label text-[12px] tracking-[0.13em] text-reader-muted">{kicker}</p>
          <h1 className="mt-[7px] font-literary text-[31px] leading-[1.12] font-bold tracking-[-0.01em] text-primary break-words">
            {chapterTitle}
          </h1>
          <div className="mt-[17px]">
            <ByLine
              name={work.authorDisplayName}
              authorId={work.authorId || undefined}
              size="md"
              trailing={<FollowCompact follow={follow} locale={locale} />}
            />
            <FollowError follow={follow} at="header" locale={locale} />
          </div>
          <div className="mt-3 flex empty:hidden">
            <ChapterMarksChip marks={marks} locale={locale} />
          </div>
        </header>
        <StoryText text={chapter.content} />
      </article>

      <footer className="mt-10 flex flex-col gap-5">
        <p className="text-center type-label text-[11.5px] tracking-[0.14em] text-reader-muted">
          {copy.reader.endOfChapter(chapter.orderIndex)}
        </p>
        {next ? (
          <Link
            href={chapterHref(work.id, next.id)}
            className="ink-focus ink-press flex items-center gap-3 rounded-button border-brand border-outline bg-yellow px-[18px] pt-[11px] pb-3 text-on-accent ink-shadow-button"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="type-label text-[11.5px] text-on-accent">{copy.reader.nextChapter}</span>
              <span className="font-literary text-[19px] leading-[1.2] font-semibold">
                {next.title ? `${copy.reader.chapter(next.orderIndex)} · ${next.title}` : copy.reader.chapter(next.orderIndex)}
              </span>
            </span>
            <span aria-hidden="true" className="text-[22px]">→</span>
          </Link>
        ) : index >= 0 ? (
          <p className="text-center type-body text-secondary">{copy.reader.reachedEnd}</p>
        ) : null}

        {index >= 0 && total > 1 ? (
          <nav className="flex items-center justify-between gap-2" aria-label={copy.reader.chapters}>
            {previous ? (
              <Link href={chapterHref(work.id, previous.id)} className="ink-focus ink-dim min-h-11 rounded-control px-2 py-2.5 type-button-sm text-[14px] text-primary">
                ← {copy.reader.previous}
              </Link>
            ) : (
              <span />
            )}
            <span className="type-caption tabular-nums text-secondary">{copy.reader.position(index + 1, total)}</span>
            {next ? (
              <Link href={chapterHref(work.id, next.id)} className="ink-focus ink-dim min-h-11 rounded-control px-2 py-2.5 type-button-sm text-[14px] text-primary">
                {copy.reader.next} →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}

        <div className="mt-2 empty:hidden">
          <FollowEndRow follow={follow} authorName={work.authorDisplayName} locale={locale} />
        </div>
      </footer>

      <ChapterMarksSection marks={marks} isWorkAuthor={!!user && user.id === work.authorId} locale={locale} />

      <ChapterIndex
        open={indexOpen}
        onClose={onCloseIndex}
        workId={work.id}
        current={chapter.id}
        summaries={summaries}
        total={total}
        locale={locale}
      />
    </>
  );
}

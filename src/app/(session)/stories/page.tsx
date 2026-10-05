'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';

import { Consigna } from '@/components/ink/consigna';
import { cx } from '@/components/ink/cx';
import { ChevronLeftIcon } from '@/components/ink/icons';
import { InkButton } from '@/components/ink/ink-button';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkEmptyState, InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { StoryText } from '@/components/reading/story-parts';
import { ByLine, HistoriasIndex, ListFooter, RelatoItem, WorkItem, winReason } from '@/components/session/historias';
import { NewWorkDialog } from '@/components/session/my-works';
import { RequireSession, SessionPage } from '@/components/session/session-page';
import { useSessionLocale } from '@/components/session/session-root';
import { StoryComments } from '@/components/session/story-comments';
import type { Locale } from '@/lib/i18n';
import { apiGet } from '@/lib/session/api';
import { useSession } from '@/lib/session/auth-context';
import { SESSION_COPY } from '@/lib/session/copy';
import { type GalleryStory, parseGalleryStories, parseGalleryWorks } from '@/lib/session/models';
import { useInfiniteSentinel, usePagedList } from '@/lib/session/use-paged-list';
import { WORKS_COPY } from '@/lib/session/works-copy';

// Historias (09): Lectura paper, «Relatos de duelo | Obras» over the two
// existing lists, «Lo último» as the only card, then an index. A relato
// opens in place (?relato=): the backend has no single-relato endpoint, so
// the detail reads the item already loaded, as the app does. Likes and
// Marcas sit under the relato (phase 3); likes are not part of the web.

type Tab = 'relatos' | 'works';

function Tabs({ tab, onChange, locale, panelId }: { tab: Tab; onChange: (tab: Tab) => void; locale: Locale; panelId: string }) {
  const copy = SESSION_COPY[locale].stories;
  const tabs: [Tab, string][] = [
    ['relatos', copy.relatosTab],
    ['works', copy.worksTab],
  ];
  return (
    <div role="tablist" className="sticky top-0 z-20 -mx-5 flex gap-6 border-b border-divider bg-page px-5">
      {tabs.map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={tab === value}
          aria-controls={panelId}
          onClick={() => onChange(value)}
          className={cx(
            'ink-focus -mb-px flex h-10 items-center border-b-[3px] type-title-section leading-[1.2]',
            tab === value ? 'border-[var(--ink-text-primary)] text-primary' : 'border-transparent text-secondary hover:text-primary',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function RelatoDetail({ story, locale }: { story: GalleryStory; locale: Locale }) {
  const copy = SESSION_COPY[locale].stories;
  const reason = winReason(story, locale);
  const { user } = useSession();
  // A block, not an expression: recent Chrome returns a promise from
  // scrollTo, which React would take for a cleanup function.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [story.key]);
  return (
    <article className="mx-auto flex w-full max-w-[680px] flex-col gap-4 pt-2">
      <Link
        href="/stories"
        className="ink-focus ink-dim -ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-control pr-3 pl-1 type-button-sm text-[14px] text-secondary"
      >
        <ChevronLeftIcon size={20} />
        {copy.title}
      </Link>
      {story.prompt.trim() ? <Consigna label={copy.promptLabel} text={story.prompt.trim()} /> : null}
      <ByLine name={story.authorDisplayName} authorId={story.authorId || undefined} extra={story.authorRank} size="md" />
      {reason ? (
        <p className="type-caption text-[13.5px] text-secondary">
          {reason} · {copy.score(Math.round(story.score))}
        </p>
      ) : null}
      <div className="mt-4">
        <StoryText text={story.storyText || story.storyPreview} />
      </div>
      <StoryComments
        duelId={story.duelId}
        storyId={story.storyId}
        isOwnStory={!!user && user.id === story.authorId}
        initialCount={story.commentsCount}
        locale={locale}
      />
    </article>
  );
}

function StoriesView() {
  const { locale } = useSessionLocale();
  const router = useRouter();
  const params = useSearchParams();
  const panelId = useId();
  const copy = SESSION_COPY[locale].stories;
  const tab: Tab = params.get('tab') === 'works' ? 'works' : 'relatos';
  const relatoKey = params.get('relato');

  const fetchRelatos = useCallback(
    async (cursor: string | null, signal: AbortSignal) =>
      parseGalleryStories(await apiGet('/api/gallery/stories', { locale, query: { cursor: cursor ?? undefined }, signal })),
    [locale],
  );
  const fetchWorks = useCallback(
    async (cursor: string | null, signal: AbortSignal) =>
      parseGalleryWorks(
        await apiGet('/api/gallery/works', { locale, query: { language: locale, cursor: cursor ?? undefined }, signal }),
      ),
    [locale],
  );
  const relatos = usePagedList(fetchRelatos);
  const works = usePagedList(fetchWorks);
  const active = tab === 'works' ? works : relatos;
  const sentinel = useInfiniteSentinel(active.loadMore, active.status === 'ready' && active.hasMore && !relatoKey);

  const selected = useMemo(
    () => (relatoKey ? relatos.items.find((item) => item.key === relatoKey) ?? null : null),
    [relatoKey, relatos.items],
  );
  // A relato link from another visit: if it is not in the loaded list, fall
  // back to the index instead of an empty page.
  useEffect(() => {
    if (relatoKey && relatos.status !== 'loading' && !selected) router.replace('/stories');
  }, [relatoKey, relatos.status, selected, router]);

  const [creating, setCreating] = useState(false);
  const worksCopy = WORKS_COPY[locale];

  if (selected) return <RelatoDetail story={selected} locale={locale} />;

  return (
    <div className="flex flex-col">
      <h1 className="pt-1.5 pb-3.5 type-display text-[36px] leading-none text-primary">{copy.title}</h1>
      <Tabs tab={tab} locale={locale} panelId={panelId} onChange={(next) => router.replace(next === 'works' ? '/stories?tab=works' : '/stories', { scroll: false })} />
      <section id={panelId} role="tabpanel" className="pt-3.5">
        {/* «Historias de la comunidad · + Crear obra» (gallery_works_feed.dart). */}
        {tab === 'works' && works.status === 'ready' ? (
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate type-body text-[14.5px] text-secondary">{worksCopy.gallerySubtitle}</p>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="ink-focus ink-dim min-h-11 shrink-0 rounded-control px-1 type-button-sm text-[15px] text-blue"
            >
              + {worksCopy.createWork}
            </button>
          </div>
        ) : null}
        {active.status === 'loading' ? (
          <div className="flex flex-col gap-4">
            <InkSkeleton lines={1} height="h-60" label={SESSION_COPY[locale].common.loading} />
            <InkSkeleton lines={3} height="h-28" label="" />
          </div>
        ) : null}

        {active.status === 'error' ? (
          <InkInlineBanner
            title={tab === 'works' ? copy.worksError : copy.relatosError}
            detail={tab === 'works' ? undefined : copy.relatosErrorBody}
            action={<InkTextAction onClick={active.retry}>{SESSION_COPY[locale].common.retry}</InkTextAction>}
          />
        ) : null}

        {active.status === 'ready' && active.items.length === 0 ? (
          tab === 'works' ? (
            <InkEmptyState
              title={copy.worksEmpty}
              action={
                <InkButton fullWidth={false} className="px-6" onClick={() => setCreating(true)}>
                  {worksCopy.createWork}
                </InkButton>
              }
            />
          ) : (
            <InkEmptyState title={copy.relatosEmptyTitle} message={copy.relatosEmptyBody} />
          )
        ) : null}

        {tab === 'relatos' && relatos.status === 'ready' && relatos.items.length > 0 ? (
          <>
            <div className="mb-1.5 lg:mb-4">
              <RelatoItem story={relatos.items[0]} locale={locale} lead />
            </div>
            <HistoriasIndex
              items={relatos.items.slice(1).map((story) => ({ key: story.key, node: <RelatoItem story={story} locale={locale} /> }))}
            />
          </>
        ) : null}

        {tab === 'works' && works.status === 'ready' && works.items.length > 0 ? (
          <>
            <div className="mb-1.5 lg:mb-4">
              <WorkItem work={works.items[0]} locale={locale} lead />
            </div>
            <HistoriasIndex
              items={works.items.slice(1).map((work) => ({ key: work.id, node: <WorkItem work={work} locale={locale} /> }))}
            />
          </>
        ) : null}

        <ListFooter
          sentinel={sentinel}
          loadingMore={active.loadingMore}
          failed={active.loadMoreFailed}
          onRetry={active.loadMore}
          locale={locale}
        />
      </section>
      <NewWorkDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

export default function StoriesPage() {
  return (
    <SessionPage context="reading" width="wide">
      <RequireSession>
        <StoriesView />
      </RequireSession>
    </SessionPage>
  );
}

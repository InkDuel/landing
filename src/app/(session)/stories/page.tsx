'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';

import { cx } from '@/components/ink/cx';
import { PlusIcon } from '@/components/ink/icons';
import { InkButton } from '@/components/ink/ink-button';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkEmptyState, InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { HistoriasIndex, ListFooter, RelatoItem, WorkItem } from '@/components/session/historias';
import { NewWorkDialog } from '@/components/session/my-works';
import { RequireSession, SessionPage } from '@/components/session/session-page';
import { useSessionLocale } from '@/components/session/session-root';
import { ModeAction, type ReaderLinks, ReadingMode } from '@/components/session/historias-reading';
import { StoryReaderArticle } from '@/components/session/story-reader';
import type { Locale } from '@/lib/i18n';
import { apiGet } from '@/lib/session/api';
import { useSession } from '@/lib/session/auth-context';
import { SESSION_COPY } from '@/lib/session/copy';
import { type GalleryStory, parseGalleryStories, parseGalleryWorks } from '@/lib/session/models';
import { type HistoriasViewMode, type ReadingFlags, readViewMode, readingApi, readingFlags, saveViewMode } from '@/lib/session/reading';
import { READING_COPY } from '@/lib/session/reading-copy';
import { useInfiniteSentinel, usePagedList } from '@/lib/session/use-paged-list';
import { WORKS_COPY } from '@/lib/session/works-copy';

// Historias (09): Lectura paper, «Relatos de duelo | Obras» over the two
// existing lists, «Lo último» as the only card, then an index. A relato
// opens in place (?relato=): the backend has no single-relato endpoint, so
// the detail reads the item already loaded, as the app does. Marcas sit
// under the relato (phase 3); likes are not part of the web.
//
// Reading flow (the app's gallery_page.dart, behind the same two switches):
// «Relatos de duelo» opens on a relato to read («Leer de corrido»), with
// «Ver lista» in the title row; reactions and «Siguiente relato» close each
// relato. With the queue switch off, Historias is the list as before.

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

type StoryPatch = Pick<GalleryStory, 'readByMe' | 'myReaction' | 'reactionCounts'>;

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
  const { user } = useSession();
  const viewerId = user?.id ?? null;

  // The reading flow's switches: null until known, so nothing flips mid-visit.
  const [flags, setFlags] = useState<ReadingFlags | null>(null);
  const [mode, setMode] = useState<HistoriasViewMode>('list');
  useEffect(() => {
    let active = true;
    void readingFlags().then((value) => {
      if (!active) return;
      setFlags(value);
      if (value.queue) setMode(readViewMode());
    });
    return () => {
      active = false;
    };
  }, []);
  const selectMode = (next: HistoriasViewMode) => {
    saveViewMode(next);
    setMode(next);
    window.scrollTo({ top: 0 });
  };

  // What the reader did here, laid over the loaded list (as the app's
  // markReadLocally / applyReactionLocally): «Leído» and canonical reactions.
  const [patches, setPatches] = useState<Record<string, Partial<StoryPatch>>>({});
  const items = useMemo(
    () => relatos.items.map((story) => (patches[story.key] ? { ...story, ...patches[story.key] } : story)),
    [relatos.items, patches],
  );
  const patch = useCallback(
    (key: string, value: Partial<StoryPatch>) => setPatches((current) => ({ ...current, [key]: { ...current[key], ...value } })),
    [],
  );
  const onStoryRead = useCallback((story: GalleryStory) => patch(story.key, { readByMe: true }), [patch]);
  const onReactionSaved = useCallback(
    (story: GalleryStory) => patch(story.key, { myReaction: story.myReaction, reactionCounts: story.reactionCounts }),
    [patch],
  );

  // Reading mode stays mounted (hidden) on Obras, so coming back to
  // «Relatos de duelo» finds the same relato, as the app's kept-alive tab.
  const readingMounted = !relatoKey && !!flags?.queue && mode === 'reading';
  const reading = tab === 'relatos' && readingMounted;
  const active = tab === 'works' ? works : relatos;
  const sentinel = useInfiniteSentinel(active.loadMore, active.status === 'ready' && active.hasMore && !relatoKey && !reading);

  const selected = useMemo(
    () => (relatoKey ? items.find((item) => item.key === relatoKey) ?? null : null),
    [relatoKey, items],
  );
  // A relato link from another visit: if it is not in the loaded list, fall
  // back to the index instead of an empty page.
  useEffect(() => {
    if (relatoKey && relatos.status !== 'loading' && !selected) router.replace('/stories');
  }, [relatoKey, relatos.status, selected, router]);

  const [creating, setCreating] = useState(false);
  const worksCopy = WORKS_COPY[locale];

  // Opened from the list: read on purpose, so it counts as read right away.
  // The reader is built once per relato, after the switches are known.
  if (selected && !flags) return <InkSkeleton lines={1} height="h-80" label={SESSION_COPY[locale].common.loading} />;
  if (selected && flags) {
    return (
      <StoryReaderArticle
        key={selected.key}
        locale={locale}
        backHref="/stories"
        options={{
          story: selected,
          api: readingApi,
          queueEnabled: flags.queue,
          reactionsEnabled: flags.reactions,
          viewerId,
          locale,
          feed: items,
          onStoryRead,
          onReactionSaved,
        }}
      />
    );
  }

  const links: ReaderLinks | null = flags ? { flags, viewerId, feed: items, onStoryRead, onReactionSaved } : null;
  const showModeAction = tab === 'relatos' && !!flags?.queue;
  const listCopy = READING_COPY[locale];

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 pt-1.5 pb-3.5">
        <h1 className="type-display text-[36px] leading-none text-primary">{copy.title}</h1>
        {showModeAction ? <ModeAction mode={mode} onChange={selectMode} locale={locale} /> : null}
      </div>
      <Tabs tab={tab} locale={locale} panelId={panelId} onChange={(next) => router.replace(next === 'works' ? '/stories?tab=works' : '/stories', { scroll: false })} />
      <section id={panelId} role="tabpanel" className="pt-3.5">
        {tab === 'relatos' && !flags ? <InkSkeleton lines={1} height="h-60" label={SESSION_COPY[locale].common.loading} /> : null}
        {readingMounted && links ? (
          <div hidden={!reading}>
            <ReadingMode
              links={links}
              listStatus={relatos.status}
              listError={
                <InkInlineBanner
                  title={copy.relatosError}
                  detail={copy.relatosErrorBody}
                  action={<InkTextAction onClick={relatos.retry}>{SESSION_COPY[locale].common.retry}</InkTextAction>}
                />
              }
              onShowList={() => selectMode('list')}
              locale={locale}
            />
          </div>
        ) : null}
        {/* «Historias de la comunidad · + Crear obra» (gallery_works_feed.dart). */}
        {tab === 'works' && works.status === 'ready' ? (
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate type-body text-[14.5px] text-secondary">{worksCopy.gallerySubtitle}</p>
            {/* A white pill with presence: yellow stays with «Leer», the main
                action of Historias (one yellow per screen). */}
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="ink-focus ink-dim inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-pill border-brand border-outline bg-surface px-4 py-2 type-button-sm text-[14px] text-primary"
            >
              <PlusIcon size={16} />
              {worksCopy.createWork}
            </button>
          </div>
        ) : null}
        {(tab === 'works' || (flags && !reading)) && active.status === 'loading' ? (
          <div className="flex flex-col gap-4">
            <InkSkeleton lines={1} height="h-60" label={SESSION_COPY[locale].common.loading} />
            <InkSkeleton lines={3} height="h-28" label="" />
          </div>
        ) : null}

        {(tab === 'works' || (flags && !reading)) && active.status === 'error' ? (
          <InkInlineBanner
            title={tab === 'works' ? copy.worksError : copy.relatosError}
            detail={tab === 'works' ? undefined : copy.relatosErrorBody}
            action={<InkTextAction onClick={active.retry}>{SESSION_COPY[locale].common.retry}</InkTextAction>}
          />
        ) : null}

        {(tab === 'works' || (flags && !reading)) && active.status === 'ready' && active.items.length === 0 ? (
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

        {tab === 'relatos' && flags && !reading && relatos.status === 'ready' && items.length > 0 ? (
          <>
            <div className="mb-1.5 lg:mb-4">
              <RelatoItem story={items[0]} locale={locale} lead />
            </div>
            <HistoriasIndex
              items={items.slice(1).map((story) => ({
                key: story.key,
                node: <RelatoItem story={story} locale={locale} readLabel={listCopy.readMarker} />,
              }))}
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

        {reading ? null : (
          <ListFooter
            sentinel={sentinel}
            loadingMore={active.loadingMore}
            failed={active.loadMoreFailed}
            onRetry={active.loadMore}
            locale={locale}
          />
        )}
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

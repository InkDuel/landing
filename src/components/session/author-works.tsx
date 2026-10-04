'use client';

import { useCallback } from 'react';

import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkTextAction } from '@/components/ink/ink-states';
import { Kicker } from '@/components/ink/kicker';
import type { Locale } from '@/lib/i18n';
import { apiGet } from '@/lib/session/api';
import { SESSION_COPY } from '@/lib/session/copy';
import { type GalleryWork, type Page, parseGalleryWorks } from '@/lib/session/models';
import { useInfiniteSentinel, usePagedList } from '@/lib/session/use-paged-list';

import { HistoriasIndex, ListFooter, WorkItem } from './historias';

/**
 * The author's published Obras, in the Historias index and paginated like
 * it: more pages load while there is a cursor. [fetchPage] is the page
 * loader; AuthorWorks below wires it to /api/gallery/works?authorId=.
 */
export function AuthorWorksList({
  fetchPage,
  locale,
}: {
  fetchPage: (cursor: string | null, signal: AbortSignal) => Promise<Page<GalleryWork>>;
  locale: Locale;
}) {
  const copy = SESSION_COPY[locale].profile;
  const works = usePagedList(fetchPage);
  const sentinel = useInfiniteSentinel(works.loadMore, works.status === 'ready' && works.hasMore);
  // A failed first page is an error, not «no works»: say so in the Obras
  // zone with a retry. Loading and an empty list still show nothing.
  if (works.status === 'error') {
    return (
      <section aria-label={copy.works} className="flex flex-col gap-2">
        <Kicker as="h2">{copy.works}</Kicker>
        <InkInlineBanner
          title={SESSION_COPY[locale].stories.worksError}
          action={<InkTextAction onClick={works.retry}>{SESSION_COPY[locale].common.retry}</InkTextAction>}
        />
      </section>
    );
  }
  if (works.status !== 'ready' || works.items.length === 0) return null;
  return (
    <section aria-labelledby="author-works" className="flex flex-col">
      <Kicker as="h2" className="mb-1">
        {copy.works}
      </Kicker>
      <p id="author-works" className="type-caption text-secondary">
        {copy.worksSubtitle}
      </p>
      <HistoriasIndex items={works.items.map((work) => ({ key: work.id, node: <WorkItem work={work} locale={locale} /> }))} />
      <ListFooter
        sentinel={sentinel}
        loadingMore={works.loadingMore}
        failed={works.loadMoreFailed}
        onRetry={works.loadMore}
        locale={locale}
      />
    </section>
  );
}

export function AuthorWorks({ authorId, locale }: { authorId: string; locale: Locale }) {
  const fetchPage = useCallback(
    async (cursor: string | null, signal: AbortSignal) =>
      parseGalleryWorks(
        await apiGet('/api/gallery/works', { locale, query: { authorId, cursor: cursor ?? undefined }, signal }),
      ),
    [authorId, locale],
  );
  return <AuthorWorksList fetchPage={fetchPage} locale={locale} />;
}

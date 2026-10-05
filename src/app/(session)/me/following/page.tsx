'use client';

import { useCallback } from 'react';

import { InkHeadline } from '@/components/ink/ink-headline';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkEmptyState, InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { BackLink } from '@/components/legal/legal-page';
import { HistoriasIndex, ListFooter, WorkItem } from '@/components/session/historias';
import { RequireSession, SessionPage } from '@/components/session/session-page';
import { useSessionLocale } from '@/components/session/session-root';
import { SESSION_COPY } from '@/lib/session/copy';
import { followsApi } from '@/lib/session/follows';
import { useInfiniteSentinel, usePagedList } from '@/lib/session/use-paged-list';
import { WORKS_COPY } from '@/lib/session/works-copy';

// «Historias que sigo» (following_works_page.dart): the works you follow,
// newest follow first, as rows of the Historias index.

function FollowingView() {
  const { locale } = useSessionLocale();
  const copy = WORKS_COPY[locale];
  const fetchPage = useCallback(
    (cursor: string | null, signal: AbortSignal) => followsApi.following(cursor, { locale, signal }),
    [locale],
  );
  const list = usePagedList(fetchPage);
  const sentinel = useInfiniteSentinel(list.loadMore, list.status === 'ready' && list.hasMore && !list.loadMoreFailed);

  return (
    <div className="flex flex-col gap-5 pt-2">
      <BackLink href="/me" label={SESSION_COPY[locale].nav.profile} />
      <InkHeadline text={`${copy.followingTitle}.`} size="title-page" />
      {list.status === 'loading' ? <InkSkeleton lines={4} height="h-16" label={SESSION_COPY[locale].common.loading} /> : null}
      {list.status === 'error' ? (
        <InkInlineBanner title={copy.followingError} action={<InkTextAction onClick={list.retry}>{copy.retry}</InkTextAction>} />
      ) : null}
      {list.status === 'ready' && list.items.length === 0 ? (
        <InkEmptyState title={copy.followingEmptyTitle} message={copy.followingEmptyBody} />
      ) : null}
      {list.items.length > 0 ? (
        <HistoriasIndex items={list.items.map((work) => ({ key: work.id, node: <WorkItem work={work} locale={locale} /> }))} />
      ) : null}
      <ListFooter sentinel={sentinel} loadingMore={list.loadingMore} failed={list.loadMoreFailed} onRetry={list.loadMore} locale={locale} />
    </div>
  );
}

export default function FollowingPage() {
  return (
    <SessionPage context="product" width="wide">
      <RequireSession>
        <FollowingView />
      </RequireSession>
    </SessionPage>
  );
}

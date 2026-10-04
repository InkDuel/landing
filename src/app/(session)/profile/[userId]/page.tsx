'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { Kicker } from '@/components/ink/kicker';
import { ReadingNotFound } from '@/components/reading/story-parts';
import { HistoriasDivider, WorkItem } from '@/components/session/historias';
import { ProfileIdentity, ProfileStats, RankCard } from '@/components/session/profile-parts';
import { RequireSession, SessionPage } from '@/components/session/session-page';
import { useSessionLocale } from '@/components/session/session-root';
import { withLang } from '@/lib/i18n';
import { ApiError, apiGet, apiPath, decodeParam } from '@/lib/session/api';
import { useSession } from '@/lib/session/auth-context';
import { SESSION_COPY } from '@/lib/session/copy';
import { type ProfileUser, parseGalleryWorks, parseProfileUser } from '@/lib/session/models';
import { usePagedList } from '@/lib/session/use-paged-list';

// Another writer's profile (11, ajeno): identity → compact rank, no pencil →
// Obras → stats. Retar, Seguir and the history are not part of phase 1.

function AuthorWorks({ authorId }: { authorId: string }) {
  const { locale } = useSessionLocale();
  const copy = SESSION_COPY[locale].profile;
  const fetchPage = useCallback(
    async (cursor: string | null, signal: AbortSignal) =>
      parseGalleryWorks(
        await apiGet('/api/gallery/works', { locale, query: { authorId, cursor: cursor ?? undefined }, signal }),
      ),
    [authorId, locale],
  );
  const works = usePagedList(fetchPage);
  if (works.status !== 'ready' || works.items.length === 0) return null;
  return (
    <section aria-labelledby="author-works" className="flex flex-col">
      <Kicker as="h2" className="mb-1">
        {copy.works}
      </Kicker>
      <p id="author-works" className="type-caption text-secondary">
        {copy.worksSubtitle}
      </p>
      {works.items.map((work, index) => (
        <div key={work.id}>
          {index > 0 ? <HistoriasDivider /> : null}
          <WorkItem work={work} locale={locale} />
        </div>
      ))}
    </section>
  );
}

function ProfileView({ userId }: { userId: string }) {
  const { locale } = useSessionLocale();
  const { user: me } = useSession();
  const router = useRouter();
  const copy = SESSION_COPY[locale].profile;
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'notFound' | 'error'; user: ProfileUser | null }>({
    status: 'loading',
    user: null,
  });
  const [attempt, setAttempt] = useState(0);
  const isMe = me?.id === userId;

  useEffect(() => {
    if (isMe) {
      router.replace('/me');
      return;
    }
    const controller = new AbortController();
    setState({ status: 'loading', user: null });
    apiGet(apiPath('api', 'user', userId), { locale, signal: controller.signal })
      .then((data) => {
        const user = parseProfileUser(data);
        setState(user ? { status: 'ready', user } : { status: 'notFound', user: null });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400);
        setState({ status: notFound ? 'notFound' : 'error', user: null });
      });
    return () => controller.abort();
  }, [userId, locale, isMe, router, attempt]);

  if (state.status === 'loading' || isMe) return <InkSkeleton className="mt-6" lines={4} label={SESSION_COPY[locale].common.loading} />;
  if (state.status === 'notFound') {
    return (
      <ReadingNotFound
        title={copy.notFoundTitle}
        body={copy.notFoundBody}
        homeHref={withLang('/stories', locale)}
        homeLabel={SESSION_COPY[locale].stories.title}
      />
    );
  }
  if (state.status === 'error' || !state.user) {
    return (
      <InkInlineBanner
        className="mt-6"
        title={copy.loadError}
        action={<InkTextAction onClick={() => setAttempt((value) => value + 1)}>{SESSION_COPY[locale].common.retry}</InkTextAction>}
      />
    );
  }

  const user = state.user;
  return (
    <div className="flex flex-col gap-6 pt-4">
      <ProfileIdentity user={user} locale={locale} />
      <RankCard user={user} locale={locale} own={false} />
      <AuthorWorks authorId={user.id} />
      <ProfileStats user={user} locale={locale} own={false} />
    </div>
  );
}

export default function ProfilePage() {
  const params = useParams<{ userId: string }>();
  return (
    <SessionPage context="arena">
      <RequireSession>
        <ProfileView userId={decodeParam(params.userId)} />
      </RequireSession>
    </SessionPage>
  );
}

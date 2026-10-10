'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { ReadingNotFound } from '@/components/reading/story-parts';
import { DuelHistory } from '@/components/session/duel-history';
import { AuthorWorks } from '@/components/session/author-works';
import { ProfileIdentity, ProfileLayout, ProfileStats, RankCard } from '@/components/session/profile-parts';
import { RequireSession, SessionPage } from '@/components/session/session-page';
import { useSessionLocale } from '@/components/session/session-root';
import { withLang } from '@/lib/i18n';
import { ApiError, apiGet, apiPath, decodeParam } from '@/lib/session/api';
import { useSession } from '@/lib/session/auth-context';
import { SESSION_COPY } from '@/lib/session/copy';
import { type ProfileUser, parseProfileUser } from '@/lib/session/models';

// Another writer's profile (11, ajeno): identity → compact rank, no pencil →
// stats → Obras (on the web Obras goes last: see ProfileLayout). Retar,
// Seguir is outside this scope.

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
    <ProfileLayout
      variant="other"
      identity={<ProfileIdentity user={user} locale={locale} />}
      rank={<RankCard user={user} locale={locale} own={false} />}
      works={
        <div className="flex flex-col gap-6">
          <AuthorWorks authorId={user.id} locale={locale} />
          <DuelHistory ownerId={user.id} privateDetail={user.duelDetailsPrivate} locale={locale} />
        </div>
      }
      stats={<ProfileStats user={user} locale={locale} own={false} />}
    />
  );
}

export default function ProfilePage() {
  const params = useParams<{ userId: string }>();
  return (
    <SessionPage context="arena" width="wide">
      <RequireSession>
        <ProfileView userId={decodeParam(params.userId)} />
      </RequireSession>
    </SessionPage>
  );
}

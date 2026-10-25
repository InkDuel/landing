'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { ApiError } from '@/lib/session/api';
import { useSession } from '@/lib/session/auth-context';
import { isStudioUnavailable } from '@/lib/session/studio/api';
import type { StudioOverview } from '@/lib/session/studio/models';
import { loadOverview } from '@/lib/session/studio/overview-cache';
import { STUDIO_COPY } from '@/lib/session/studio/studio-copy';

import { useSessionLocale } from '../session-root';
import { WorkManageView } from '../work-manage';
import { workManageHref } from '../works-parts';
import { StudioExportPanel } from './portability';
import { useLatestRef } from './studio-context';
import { StudioShell } from './studio-shell';

// Entry of the owner's Work page. Studio when the backend says it is on for
// this author; otherwise the existing Works page, untouched, plus the export
// (never gated: switching Studio off must not lock anyone out of their text).

type Load = { status: 'loading' } | { status: 'ready'; overview: StudioOverview } | { status: 'legacy' } | { status: 'notFound' } | { status: 'error' };

export function StudioRoot({ workId }: { workId: string }) {
  const { locale } = useSessionLocale();
  const { user } = useSession();
  if (!user) return <InkSkeleton className="mt-6" lines={5} label={STUDIO_COPY[locale].shell.loading} />;
  // Keyed by account: another account signing in starts from nothing, never
  // from the previous one's overview.
  return <StudioRootFor key={user.id} uid={user.id} workId={workId} />;
}

function StudioRootFor({ uid, workId }: { uid: string; workId: string }) {
  const { locale } = useSessionLocale();
  const copy = STUDIO_COPY[locale].shell;
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const localeRef = useLatestRef(locale);

  useEffect(() => {
    let cancelled = false;
    loadOverview(uid, workId, localeRef.current, attempt > 0)
      .then((overview) => !cancelled && setLoad({ status: 'ready', overview }))
      .catch((error) => {
        if (cancelled) return;
        if (isStudioUnavailable(error)) setLoad({ status: 'legacy' });
        else if (error instanceof ApiError && (error.status === 404 || error.status === 403)) setLoad({ status: 'notFound' });
        else setLoad({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [uid, workId, attempt, localeRef]);

  if (load.status === 'loading') return <InkSkeleton className="mt-6" lines={5} label={copy.loading} />;
  if (load.status === 'legacy') {
    return (
      <div className="mx-auto w-full max-w-[1120px]">
        <WorkManageView workId={workId} />
        <StudioExportPanel workId={workId} compact className="mt-10 max-w-[600px]" />
      </div>
    );
  }
  if (load.status !== 'ready') {
    return (
      <InkInlineBanner
        className="mt-6"
        title={load.status === 'notFound' ? copy.notFound : copy.loadError}
        action={load.status === 'error' ? <InkTextAction onClick={() => setAttempt((n) => n + 1)}>{copy.retry}</InkTextAction> : undefined}
      />
    );
  }
  return <StudioShell key={workId} initial={load.overview} uid={uid} />;
}

/**
 * The legacy chapter route (/me/works/[w]/chapter/[c]): with Studio on, it
 * hands over to the Studio editor of that chapter (bookmarks keep working);
 * otherwise it renders the existing editor unchanged.
 */
export function StudioChapterHandoff({ workId, chapterId, legacy }: { workId: string; chapterId: string; legacy: ReactNode }) {
  const { locale } = useSessionLocale();
  const router = useRouter();
  const uid = useSession().user?.id;
  const [mode, setMode] = useState<'checking' | 'legacy'>('checking');
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    loadOverview(uid, workId, locale)
      .then(() => {
        if (cancelled) return;
        const doc = chapterId === 'new' ? 'new' : chapterId;
        router.replace(`${workManageHref(workId)}?area=write&doc=${encodeURIComponent(doc)}`);
      })
      .catch(() => !cancelled && setMode('legacy'));
    return () => {
      cancelled = true;
    };
  }, [uid, workId, chapterId, locale, router]);
  if (mode === 'legacy') return <>{legacy}</>;
  return <InkSkeleton className="mt-6" lines={6} height="h-6" label={STUDIO_COPY[locale].shell.loading} />;
}

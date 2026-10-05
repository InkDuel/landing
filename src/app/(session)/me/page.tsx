'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { InkButton } from '@/components/ink/ink-button';
import { InkDialog } from '@/components/ink/ink-dialog';
import { LevelBar, ProfileIdentity, ProfileLayout, ProfileStats, RankCard } from '@/components/session/profile-parts';
import { ReceivedMarksPreview } from '@/components/session/received-marks';
import { RequireSession, SessionPage } from '@/components/session/session-page';
import { useSessionLocale } from '@/components/session/session-root';
import { SpaceRow, followingHref, myWorksHref } from '@/components/session/works-parts';
import { useSession } from '@/lib/session/auth-context';
import { SESSION_COPY } from '@/lib/session/copy';
import { type WorkProfileSummary, followsApi } from '@/lib/session/follows';
import { WORKS_COPY } from '@/lib/session/works-copy';

// Your profile (11, own): identity → rank card with the pencil → level →
// stats → Marcas recibidas → «Tu espacio» (Tus obras, Historias que sigo,
// with the app's counts; Círculo de tinta comes later).
// The history is not part of the web yet. Signing out lives in Ajustes in the app; the web has no
// Ajustes, so it closes the profile, behind the same simple dialog (18).

function MeView() {
  const { user, signOut } = useSession();
  const { locale } = useSessionLocale();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const copy = SESSION_COPY[locale].profile;
  const works = WORKS_COPY[locale];
  // The counts are decoration: the rows work without them.
  const [summary, setSummary] = useState<WorkProfileSummary | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    followsApi
      .profileSummary({ locale, signal: controller.signal })
      .then((next) => !controller.signal.aborted && setSummary(next))
      .catch(() => undefined);
    return () => controller.abort();
  }, [locale]);
  if (!user) return null;

  async function leave() {
    setLeaving(true);
    await signOut();
    router.replace('/');
  }

  return (
    <>
      <ProfileLayout
        variant="own"
        identity={<ProfileIdentity user={user} locale={locale} />}
        rank={<RankCard user={user} locale={locale} own />}
        level={<LevelBar user={user} locale={locale} />}
        stats={<ProfileStats user={user} locale={locale} own />}
        footer={
          <div className="flex flex-col gap-6">
            <ReceivedMarksPreview />
            <div className="flex flex-col gap-3">
              <SpaceRow
                href={myWorksHref()}
                title={works.myWorks}
                subtitle={works.myWorksSubtitle}
                glyph="tu-espacio"
                count={summary?.myWorksCount}
              />
              <SpaceRow href={followingHref()} title={works.followingTitle} glyph="historias-que-sigo" count={summary?.followingWorksCount} />
            </div>
            <div>
              <InkButton variant="ghost" fullWidth={false} onClick={() => setConfirming(true)}>
                {copy.signOut}
              </InkButton>
            </div>
          </div>
        }
      />
      <InkDialog open={confirming} onClose={() => setConfirming(false)} title={copy.signOutTitle} body={copy.signOutBody}>
        <InkButton variant="secondary" onClick={() => setConfirming(false)}>
          {copy.cancel}
        </InkButton>
        <InkButton variant="destructive" busy={leaving} onClick={() => void leave()}>
          {copy.signOutConfirm}
        </InkButton>
      </InkDialog>
    </>
  );
}

export default function MePage() {
  return (
    <SessionPage context="arena" width="wide">
      <RequireSession>
        <MeView />
      </RequireSession>
    </SessionPage>
  );
}

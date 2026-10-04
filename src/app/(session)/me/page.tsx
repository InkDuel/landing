'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { InkButton } from '@/components/ink/ink-button';
import { InkDialog } from '@/components/ink/ink-dialog';
import { LevelBar, ProfileIdentity, ProfileStats, RankCard } from '@/components/session/profile-parts';
import { RequireSession, SessionPage } from '@/components/session/session-page';
import { useSessionLocale } from '@/components/session/session-root';
import { useSession } from '@/lib/session/auth-context';
import { SESSION_COPY } from '@/lib/session/copy';

// Your profile (11, own): identity → rank card with the pencil → level →
// stats. «Tu espacio», Círculo de tinta, Marcas and the history are not part
// of phase 1. Signing out lives in Ajustes in the app; the web has no
// Ajustes, so it closes the profile, behind the same simple dialog (18).

function MeView() {
  const { user, signOut } = useSession();
  const { locale } = useSessionLocale();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const copy = SESSION_COPY[locale].profile;
  if (!user) return null;

  async function leave() {
    setLeaving(true);
    await signOut();
    router.replace('/');
  }

  return (
    <div className="flex flex-col gap-6 pt-4">
      <ProfileIdentity user={user} locale={locale} />
      <RankCard user={user} locale={locale} own />
      <LevelBar user={user} locale={locale} />
      <ProfileStats user={user} locale={locale} own />
      <div className="pt-4">
        <InkButton variant="ghost" fullWidth={false} onClick={() => setConfirming(true)}>
          {copy.signOut}
        </InkButton>
      </div>
      <InkDialog open={confirming} onClose={() => setConfirming(false)} title={copy.signOutTitle} body={copy.signOutBody}>
        <InkButton variant="secondary" onClick={() => setConfirming(false)}>
          {copy.cancel}
        </InkButton>
        <InkButton variant="destructive" busy={leaving} onClick={() => void leave()}>
          {copy.signOutConfirm}
        </InkButton>
      </InkDialog>
    </div>
  );
}

export default function MePage() {
  return (
    <SessionPage context="arena">
      <RequireSession>
        <MeView />
      </RequireSession>
    </SessionPage>
  );
}

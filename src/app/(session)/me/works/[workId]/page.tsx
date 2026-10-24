'use client';

import { useParams } from 'next/navigation';

import { RequireSession, SessionPage } from '@/components/session/session-page';
import { StudioRoot } from '@/components/session/studio/studio-root';
import { decodeParam } from '@/lib/session/api';

export default function WorkManagePage() {
  const params = useParams<{ workId: string }>();
  return (
    <SessionPage context="product" width="studio">
      <RequireSession>
        {/* Studio when it is on for this author; the existing Works page otherwise. */}
        <StudioRoot workId={decodeParam(params.workId)} />
      </RequireSession>
    </SessionPage>
  );
}

'use client';

import { useParams } from 'next/navigation';
import { DuelResult } from '@/components/session/duel-result';
import { RequireSession, SessionPage } from '@/components/session/session-page';
import { decodeParam } from '@/lib/session/api';
export default function DuelResultPage() {
  const params = useParams<{ duelId: string }>();
  return (
    <SessionPage context="arena" width="wide">
      <RequireSession>
        <DuelResult duelId={decodeParam(params.duelId)} />
      </RequireSession>
    </SessionPage>
  );
}

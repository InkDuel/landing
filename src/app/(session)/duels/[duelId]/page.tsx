'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { DuelResult } from '@/components/session/duel-result';
import { RequireSession, SessionPage } from '@/components/session/session-page';
import { decodeParam } from '@/lib/session/api';

function View() {
  const params = useParams<{ duelId: string }>();
  const search = useSearchParams();
  // A reply in «Marcas recibidas» opens here: ?story= picks the relato, ?comment= the thread.
  const storyId = search.get('story');
  return (
    <DuelResult
      duelId={decodeParam(params.duelId)}
      focus={storyId ? { storyId, commentId: search.get('comment') } : null}
    />
  );
}

export default function DuelResultPage() {
  return (
    <SessionPage context="arena" width="wide">
      <RequireSession>
        <Suspense>
          <View />
        </Suspense>
      </RequireSession>
    </SessionPage>
  );
}

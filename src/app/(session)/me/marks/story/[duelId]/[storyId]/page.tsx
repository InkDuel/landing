'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { ReceivedStoryView } from '@/components/session/received-story';
import { RequireSession, SessionPage } from '@/components/session/session-page';
import { decodeParam } from '@/lib/session/api';

function View() {
  const params = useParams<{ duelId: string; storyId: string }>();
  const search = useSearchParams();
  return (
    <ReceivedStoryView
      duelId={decodeParam(params.duelId)}
      storyId={decodeParam(params.storyId)}
      commentId={search.get('comment')}
    />
  );
}

export default function ReceivedStoryPage() {
  return (
    <SessionPage context="reading" width="reading">
      <RequireSession>
        <Suspense>
          <View />
        </Suspense>
      </RequireSession>
    </SessionPage>
  );
}

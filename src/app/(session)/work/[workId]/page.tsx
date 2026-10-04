'use client';

import { useParams } from 'next/navigation';

import { ReaderView } from '@/components/session/reader';
import { RequireSession, SessionPage } from '@/components/session/session-page';
import { decodeParam } from '@/lib/session/api';

/** A work opens at its first published chapter, as in the app. */
export default function WorkPage() {
  const params = useParams<{ workId: string }>();
  return (
    <SessionPage context="reading" width="reading">
      <RequireSession>
        <ReaderView workId={decodeParam(params.workId)} chapterId={null} />
      </RequireSession>
    </SessionPage>
  );
}

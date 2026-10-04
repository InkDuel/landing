'use client';

import { useParams } from 'next/navigation';

import { ReaderView } from '@/components/session/reader';
import { RequireSession, SessionPage } from '@/components/session/session-page';
import { decodeParam } from '@/lib/session/api';

/** Same path as the app's deep link /work/{workId}/chapter/{chapterId}. */
export default function ChapterPage() {
  const params = useParams<{ workId: string; chapterId: string }>();
  return (
    <SessionPage context="reading" width="reading">
      <RequireSession>
        <ReaderView workId={decodeParam(params.workId)} chapterId={decodeParam(params.chapterId)} />
      </RequireSession>
    </SessionPage>
  );
}

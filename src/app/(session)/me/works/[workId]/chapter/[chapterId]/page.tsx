'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';

import { ChapterEditor } from '@/components/session/chapter-editor';
import { RequireSession, SessionPage } from '@/components/session/session-page';
import { decodeParam } from '@/lib/session/api';

/**
 * Chapter editor. «new» starts a chapter that is created on its first save;
 * the URL then switches to the real id without remounting the editor.
 */
export default function ChapterEditorPage() {
  const params = useParams<{ workId: string; chapterId: string }>();
  // Pinned on mount: the URL change after a create must not reset the editor.
  const [ids] = useState(() => ({ workId: decodeParam(params.workId), chapterId: decodeParam(params.chapterId) }));
  return (
    <SessionPage context="reading" width="reading">
      <RequireSession>
        <ChapterEditor workId={ids.workId} chapterId={ids.chapterId} />
      </RequireSession>
    </SessionPage>
  );
}

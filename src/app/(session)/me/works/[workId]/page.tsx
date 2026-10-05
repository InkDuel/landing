'use client';

import { useParams } from 'next/navigation';

import { RequireSession, SessionPage } from '@/components/session/session-page';
import { WorkManageView } from '@/components/session/work-manage';
import { decodeParam } from '@/lib/session/api';

export default function WorkManagePage() {
  const params = useParams<{ workId: string }>();
  return (
    <SessionPage context="product" width="wide">
      <RequireSession>
        <WorkManageView workId={decodeParam(params.workId)} />
      </RequireSession>
    </SessionPage>
  );
}

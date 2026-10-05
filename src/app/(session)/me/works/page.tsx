'use client';

import { MyWorksView } from '@/components/session/my-works';
import { RequireSession, SessionPage } from '@/components/session/session-page';

export default function MyWorksPage() {
  return (
    <SessionPage context="product" width="wide">
      <RequireSession>
        <MyWorksView />
      </RequireSession>
    </SessionPage>
  );
}

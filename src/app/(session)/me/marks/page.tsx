'use client';

import { BackLink } from '@/components/legal/legal-page';
import { ReceivedMarksView } from '@/components/session/received-marks';
import { RequireSession, SessionPage } from '@/components/session/session-page';
import { useSessionLocale } from '@/components/session/session-root';
import { SESSION_COPY } from '@/lib/session/copy';

function MarksPage() {
  const { locale } = useSessionLocale();
  return (
    <>
      <div className="mx-auto w-full max-w-[680px]">
        <BackLink href="/me" label={SESSION_COPY[locale].nav.profile} />
      </div>
      <ReceivedMarksView />
    </>
  );
}

export default function ReceivedMarksPage() {
  return (
    <SessionPage context="product" width="wide">
      <RequireSession>
        <MarksPage />
      </RequireSession>
    </SessionPage>
  );
}

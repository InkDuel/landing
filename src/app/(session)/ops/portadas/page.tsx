'use client';

import { CoverReviewQueue } from '@/components/session/cover-review-queue';
import { RequireSession, SessionPage } from '@/components/session/session-page';

// Operator only (the backend answers 404 to everyone else). Not linked from
// anywhere: the Discord notice points here.
export default function CoverReviewPage() {
  return (
    <SessionPage context="product" width="wide">
      <RequireSession>
        <CoverReviewQueue />
      </RequireSession>
    </SessionPage>
  );
}

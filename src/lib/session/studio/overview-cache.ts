import type { Locale } from '@/lib/i18n';

import { studioApi } from './api';
import type { StudioOverview } from './models';

// One overview request serves the chapter-route redirect and the page that
// follows it. The response belongs to the account whose token fetched it, so
// the entry is keyed by uid as well as work, and any auth change drops it: an
// account that signs in right after another never gets the previous one's
// manuscript, even within the reuse window.

const REUSE_MS = 5_000;

let recent: { uid: string; workId: string; at: number; promise: Promise<StudioOverview> } | null = null;

export function loadOverview(uid: string, workId: string, locale: Locale, fresh = false): Promise<StudioOverview> {
  if (!fresh && recent && recent.uid === uid && recent.workId === workId && Date.now() - recent.at < REUSE_MS) return recent.promise;
  const promise = studioApi.overview(workId, { locale });
  recent = { uid, workId, at: Date.now(), promise };
  promise.catch(() => {
    if (recent?.promise === promise) recent = null;
  });
  return promise;
}

/** Called on sign-out and on every Firebase auth change. */
export function clearOverviewCache() {
  recent = null;
}

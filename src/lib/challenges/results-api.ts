import 'server-only';

import type { Locale } from '@/lib/i18n';

import { classifyResultsResponse, type ResultsOutcome } from './results';

const API_BASE = 'https://inkduel-backend-production.up.railway.app';

/**
 * The backend reads `?lang=` on this public route (falling back to
 * Accept-Language). The language goes in the URL, which is also Next's data
 * cache key, so each locale gets its own cache entry.
 */
export function publicResultsUrl(slug: string, locale: Locale): string {
  return `${API_BASE}/public/challenges/${encodeURIComponent(slug)}/results?lang=${locale}`;
}

export async function fetchPublicChallengeResults(slug: string, locale: Locale): Promise<ResultsOutcome> {
  try {
    const res = await fetch(publicResultsUrl(slug, locale), { next: { revalidate: 60 } });
    const body: unknown = await res.json().catch(() => null);
    return classifyResultsResponse(res.status, body);
  } catch {
    return { kind: 'not_found' };
  }
}

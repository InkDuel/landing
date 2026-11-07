import 'server-only';

import { classifyResultsResponse, type ResultsOutcome } from './results';

const API_BASE = 'https://inkduel-backend-production.up.railway.app';

export async function fetchPublicChallengeResults(slug: string): Promise<ResultsOutcome> {
  try {
    const res = await fetch(`${API_BASE}/public/challenges/${encodeURIComponent(slug)}/results`, {
      next: { revalidate: 60 },
    });
    const body: unknown = await res.json().catch(() => null);
    return classifyResultsResponse(res.status, body);
  } catch {
    return { kind: 'not_found' };
  }
}

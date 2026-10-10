'use client';

import type { Locale } from '@/lib/i18n';
import { ApiError, apiGet, apiPath, apiRequest } from './api';
import type { Page } from './models';

const record = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const number = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const date = (v: unknown) => (str(v) && Number.isFinite(Date.parse(str(v))) ? str(v) : '');
export type DuelPlayer = { id: string; username: string; rankTier: string };
const player = (v: unknown): DuelPlayer | null => {
  const d = record(v);
  return str(d.id) ? { id: str(d.id), username: str(d.username), rankTier: str(d.rankTier) } : null;
};
function activePlayer(participant: unknown, summary: unknown): DuelPlayer | null {
  const user = player(participant),
    visible = record(summary);
  return user ? { id: user.id, username: str(visible.username) || user.username, rankTier: str(visible.rankTier) || user.rankTier } : null;
}
export type ActiveDuel = {
  id: string;
  state: string;
  prompt: string;
  writingStartedAt: string;
  writingEndsAt: string;
  userHasSubmitted: boolean;
  kind: string;
  mode: string;
  userA: DuelPlayer | null;
  userB: DuelPlayer | null;
};
export function parseActiveDuel(value: unknown, id = ''): ActiveDuel {
  const d = record(value);
  const result = {
    id: str(d.duelId) || str(d.id) || id,
    state: str(d.state),
    prompt: str(d.prompt) || str(d.promptText),
    writingStartedAt: date(d.writingStartedAt),
    writingEndsAt: date(d.writingEndsAt) || date(d.finishAt),
    userHasSubmitted: d.userHasSubmitted === true,
    kind: str(d.kind),
    mode: str(d.mode),
    userA: activePlayer(d.userA, d.playerA),
    userB: activePlayer(d.userB, d.playerB),
  };
  if (!result.id || !['waiting_for_opponent', 'writing', 'evaluating', 'finished', 'cancelled'].includes(result.state))
    throw new ApiError(200, 'parse');
  if (result.state === 'writing' && (!result.prompt || !result.writingEndsAt)) throw new ApiError(200, 'parse');
  return result;
}
export type RankedDraft = { id: string; prompt: string; writingStartedAt: string; writingEndsAt: string };
export function parseRankedDraft(value: unknown): RankedDraft | null {
  if (value === null) return null;
  const d = record(value);
  const result = {
    id: str(d.draftId),
    prompt: str(record(d.prompt).text),
    writingStartedAt: date(d.writingStartedAt),
    writingEndsAt: date(d.writingEndsAt),
  };
  if (!result.id || !result.prompt || !result.writingStartedAt || !result.writingEndsAt) throw new ApiError(200, 'parse');
  return result;
}
export type DuelSummary = {
  id: string;
  prompt: string;
  createdAt: string;
  status: string;
  outcome: string;
  kind: string;
  isRanked: boolean;
  userA: DuelPlayer | null;
  userB: DuelPlayer | null;
  scoreMine: number | null;
  scoreOther: number | null;
  rankPointsDelta: number | null;
  writerXpDelta: number | null;
};
export function parseDuelHistory(value: unknown): Page<DuelSummary> {
  const d = record(value);
  if (!Array.isArray(d.duels)) throw new ApiError(200, 'parse');
  return {
    items: d.duels
      .map((v) => {
        const row = record(v);
        return {
          id: str(row.id),
          prompt: str(row.prompt),
          createdAt: date(row.createdAt),
          status: str(row.status),
          outcome: str(row.outcome),
          kind: str(row.kind),
          isRanked: row.isRanked === true,
          userA: player(row.userA),
          userB: player(row.rivalSourceSprintAuthor) || player(row.userB),
          scoreMine: number(row.scoreMine),
          scoreOther: number(row.scoreOther),
          rankPointsDelta: number(record(row.rankDelta).rankPointsDelta),
          writerXpDelta: number(record(row.progressDelta).writerXpDelta),
        };
      })
      .filter((row) => row.id),
    nextCursor: str(d.cursor) || null,
  };
}
export type DuelDetail = {
  id: string;
  prompt: string;
  createdAt: string;
  userA: DuelPlayer;
  userB: DuelPlayer | null;
  storyA: string;
  storyB: string;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string;
  reason: string;
  feedback: string;
  rankPointsDelta: number | null;
  writerXpDelta: number | null;
};
export function parseDuelDetail(value: unknown): DuelDetail {
  const d = record(value),
    userA = player(d.userA);
  if (!str(d.id) || !userA) throw new ApiError(200, 'parse');
  return {
    id: str(d.id),
    prompt: str(d.prompt),
    createdAt: date(d.createdAt),
    userA,
    userB: player(d.userB),
    storyA: str(record(d.storyA).text),
    storyB: str(record(d.storyB).text),
    scoreA: number(d.scoreA),
    scoreB: number(d.scoreB),
    winnerId: str(d.winnerId),
    reason: str(d.reason),
    feedback: str(d.feedback),
    rankPointsDelta: number(record(d.rankDelta).rankPointsDelta),
    writerXpDelta: number(record(d.progressDelta).writerXpDelta),
  };
}
export type QueuedRanked = { id: string; status: string; createdAt: string; expiresAt: string };
export function parseQueued(value: unknown): QueuedRanked[] {
  const d = record(value);
  if (!Array.isArray(d.submissions)) throw new ApiError(200, 'parse');
  return d.submissions
    .map((v) => {
      const row = record(v);
      return { id: str(row.submissionId), status: str(row.status), createdAt: date(row.createdAt), expiresAt: date(row.expiresAt) };
    })
    .filter((row) => row.id);
}

// SubmitStory uses Go bytes; Ranked Async uses Unicode runes. Keep both contracts.
export function storyLength(story: string, async: boolean): number {
  return async ? Array.from(story).length : new TextEncoder().encode(story).length;
}
export function validStory(story: string, async: boolean): boolean {
  const length = storyLength(story, async);
  return story.replace(/\s/g, '').length >= 50 && length >= 50 && length <= 5000;
}
export function secondsLeft(endsAt: string, now = Date.now()): number {
  return Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 1000) || 0);
}
export function duelErrorCode(error: unknown): string {
  if (!(error instanceof ApiError)) return '';
  return str(record(error.data).error);
}
const errorCodes = [
  'ranked_async_disabled',
  'ranked_async_unavailable_language',
  'ranked_async_draft_in_progress',
  'invalid_client_request_id',
  'max_open_ranked_async',
  'insufficient_energy',
  'story_too_short',
  'story_too_long',
  'matchmaking_conflict_retry',
  'no_live_waiting',
  'ranked_async_active',
  'ranked_async_active_match',
  'draft_deadline_passed',
  'draft_not_found',
];
const path = (id: string, action?: string) => apiPath('api', 'duel', id, ...(action ? [action] : []));
export const duelsApi = {
  async pending(locale: Locale): Promise<ActiveDuel | null> {
    try {
      return parseActiveDuel(await apiGet('/api/duel/pending', { locale }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  async activeDraft(locale: Locale) {
    return parseRankedDraft(record(await apiGet('/api/ranked-async/active-draft', { locale })).draft);
  },
  async create(locale: Locale) {
    return parseActiveDuel(await apiRequest('POST', '/api/duel', { locale }));
  },
  async status(id: string, locale: Locale) {
    return parseActiveDuel(await apiGet(path(id, 'status'), { locale }), id);
  },
  async heartbeat(id: string, locale: Locale) {
    return parseActiveDuel(await apiRequest('POST', path(id, 'heartbeat'), { locale }));
  },
  async cancel(id: string, locale: Locale) {
    const cancelled = record(await apiRequest('DELETE', path(id), { locale })).cancelled;
    if (typeof cancelled !== 'boolean') throw new ApiError(200, 'parse');
    return cancelled;
  },
  async forfeit(id: string, locale: Locale) {
    await apiRequest('POST', path(id, 'forfeit'), { locale });
  },
  async submit(id: string, story: string, locale: Locale) {
    await apiRequest('POST', path(id, 'story'), { locale, body: { story } });
  },
  async submitDraft(id: string, story: string, locale: Locale) {
    const d = record(
      await apiRequest('POST', apiPath('api', 'ranked-async', 'drafts', id, 'story'), { locale, errorCodes, body: { story } }),
    );
    if (!str(d.submissionId)) throw new ApiError(200, 'parse');
    return str(d.submissionId);
  },
  async drain(locale: Locale): Promise<ActiveDuel | null> {
    const d = record(await apiRequest('POST', '/api/ranked-async/drain', { locale, errorCodes }));
    if (str(d.duelId)) return parseActiveDuel(d);
    if (d.matched !== false) throw new ApiError(200, 'parse');
    return null;
  },
  async prepare(clientRequestId: string, locale: Locale) {
    const d = record(await apiRequest('POST', '/api/ranked-async/prepare', { locale, errorCodes, body: { clientRequestId } }));
    if (str(d.duelId)) return { duel: parseActiveDuel(d), draft: null };
    const draft = parseRankedDraft(d.draft);
    if (!draft) throw new ApiError(200, 'parse');
    return { duel: null, draft };
  },
  async queued(locale: Locale) {
    return parseQueued(await apiGet('/api/ranked-async/mine', { locale }));
  },
  async history(userId: string, locale: Locale, cursor: string | null, signal?: AbortSignal) {
    return parseDuelHistory(
      await apiGet(apiPath('api', 'duel', 'user', userId), { locale, query: { cursor: cursor ?? undefined }, signal }),
    );
  },
  async detail(id: string, locale: Locale, signal?: AbortSignal) {
    return parseDuelDetail(await apiGet(path(id), { locale, signal }));
  },
};

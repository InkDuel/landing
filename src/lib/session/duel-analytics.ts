'use client';

import { type AnalyticsParams, duelProfileParams, track } from '@/lib/analytics';

import type { ActiveDuel } from './duels';

// Duel events shaped like the app's duel_cubit (inkduel_mobile). duel_mode and
// opponent_type port DuelAnalyticsMapper; is_first_duel and rank_tier come
// from the signed-in profile, as the app derives them (wins + losses).

export function duelMode(duel: Pick<ActiveDuel, 'kind' | 'mode' | 'isAIInvolved'>): string {
  if (duel.kind === 'ai_sparring') return 'ai_practice';
  if (duel.kind === 'solo_sprint') return 'solo_sprint';
  if (duel.kind === 'friend_challenge') return 'friend_challenge';
  if (duel.isAIInvolved) return 'ai_practice';
  return duel.mode || 'ranked';
}

export function opponentType(duel: Pick<ActiveDuel, 'kind' | 'isAIInvolved'>): string {
  if (duel.kind === 'solo_sprint') return 'none';
  if (duel.kind === 'ai_sparring' || duel.isAIInvolved) return 'bot';
  return 'human';
}

/** The user pressed start on the Ranked page (the app's intro start). */
export function trackDuelSearchStarted(language: string): void {
  const { is_first_duel } = duelProfileParams();
  track('duel_search_started', { duel_mode: 'ranked', language, entry_point: 'intro_start', is_first_duel });
}

/** The analytics fields POST /api/duel/:id/story already answers. */
export type StorySubmission = {
  writingDurationSeconds: number | null;
  configuredWritingDurationSeconds: number | null;
  writingDurationBucket: string | null;
  submissionType: string | null;
};

export function parseStorySubmission(value: unknown): StorySubmission {
  const d = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const int = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : null);
  const text = (v: unknown) => (typeof v === 'string' && v ? v : null);
  return {
    writingDurationSeconds: int(d.writingDurationSeconds),
    configuredWritingDurationSeconds: int(d.configuredWritingDurationSeconds),
    writingDurationBucket: text(d.writingDurationBucket),
    submissionType: text(d.submissionType),
  };
}

/** A live duel story the backend accepted. */
export function trackStorySubmitted(duel: ActiveDuel, submission: StorySubmission): void {
  const atTimeout = submission.submissionType === 'at_timeout' || submission.writingDurationBucket === 'timeout';
  const params: AnalyticsParams = {
    duel_mode: duelMode(duel),
    opponent_type: opponentType(duel),
    finished_before_timeout: atTimeout ? 'no' : 'yes',
    writing_duration_seconds: submission.writingDurationSeconds,
    configured_writing_duration_seconds: submission.configuredWritingDurationSeconds,
    writing_duration_bucket: submission.writingDurationBucket,
    submission_type: submission.submissionType,
    ...duelProfileParams(),
  };
  track('story_submitted', params);
}

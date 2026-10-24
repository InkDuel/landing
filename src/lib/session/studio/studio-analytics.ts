'use client';

import { track } from '@/lib/analytics';

import { ApiError } from '../api';

// Studio events (PRD §14). Ids and buckets only — never a title, a name, a
// note, a word of the manuscript or anything typed. They complement the Works
// funnel (work_chapter_published stays the legacy editor's event).

export type StudioEntityType = 'character' | 'place' | 'note' | 'quick_note' | 'scene' | 'relation';

export function failureReason(error: unknown): string {
  if (!(error instanceof ApiError)) return 'generic';
  if (error.kind === 'network' || error.kind === 'timeout') return 'network';
  const code = error.data && typeof error.data === 'object' && 'code' in error.data ? String(error.data.code) : '';
  if (code) return code;
  switch (error.status) {
    case 409:
      return 'conflict';
    case 429:
      return 'rate_limit';
    case 503:
      return 'unavailable';
    case 404:
      return 'not_found';
    case 400:
      return 'invalid';
    default:
      return error.status >= 500 ? 'server' : 'generic';
  }
}

function durationBucket(ms: number): string {
  const min = ms / 60_000;
  if (min < 5) return 'lt_5m';
  if (min < 15) return '5_15m';
  if (min < 30) return '15_30m';
  if (min < 60) return '30_60m';
  return 'gte_60m';
}

function wordsBucket(words: number): string {
  if (words <= 0) return '0';
  if (words < 100) return '1_99';
  if (words < 500) return '100_499';
  if (words < 1000) return '500_999';
  return 'gte_1000';
}

export const studioAnalytics = {
  opened(workId: string, originType: string) {
    track('studio_opened', { work_id: workId, origin_type: originType || 'original' });
  },
  editorOpened(workId: string, documentKind: 'chapter' | 'draft', isNew: boolean) {
    track('studio_editor_opened', { work_id: workId, document_kind: documentKind, is_new: isNew });
  },
  firstTextSaved(workId: string, chapterId: string | null) {
    track('studio_first_text_saved', { work_id: workId, chapter_id: chapterId ?? undefined });
  },
  sessionCompleted(workId: string, durationMs: number, wordsAdded: number) {
    track('studio_session_completed', {
      work_id: workId,
      duration_bucket: durationBucket(durationMs),
      words_added_bucket: wordsBucket(wordsAdded),
    });
  },
  saveFailed(workId: string, error: unknown) {
    track('studio_draft_save_failed', { work_id: workId, reason: failureReason(error) });
  },
  conflict(workId: string, reason: string) {
    track('studio_draft_conflict', { work_id: workId, reason });
  },
  entityCreated(workId: string, entityType: StudioEntityType) {
    track('studio_entity_created', { work_id: workId, entity_type: entityType });
  },
  sceneCreated(workId: string) {
    track('studio_plan_scene_created', { work_id: workId });
  },
  goalSet(workId: string, goalType: 'work' | 'daily' | 'session') {
    track('studio_goal_set', { work_id: workId, goal_type: goalType });
  },
  exported(workId: string, format: string, success: boolean) {
    track('studio_exported', { work_id: workId, format, success });
  },
  publishAttempt(workId: string, chapterId: string, type: 'first_publish' | 'update') {
    track('studio_publish_attempt', { work_id: workId, chapter_id: chapterId, type });
  },
  publishCompleted(workId: string, chapterId: string, type: 'first_publish' | 'update') {
    track('studio_publish_completed', { work_id: workId, chapter_id: chapterId, type });
  },
  publishFailed(workId: string, error: unknown) {
    track('studio_publish_failed', { work_id: workId, reason: failureReason(error) });
  },
};

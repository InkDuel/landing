import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setAnalyticsUser, track } from '@/lib/analytics';

import { duelMode, opponentType, parseStorySubmission, trackDuelSearchStarted, trackStorySubmitted } from './duel-analytics';
import type { ActiveDuel } from './duels';
import { duelsApi } from './duels';
import { storyCommentsApi } from './marks';
import { type AuthorWork, worksApi } from './works';
import { ApiError } from './api';
import {
  consumeEditorSource,
  markNextEditorAuto,
  publishChapterAttempt,
  publishFailureReason,
  trackChapterPublished,
  trackEditorOpened,
  trackWorkPublished,
} from './works-analytics';

vi.mock('./firebase', () => ({ getFirebaseAuth: () => ({ currentUser: { getIdToken: async () => 'test-user-token' } }) }));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fetchMock = vi.fn<typeof fetch>();
const tracked = () => vi.mocked(track).mock.calls;
const named = (name: string) => tracked().filter(([event]) => event === name);

const work = (over: Partial<AuthorWork> = {}): AuthorWork => ({
  id: 'w1',
  title: 'Obra',
  published: false,
  isGalleryEligible: false,
  moderationState: 'active',
  chapterCount: 1,
  publishedChapterCount: 0,
  chapters: [],
  chaptersNextCursor: null,
  ...over,
});

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  vi.mocked(track).mockClear();
  setAnalyticsUser(null, false);
});
afterEach(() => vi.unstubAllGlobals());

describe('creation events follow the backend, not the HTTP success', () => {
  it('work_created only when the backend says created; a retry with the same request id is not counted', async () => {
    fetchMock.mockResolvedValueOnce(response({ created: true, work: { id: 'w1' } }, 201));
    fetchMock.mockResolvedValueOnce(response({ created: false, work: { id: 'w1' } }, 200));
    await worksApi.createOriginal('Obra', 'req-1', { locale: 'es' });
    await worksApi.createOriginal('Obra', 'req-1', { locale: 'es' });
    expect(named('work_created')).toEqual([['work_created', { work_id: 'w1' }]]);
  });

  it('continue_story_started carries created from the response', async () => {
    fetchMock.mockResolvedValueOnce(response({ created: false, work: { id: 'w2' } }));
    await worksApi.fromDuelStory('d1', 's1', { locale: 'es' });
    expect(named('continue_story_started')).toEqual([['continue_story_started', { created: false, work_id: 'w2' }]]);
  });

  it('story_comment_created on 201 only; a 200 replay is not a new comment', async () => {
    const body = { comment: { id: 'c1', content: 'texto' }, commentsCount: 1 };
    fetchMock.mockResolvedValueOnce(response(body, 201));
    fetchMock.mockResolvedValueOnce(response(body, 200));
    await storyCommentsApi.create('d1', 's1', 'req', 'texto', { locale: 'es' });
    await storyCommentsApi.create('d1', 's1', 'req', 'texto', { locale: 'es' });
    expect(named('story_comment_created')).toHaveLength(1);
    expect(JSON.stringify(tracked())).not.toContain('texto');
  });

  it('publish endpoints log nothing by themselves (replays answer like first publishes)', async () => {
    fetchMock.mockResolvedValueOnce(response({ id: 'c1', orderIndex: 2, published: true }));
    fetchMock.mockResolvedValueOnce(response({ id: 'w1', published: true }));
    await worksApi.publishChapter('w1', 'c1', { locale: 'es' });
    await worksApi.publish('w1', { locale: 'es' });
    expect(tracked()).toEqual([]);
  });
});

describe('publish transitions use the state the server last reported', () => {
  const chapter = { orderIndex: 2, workId: 'w1', chapterId: 'c1' };

  it('work_chapter_published once for a draft, never for an already published chapter', () => {
    trackChapterPublished({ ...chapter, wasPublished: true }, null);
    expect(tracked()).toEqual([]);
    trackChapterPublished(
      { ...chapter, wasPublished: false },
      { wasVisible: false, after: work({ published: true, isGalleryEligible: true }) },
    );
    expect(named('work_chapter_published')).toEqual([
      ['work_chapter_published', { order_index: 2, work_id: 'w1', chapter_id: 'c1', became_gallery_visible: true }],
    ]);
  });

  it('leaves became_gallery_visible out when the after state is unknown', () => {
    trackChapterPublished({ ...chapter, wasPublished: false }, null);
    expect(tracked()[0][1]).toMatchObject({ became_gallery_visible: null });
  });

  it('work_published only from an unpublished work, with the app params', () => {
    trackWorkPublished(work({ published: true }), work({ published: true }));
    expect(tracked()).toEqual([]);
    trackWorkPublished(work({ isGalleryEligible: false }), work({ published: true, isGalleryEligible: true }));
    expect(named('work_published')).toEqual([['work_published', { became_gallery_visible: true, work_id: 'w1' }]]);
  });
});

describe('editor opened matches the app', () => {
  it("source is 'auto' once, right after a creation, then 'manual'", () => {
    markNextEditorAuto('w1', 'new');
    expect(consumeEditorSource('w1', 'other')).toBe('manual');
    markNextEditorAuto('w1', 'new');
    expect(consumeEditorSource('w1', 'new')).toBe('auto');
    expect(consumeEditorSource('w1', 'new')).toBe('manual');
  });

  it('sends source, is_seeded_chapter, work_id and chapter_id', () => {
    trackEditorOpened({ source: 'auto', isNew: false, orderIndex: 1, workId: 'w1', chapterId: 'c1' });
    trackEditorOpened({ source: 'manual', isNew: true, orderIndex: 0, workId: 'w1', chapterId: 'c2' });
    expect(named('work_chapter_editor_opened').map(([, params]) => params)).toEqual([
      { source: 'auto', is_seeded_chapter: true, work_id: 'w1', chapter_id: 'c1' },
      { source: 'manual', is_seeded_chapter: false, work_id: 'w1', chapter_id: 'c2' },
    ]);
  });
});

describe('duel events match the app', () => {
  const duel: ActiveDuel = {
    id: 'd1',
    state: 'writing',
    prompt: 'p',
    writingStartedAt: '',
    writingEndsAt: '',
    userHasSubmitted: false,
    kind: 'ranked_human',
    mode: 'ranked',
    isAIInvolved: false,
    userA: null,
    userB: null,
  };

  it('ports DuelAnalyticsMapper', () => {
    expect(duelMode(duel)).toBe('ranked');
    expect(opponentType(duel)).toBe('human');
    expect(duelMode({ ...duel, isAIInvolved: true })).toBe('ai_practice');
    expect(opponentType({ ...duel, isAIInvolved: true })).toBe('bot');
    expect(duelMode({ ...duel, kind: 'ranked_async', mode: 'ranked_async' })).toBe('ranked_async');
    expect(duelMode({ ...duel, mode: '' })).toBe('ranked');
    expect(opponentType({ ...duel, kind: 'solo_sprint' })).toBe('none');
  });

  it('duel_search_started with the app params', () => {
    setAnalyticsUser({ id: 'u', rankTier: 'Escriba', wins: 0, losses: 0 }, false);
    trackDuelSearchStarted('es');
    expect(named('duel_search_started')).toEqual([
      ['duel_search_started', { duel_mode: 'ranked', language: 'es', entry_point: 'intro_start', is_first_duel: 'yes' }],
    ]);
  });

  it('story_submitted uses the backend submission fields', () => {
    setAnalyticsUser({ id: 'u', rankTier: 'Narrador', wins: 3, losses: 1 }, false);
    const submission = parseStorySubmission({
      success: true,
      writingDurationSeconds: 299,
      configuredWritingDurationSeconds: 300,
      writingDurationBucket: 'timeout',
      submissionType: 'at_timeout',
    });
    trackStorySubmitted(duel, submission);
    expect(named('story_submitted')).toEqual([
      [
        'story_submitted',
        {
          duel_mode: 'ranked',
          opponent_type: 'human',
          finished_before_timeout: 'no',
          writing_duration_seconds: 299,
          configured_writing_duration_seconds: 300,
          writing_duration_bucket: 'timeout',
          submission_type: 'at_timeout',
          is_first_duel: 'no',
          rank_tier: 'Narrador',
        },
      ],
    ]);
  });

  it('creating a duel logs nothing; an async draft logs ranked_async_draft_queued, not story_submitted', async () => {
    fetchMock.mockResolvedValueOnce(response({ duelId: 'd1', state: 'waiting_for_opponent' }));
    await duelsApi.create('es');
    fetchMock.mockResolvedValueOnce(response({ submissionId: 'sub-1' }));
    await duelsApi.submitDraft('draft-1', 'relato', 'es');
    expect(tracked().map(([name]) => name)).toEqual(['ranked_async_draft_queued']);
  });
});

describe('chapter publish attempts from the editor', () => {
  const chapter = { orderIndex: 3, workId: 'w1', chapterId: 'c3', wasPublished: false };
  const ids = { work_id: 'w1', chapter_id: 'c3' };

  it('success: tapped, then published', async () => {
    const publish = vi.fn().mockResolvedValue({});
    await expect(publishChapterAttempt(chapter, { flush: async () => true, publish })).resolves.toBe('published');
    expect(tracked().map(([name]) => name)).toEqual(['work_chapter_publish_tapped', 'work_chapter_published']);
    expect(tracked()[0][1]).toEqual({ order_index: 3, ...ids });
  });

  it('the save before publishing fails: tapped is still counted, then failed(save_failed); no request', async () => {
    const publish = vi.fn();
    await expect(publishChapterAttempt(chapter, { flush: async () => false, publish })).resolves.toBe('saveFailed');
    expect(publish).not.toHaveBeenCalled();
    expect(tracked()).toEqual([
      ['work_chapter_publish_tapped', { order_index: 3, ...ids }],
      ['work_publish_failed', { step: 'chapter', ...ids, reason: 'save_failed' }],
    ]);
  });

  it('the publish request fails: tapped, then failed with the app reason, error rethrown', async () => {
    const error = new ApiError(503, 'http');
    await expect(publishChapterAttempt(chapter, { flush: async () => true, publish: async () => Promise.reject(error) })).rejects.toBe(error);
    expect(tracked()).toEqual([
      ['work_chapter_publish_tapped', { order_index: 3, ...ids }],
      ['work_publish_failed', { step: 'chapter', ...ids, reason: 'unavailable' }],
    ]);
  });

  it('maps failures to the app reasons', () => {
    expect(publishFailureReason(new ApiError(409, 'http'))).toBe('conflict');
    expect(publishFailureReason(new ApiError(429, 'http'))).toBe('rate_limit');
    expect(publishFailureReason(new ApiError(404, 'http'))).toBe('not_found');
    expect(publishFailureReason(new ApiError(403, 'http'))).toBe('forbidden');
    expect(publishFailureReason(new ApiError(0, 'network'))).toBe('network');
    expect(publishFailureReason(new ApiError(0, 'timeout'))).toBe('network');
    expect(publishFailureReason(new ApiError(500, 'http'))).toBe('generic');
    expect(publishFailureReason(new Error('x'))).toBe('generic');
  });
});

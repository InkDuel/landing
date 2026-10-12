'use client';

import { track } from '@/lib/analytics';

import { ApiError } from './api';
import type { AuthorWork } from './works';

// Works funnel events, shaped like the app's (work_editor_cubit /
// chapter_editor_cubit in inkduel_mobile). They live at the UI, not in
// worksApi, because the backend answers publish replays exactly like a first
// publish: whether something changed is read from the server state the page
// loaded before the request, as the app does.

/**
 * The app's `source` of work_chapter_editor_opened: 'auto' when the editor
 * opened by itself right after a work was created, 'manual' otherwise. The
 * page that creates the work marks the next editor; a reload reads 'manual'.
 */
let autoEditor: string | null = null;

export function markNextEditorAuto(workId: string, chapterId: string): void {
  autoEditor = `${workId}/${chapterId}`;
}

export function consumeEditorSource(workId: string, chapterId: string): 'auto' | 'manual' {
  const auto = autoEditor === `${workId}/${chapterId}`;
  autoEditor = null;
  return auto ? 'auto' : 'manual';
}

export function trackEditorOpened(input: {
  source: 'auto' | 'manual';
  isNew: boolean;
  orderIndex: number;
  workId: string;
  chapterId: string;
}): void {
  track('work_chapter_editor_opened', {
    source: input.source,
    // The app's rule: only chapter 1 is ever seeded from the duel story.
    is_seeded_chapter: !input.isNew && input.orderIndex === 1,
    work_id: input.workId,
    chapter_id: input.chapterId,
  });
}

type ChapterRef = { orderIndex: number; workId: string; chapterId: string };

const chapterParams = ({ orderIndex, workId, chapterId }: ChapterRef) => ({
  order_index: orderIndex,
  work_id: workId,
  chapter_id: chapterId,
});

/**
 * The confirmed attempt (the app logs it when its confirm dialog is accepted),
 * before any save or request: tapped = published + failed for the same attempt.
 */
export function trackChapterPublishTapped(chapter: ChapterRef): void {
  track('work_chapter_publish_tapped', chapterParams(chapter));
}

/**
 * The app's work_publish_failed. Its reasons, from the HTTP failure; two are
 * web-only, for the save the web editor runs before publishing (the app does
 * not publish from its editor): 'save_failed' after the confirmation, and
 * 'save_failed_before_confirm' when the dialog could not even open (no tapped
 * precedes it).
 */
export type PublishFailureReason =
  | 'conflict'
  | 'rate_limit'
  | 'unavailable'
  | 'not_found'
  | 'forbidden'
  | 'network'
  | 'generic'
  | 'save_failed'
  | 'save_failed_before_confirm';

export function publishFailureReason(error: unknown): PublishFailureReason {
  if (!(error instanceof ApiError)) return 'generic';
  if (error.kind === 'network' || error.kind === 'timeout') return 'network';
  switch (error.status) {
    case 409:
      return 'conflict';
    case 429:
      return 'rate_limit';
    case 503:
      return 'unavailable';
    case 404:
      return 'not_found';
    case 403:
      return 'forbidden';
    default:
      return 'generic';
  }
}

export function trackPublishFailed(input: {
  step: 'chapter' | 'work';
  workId: string;
  chapterId?: string;
  reason: PublishFailureReason;
}): void {
  track('work_publish_failed', {
    step: input.step,
    work_id: input.workId,
    chapter_id: input.chapterId,
    reason: input.reason,
  });
}

/**
 * Only for a chapter the server last reported as a draft. became_gallery_visible
 * needs the work before and after; when the after state is unknown the param
 * is left out rather than guessed.
 */
export function trackChapterPublished(
  chapter: ChapterRef & { wasPublished: boolean },
  visibility: { wasVisible: boolean; after: AuthorWork | null } | null,
): void {
  if (chapter.wasPublished) return;
  track('work_chapter_published', {
    ...chapterParams(chapter),
    became_gallery_visible: visibility?.after ? !visibility.wasVisible && visibility.after.isGalleryEligible : null,
  });
}

/** Only for a work the server last reported as unpublished. */
export function trackWorkPublished(before: AuthorWork, after: AuthorWork): void {
  if (before.published) return;
  track('work_published', {
    became_gallery_visible: !before.isGalleryEligible && after.isGalleryEligible,
    work_id: after.id,
  });
}

/**
 * The web editor's confirmed publish, instrumented end to end: one tapped,
 * then exactly one of save failed, publish failed (rethrown) or published.
 */
export async function publishChapterAttempt(
  chapter: ChapterRef & { wasPublished: boolean },
  steps: { flush: () => Promise<boolean>; publish: () => Promise<unknown> },
): Promise<'published' | 'saveFailed'> {
  const { wasPublished, ...ref } = chapter;
  trackChapterPublishTapped(ref);
  if (!(await steps.flush())) {
    trackPublishFailed({ step: 'chapter', workId: ref.workId, chapterId: ref.chapterId, reason: 'save_failed' });
    return 'saveFailed';
  }
  try {
    await steps.publish();
  } catch (error) {
    trackPublishFailed({ step: 'chapter', workId: ref.workId, chapterId: ref.chapterId, reason: publishFailureReason(error) });
    throw error;
  }
  // The editor holds no fresh work, so became_gallery_visible stays unknown.
  trackChapterPublished({ ...ref, wasPublished }, null);
  return 'published';
}

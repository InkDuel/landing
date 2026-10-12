'use client';

import { track } from '@/lib/analytics';

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

/** Logged before the request: the gap to work_chapter_published is the failure rate. */
export function trackChapterPublishTapped(chapter: ChapterRef): void {
  track('work_chapter_publish_tapped', chapterParams(chapter));
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

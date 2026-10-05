'use client';

import type { Locale } from '@/lib/i18n';

import { apiPath, apiRequest } from './api';
import type { Page } from './models';

// Authoring of Obras (phase 2): the author-side contract of
// inkduel-backend/internal/controllers/works_controller.go. The backend is
// the authority; the limits below only spare the user an invalid request.

/** internal/models/work_limits.go — counted in Unicode code points (Go runes). */
export const WORK_LIMITS = {
  workTitle: 120,
  chapterTitle: 120,
  chapterContent: 5000,
} as const;

/** Length as the backend counts it ([]rune), not UTF-16 units. */
export function runeLength(value: string): number {
  return Array.from(value).length;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const bool = (value: unknown): boolean => value === true;
const count = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const cursor = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);

/** ChapterAuthorDTO: the author's view, drafts included, with the revision. */
export type AuthorChapter = {
  id: string;
  title: string;
  content: string;
  orderIndex: number;
  revision: number;
  published: boolean;
};

export function parseAuthorChapter(data: unknown): AuthorChapter | null {
  if (!isRecord(data) || !str(data.id)) return null;
  return {
    id: str(data.id),
    title: str(data.title),
    content: str(data.content),
    orderIndex: count(data.orderIndex),
    revision: count(data.revision),
    published: bool(data.published),
  };
}

/** WorkAuthorDTO. */
export type AuthorWork = {
  id: string;
  title: string;
  published: boolean;
  isGalleryEligible: boolean;
  moderationState: string;
  chapterCount: number;
  publishedChapterCount: number;
  chapters: AuthorChapter[];
  chaptersNextCursor: string | null;
};

export function parseAuthorWork(data: unknown): AuthorWork | null {
  if (!isRecord(data) || !str(data.id)) return null;
  return {
    id: str(data.id),
    title: str(data.title),
    published: bool(data.published),
    isGalleryEligible: bool(data.isGalleryEligible),
    moderationState: str(data.moderationState) || 'active',
    chapterCount: count(data.chapterCount),
    publishedChapterCount: count(data.publishedChapterCount),
    chapters: list(data.chapters)
      .map(parseAuthorChapter)
      .filter((chapter): chapter is AuthorChapter => chapter !== null),
    chaptersNextCursor: cursor(data.chaptersNextCursor),
  };
}

/** MyWorkSummaryDTO. */
export type MyWork = {
  id: string;
  title: string;
  published: boolean;
  isGalleryEligible: boolean;
  chapterCount: number;
  publishedChapterCount: number;
  followerCount: number;
  updatedAt: string;
};

function parseMyWorks(data: unknown): Page<MyWork> {
  if (!isRecord(data)) return { items: [], nextCursor: null };
  const items = list(data.items)
    .filter(isRecord)
    .map((item) => ({
      id: str(item.id),
      title: str(item.title),
      published: bool(item.published),
      isGalleryEligible: bool(item.isGalleryEligible),
      chapterCount: count(item.chapterCount),
      publishedChapterCount: count(item.publishedChapterCount),
      followerCount: count(item.followerCount),
      updatedAt: str(item.updatedAt),
    }))
    .filter((item) => item.id);
  return { items, nextCursor: cursor(data.nextCursor) };
}

function requireWork(data: unknown): AuthorWork {
  const work = parseAuthorWork(isRecord(data) && 'work' in data ? data.work : data);
  if (!work) throw new Error('invalid work');
  return work;
}

function requireChapter(data: unknown): AuthorChapter {
  const chapter = parseAuthorChapter(data);
  if (!chapter) throw new Error('invalid chapter');
  return chapter;
}

/** UUID v4, lowercase: the backend only accepts the canonical form. */
export function newClientId(): string {
  return crypto.randomUUID().toLowerCase();
}

export type MyWorksFilter = 'all' | 'drafts' | 'published';

type Ctx = { locale: Locale; signal?: AbortSignal };

export const worksApi = {
  async listMine(filter: MyWorksFilter, pageCursor: string | null, { locale, signal }: Ctx) {
    return parseMyWorks(
      await apiRequest('GET', '/api/works/mine', { locale, signal, query: { status: filter, cursor: pageCursor ?? undefined } }),
    );
  },

  /** Idempotent for the same clientRequestId and title. */
  async createOriginal(title: string, clientRequestId: string, { locale }: Ctx) {
    return requireWork(await apiRequest('POST', '/api/works', { locale, body: { title, clientRequestId } }));
  },

  async get(workId: string, { locale, signal }: Ctx) {
    return requireWork(await apiRequest('GET', apiPath('api', 'works', workId), { locale, signal }));
  },

  async chapters(workId: string, pageCursor: string | null, { locale, signal }: Ctx): Promise<Page<AuthorChapter>> {
    const data = await apiRequest('GET', apiPath('api', 'works', workId, 'chapters'), {
      locale,
      signal,
      query: { cursor: pageCursor ?? undefined },
    });
    const items = isRecord(data)
      ? list(data.items).map(parseAuthorChapter).filter((c): c is AuthorChapter => c !== null)
      : [];
    return { items, nextCursor: isRecord(data) ? cursor(data.nextCursor) : null };
  },

  async chapter(workId: string, chapterId: string, { locale, signal }: Ctx) {
    return requireChapter(await apiRequest('GET', apiPath('api', 'works', workId, 'chapters', chapterId), { locale, signal }));
  },

  /** Title may be empty (a deliberate clear), never absent. */
  async updateTitle(workId: string, title: string, { locale }: Ctx) {
    return requireWork(await apiRequest('PATCH', apiPath('api', 'works', workId), { locale, body: { title } }));
  },

  async publish(workId: string, { locale }: Ctx) {
    return requireWork(await apiRequest('PUT', apiPath('api', 'works', workId, 'publish'), { locale }));
  },

  async unpublish(workId: string, { locale }: Ctx) {
    return requireWork(await apiRequest('PUT', apiPath('api', 'works', workId, 'unpublish'), { locale }));
  },

  /** Create-on-first-save: idempotent for the same chapterId and payload. */
  async addChapter(workId: string, chapterId: string, content: string, title: string, { locale }: Ctx) {
    return requireChapter(
      await apiRequest('POST', apiPath('api', 'works', workId, 'chapters'), {
        locale,
        body: { chapterId, content, title, clientRequestId: chapterId },
      }),
    );
  },

  /** Autosave with optimistic concurrency; a 409 carries the server snapshot. */
  async patchChapter(
    workId: string,
    chapterId: string,
    content: string,
    title: string,
    expectedRevision: number,
    { locale, keepalive }: Ctx & { keepalive?: boolean },
  ) {
    return requireChapter(
      await apiRequest('PATCH', apiPath('api', 'works', workId, 'chapters', chapterId), {
        locale,
        keepalive,
        body: { content, title, expectedRevision },
      }),
    );
  },

  /** One-way and idempotent; publishes what the server holds. */
  async publishChapter(workId: string, chapterId: string, { locale }: Ctx) {
    return requireChapter(await apiRequest('PUT', apiPath('api', 'works', workId, 'chapters', chapterId, 'publish'), { locale }));
  },

  /** Drafts only: a published chapter answers 409. */
  async deleteChapter(workId: string, chapterId: string, { locale }: Ctx) {
    await apiRequest('DELETE', apiPath('api', 'works', workId, 'chapters', chapterId), { locale });
  },
};

/** The 409 snapshot of a revision conflict, read defensively. */
export function conflictSnapshot(data: unknown): { revision: number; content: string; title: string } | null {
  if (!isRecord(data) || typeof data.currentRevision !== 'number') return null;
  return { revision: count(data.currentRevision), content: str(data.currentContent), title: str(data.currentTitle) };
}

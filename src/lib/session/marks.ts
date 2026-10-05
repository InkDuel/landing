'use client';

import type { Locale } from '@/lib/i18n';

import { ApiError, apiPath, apiRequest } from './api';
import type { Page } from './models';

// Marcas (phase 3): the reader side of two existing contracts.
// - Relatos de duelo: inkduel-backend/internal/controllers/gallery_comment_controller.go
//   (one level, no replies).
// - Capítulos: internal/controllers/work_ink_mark_controller.go (roots plus
//   one level of replies, tombstones).
// The backend is the authority on every permission (canComment, canMark,
// canDelete) and on availability (its kill switches answer 503). Text is
// always rendered as text.

/** internal/services/gallery_comment_contract.go, shared by both surfaces. */
export const MARK_LIMITS = { min: 3, max: 500 } as const;

export const REPORT_REASONS = ['spam', 'harassment', 'hate', 'sexual', 'violence', 'self_harm', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** The text as the backend stores it: CRLF folded, trimmed. */
export function normalizeMarkDraft(text: string): string {
  return text.replace(/\r\n?/g, '\n').trim();
}

/** Length in Unicode code points (Go runes) of the normalized text. */
export function markLength(text: string): number {
  return Array.from(normalizeMarkDraft(text)).length;
}

export function isValidMarkDraft(text: string): boolean {
  const length = markLength(text);
  return length >= MARK_LIMITS.min && length <= MARK_LIMITS.max;
}

// ---- failures ----

export type MarkFailure =
  | 'invalid'
  | 'session'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'rateLimited'
  | 'unavailable'
  | 'network'
  | 'generic';

/** gallery_comments_cubit.dart _mapFailure: a status, never backend text. */
export function markFailure(error: unknown): MarkFailure {
  if (!(error instanceof ApiError)) return 'generic';
  if (error.kind === 'network' || error.kind === 'timeout') return 'network';
  if (error.kind === 'signedOut') return 'session';
  switch (error.status) {
    case 400:
      return 'invalid';
    case 401:
      return 'session';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 409:
      return 'conflict';
    case 429:
      return 'rateLimited';
    case 503:
      return 'unavailable';
    default:
      return 'generic';
  }
}

// ---- parsing ----

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const bool = (value: unknown): boolean => value === true;
const count = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const cursor = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);
/** An ISO timestamp the browser can order, or '' when it cannot. */
const timestamp = (value: unknown): string => {
  const raw = str(value);
  return raw && !Number.isNaN(Date.parse(raw)) ? raw : '';
};

export type MarkAuthor = { userId: string; displayName: string };

function parseAuthor(data: unknown): MarkAuthor {
  // The avatar is not read: the web draws no remote images for Marcas.
  return isRecord(data) ? { userId: str(data.userId), displayName: str(data.displayName).trim() } : { userId: '', displayName: '' };
}

// Relatos de duelo

export type StoryComment = {
  id: string;
  author: MarkAuthor;
  content: string;
  createdAt: string;
  canDelete: boolean;
};

export type StoryCommentsPage = Page<StoryComment> & { commentsCount: number; canComment: boolean };

function parseStoryComment(data: unknown): StoryComment | null {
  if (!isRecord(data) || !str(data.id)) return null;
  return {
    id: str(data.id),
    author: parseAuthor(data.author),
    content: str(data.content),
    createdAt: timestamp(data.createdAt),
    canDelete: bool(data.canDelete),
  };
}

function requireStoryComment(data: unknown): StoryComment {
  const comment = parseStoryComment(data);
  if (!comment) throw new ApiError(200, 'parse');
  return comment;
}

// Capítulos

export type ChapterMarksSummary = { markCount: number; rootCount: number; canMark: boolean };

export type InkMarkRoot = {
  id: string;
  /** Null on a tombstone: deleted text never travels. */
  author: MarkAuthor | null;
  content: string;
  createdAt: string;
  isAuthor: boolean;
  isDeleted: boolean;
  replyCount: number;
  canDelete: boolean;
};

export type InkMarkReply = {
  id: string;
  author: MarkAuthor;
  content: string;
  createdAt: string;
  isAuthor: boolean;
  /** The parent's display name when the parent is not the root. */
  replyingTo: string;
  canDelete: boolean;
};

export type InkMarkRootsPage = Page<InkMarkRoot> & ChapterMarksSummary;
export type InkMarkRepliesPage = Page<InkMarkReply> & { replyCount: number };

function parseSummary(data: Record<string, unknown>): ChapterMarksSummary {
  return { markCount: count(data.markCount), rootCount: count(data.rootCount), canMark: bool(data.canMark) };
}

function parseRoot(data: unknown): InkMarkRoot | null {
  if (!isRecord(data) || !str(data.id)) return null;
  const isDeleted = bool(data.isDeleted);
  return {
    id: str(data.id),
    author: isDeleted || !isRecord(data.author) ? null : parseAuthor(data.author),
    content: isDeleted ? '' : str(data.content),
    createdAt: timestamp(data.createdAt),
    isAuthor: bool(data.isAuthor),
    isDeleted,
    replyCount: count(data.replyCount),
    canDelete: !isDeleted && bool(data.canDelete),
  };
}

function parseReply(data: unknown): InkMarkReply | null {
  if (!isRecord(data) || !str(data.id)) return null;
  return {
    id: str(data.id),
    author: parseAuthor(data.author),
    content: str(data.content),
    createdAt: timestamp(data.createdAt),
    isAuthor: bool(data.isAuthor),
    replyingTo: str(data.replyingTo).trim(),
    canDelete: bool(data.canDelete),
  };
}

const present = <T>(item: T | null): item is T => item !== null;

const byCreatedAt = (value: string) => {
  const time = Date.parse(value);
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

/**
 * The one way a thread's replies are combined, whatever arrived and in which
 * order (first page, next page, a reply just created, a replay): dedupe by
 * id — the later copy wins, it is the fresher one — then the backend's own
 * order, createdAt ascending with the id as tie-break.
 */
export function mergeReplies(...lists: InkMarkReply[][]): InkMarkReply[] {
  const byId = new Map<string, InkMarkReply>();
  for (const list of lists) for (const reply of list) byId.set(reply.id, reply);
  return [...byId.values()].sort(
    (a, b) => byCreatedAt(a.createdAt) - byCreatedAt(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

// Bandeja «Marcas recibidas»

export type ReceivedMark =
  | {
      source: 'duelStory';
      id: string;
      author: MarkAuthor;
      content: string;
      createdAt: string;
      duelId: string;
      storyId: string;
      prompt: string;
    }
  | {
      source: 'workChapter';
      id: string;
      author: MarkAuthor;
      content: string;
      createdAt: string;
      workId: string;
      workTitle: string;
      chapterId: string;
      chapterOrderIndex: number;
      chapterTitle: string;
      rootId: string;
    };

function parseReceivedStoryComments(data: unknown): Page<ReceivedMark> {
  if (!isRecord(data)) return { items: [], nextCursor: null };
  const items: ReceivedMark[] = [];
  for (const row of list(data.items)) {
    if (!isRecord(row) || !isRecord(row.story)) continue;
    const comment = parseStoryComment(row.comment);
    const duelId = str(row.story.duelId);
    const storyId = str(row.story.storyId);
    // A row without a timestamp cannot be placed in a time-ordered merge.
    if (!comment || !comment.createdAt || !duelId || !storyId) continue;
    items.push({
      source: 'duelStory',
      id: comment.id,
      author: comment.author,
      content: comment.content,
      createdAt: comment.createdAt,
      duelId,
      storyId,
      prompt: str(row.story.prompt),
    });
  }
  return { items, nextCursor: cursor(data.nextCursor) };
}

function parseReceivedWorkMarks(data: unknown): Page<ReceivedMark> {
  if (!isRecord(data)) return { items: [], nextCursor: null };
  const items: ReceivedMark[] = [];
  for (const row of list(data.items)) {
    if (!isRecord(row) || !isRecord(row.work) || !isRecord(row.chapter)) continue;
    const id = str(row.id);
    const createdAt = timestamp(row.createdAt);
    const workId = str(row.work.id);
    const chapterId = str(row.chapter.id);
    if (!id || !createdAt || !workId || !chapterId) continue;
    items.push({
      source: 'workChapter',
      id,
      author: parseAuthor(row.author),
      content: str(row.content),
      createdAt,
      workId,
      workTitle: str(row.work.title),
      chapterId,
      chapterOrderIndex: count(row.chapter.orderIndex),
      chapterTitle: str(row.chapter.title),
      rootId: str(row.rootId) || id,
    });
  }
  return { items, nextCursor: cursor(data.nextCursor) };
}

// ---- endpoints ----

type Ctx = { locale: Locale; signal?: AbortSignal };

const storyPath = (duelId: string, storyId: string, ...rest: string[]) =>
  apiPath('api', 'gallery', 'stories', duelId, storyId, 'comments', ...rest);
const chapterPath = (workId: string, chapterId: string, ...rest: string[]) =>
  apiPath('api', 'gallery', 'works', workId, 'chapters', chapterId, 'ink-marks', ...rest);

export const storyCommentsApi = {
  async list(duelId: string, storyId: string, pageCursor: string | null, { locale, signal }: Ctx): Promise<StoryCommentsPage> {
    const data = await apiRequest('GET', storyPath(duelId, storyId), {
      locale,
      signal,
      query: { cursor: pageCursor ?? undefined },
    });
    if (!isRecord(data)) return { items: [], nextCursor: null, commentsCount: 0, canComment: false };
    return {
      items: list(data.items).map(parseStoryComment).filter(present),
      nextCursor: cursor(data.nextCursor),
      commentsCount: count(data.commentsCount),
      canComment: bool(data.canComment),
    };
  },

  /** Idempotent for the same clientRequestId and content (201 new, 200 replay). */
  async create(duelId: string, storyId: string, clientRequestId: string, content: string, { locale }: Ctx) {
    const data = await apiRequest('POST', storyPath(duelId, storyId), { locale, body: { clientRequestId, content } });
    if (!isRecord(data)) throw new ApiError(200, 'parse');
    return { comment: requireStoryComment(data.comment), commentsCount: count(data.commentsCount) };
  },

  async remove(duelId: string, storyId: string, commentId: string, { locale }: Ctx) {
    const data = await apiRequest('DELETE', storyPath(duelId, storyId, commentId), { locale });
    if (!isRecord(data) || str(data.commentId) !== commentId || bool(data.visible)) throw new ApiError(200, 'parse');
    return { commentsCount: count(data.commentsCount) };
  },

  async report(duelId: string, storyId: string, commentId: string, reason: ReportReason, { locale }: Ctx) {
    const data = await apiRequest('POST', storyPath(duelId, storyId, commentId, 'report'), { locale, body: { reason } });
    if (!isRecord(data) || str(data.commentId) !== commentId || !bool(data.reported)) throw new ApiError(200, 'parse');
  },

  async received(pageCursor: string | null, limit: number, { locale, signal }: Ctx): Promise<Page<ReceivedMark>> {
    return parseReceivedStoryComments(
      await apiRequest('GET', '/api/me/comments/received', {
        locale,
        signal,
        query: { cursor: pageCursor ?? undefined, limit: String(limit) },
      }),
    );
  },
};

export const inkMarksApi = {
  /** One cheap read behind the chip; zeros for a chapter with no Marcas. */
  async summary(workId: string, chapterId: string, { locale, signal }: Ctx): Promise<ChapterMarksSummary> {
    const data = await apiRequest('GET', chapterPath(workId, chapterId, 'summary'), { locale, signal });
    return isRecord(data) ? parseSummary(data) : { markCount: 0, rootCount: 0, canMark: false };
  },

  /** Roots, newest first, each with its replyCount and never its replies. */
  async roots(workId: string, chapterId: string, pageCursor: string | null, { locale, signal }: Ctx): Promise<InkMarkRootsPage> {
    const data = await apiRequest('GET', chapterPath(workId, chapterId), {
      locale,
      signal,
      query: { cursor: pageCursor ?? undefined },
    });
    if (!isRecord(data)) return { items: [], nextCursor: null, markCount: 0, rootCount: 0, canMark: false };
    return { items: list(data.items).map(parseRoot).filter(present), nextCursor: cursor(data.nextCursor), ...parseSummary(data) };
  },

  /** Replies of one root, oldest first. [limit] 1 is the cheap way to read replyCount. */
  async replies(
    workId: string,
    chapterId: string,
    rootId: string,
    pageCursor: string | null,
    { locale, signal, limit }: Ctx & { limit?: number },
  ): Promise<InkMarkRepliesPage> {
    const data = await apiRequest('GET', chapterPath(workId, chapterId, rootId, 'replies'), {
      locale,
      signal,
      query: { cursor: pageCursor ?? undefined, limit: limit ? String(limit) : undefined },
    });
    if (!isRecord(data)) return { items: [], nextCursor: null, replyCount: 0 };
    return { items: list(data.items).map(parseReply).filter(present), nextCursor: cursor(data.nextCursor), replyCount: count(data.replyCount) };
  },

  /** A root, or a reply when [parentId] is set. 201 new, 200 idempotent replay. */
  async create(workId: string, chapterId: string, clientRequestId: string, content: string, parentId: string | null, { locale }: Ctx) {
    const body: Record<string, string> = { clientRequestId, content };
    if (parentId) body.parentId = parentId;
    const data = await apiRequest('POST', chapterPath(workId, chapterId), { locale, body });
    if (!isRecord(data)) throw new ApiError(200, 'parse');
    const root = data.root === undefined ? null : parseRoot(data.root);
    const reply = data.reply === undefined ? null : parseReply(data.reply);
    if (!root === !reply) throw new ApiError(200, 'parse');
    return { created: bool(data.created), root, reply };
  },

  async remove(workId: string, chapterId: string, markId: string, { locale }: Ctx) {
    const data = await apiRequest('DELETE', chapterPath(workId, chapterId, markId), { locale });
    if (!isRecord(data) || str(data.markId) !== markId) throw new ApiError(200, 'parse');
    return { visible: bool(data.visible), markCount: count(data.markCount), rootCount: count(data.rootCount) };
  },

  async report(workId: string, chapterId: string, markId: string, reason: ReportReason, { locale }: Ctx) {
    const data = await apiRequest('POST', chapterPath(workId, chapterId, markId, 'report'), { locale, body: { reason } });
    if (!isRecord(data) || str(data.markId) !== markId || !bool(data.reported)) throw new ApiError(200, 'parse');
  },

  async received(pageCursor: string | null, limit: number, { locale, signal }: Ctx): Promise<Page<ReceivedMark>> {
    return parseReceivedWorkMarks(
      await apiRequest('GET', '/api/me/work-ink-marks/received', {
        locale,
        signal,
        query: { cursor: pageCursor ?? undefined, limit: String(limit) },
      }),
    );
  },
};

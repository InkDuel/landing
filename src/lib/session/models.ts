// Typed, validated views of the backend responses the web reads. They mirror
// the app's DTOs (inkduel_mobile/lib/features/*/data/models): unknown or
// missing fields fall back to empty values, never to whatever arrived.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const nonNegative = (value: unknown): number => Math.max(0, Math.trunc(num(value)));
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const cursor = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);

/** /api/me and /api/user/{id} share these fields. */
export type ProfileUser = {
  id: string;
  username: string;
  description: string;
  instagramHandle: string;
  xHandle: string;
  tiktokHandle: string;
  rankPoints: number;
  rankTier: string;
  rankDivision: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  writerLevel: number;
  writerXpInLevel: number;
  writerXpForNextLevel: number;
};

export function parseProfileUser(data: unknown): ProfileUser | null {
  if (!isRecord(data) || !str(data.id)) return null;
  return {
    id: str(data.id),
    username: str(data.username),
    description: str(data.description),
    instagramHandle: str(data.instagramHandle),
    xHandle: str(data.xHandle),
    tiktokHandle: str(data.tiktokHandle),
    rankPoints: nonNegative(data.rankPoints),
    rankTier: str(data.rankTier),
    rankDivision: nonNegative(data.rankDivision),
    wins: nonNegative(data.wins),
    losses: nonNegative(data.losses),
    currentStreak: nonNegative(data.currentStreak),
    bestStreak: nonNegative(data.bestStreak),
    writerLevel: nonNegative(data.writerLevel),
    writerXpInLevel: nonNegative(data.writerXpInLevel),
    writerXpForNextLevel: nonNegative(data.writerXpForNextLevel),
  };
}

export type GalleryStory = {
  /** duelId + storyId: the key the app uses for likes and Marcas. */
  key: string;
  duelId: string;
  storyId: string;
  prompt: string;
  storyPreview: string;
  storyText: string;
  authorId: string;
  authorDisplayName: string;
  authorRank: string;
  score: number;
  strengths: string[];
};

export type Page<T> = { items: T[]; nextCursor: string | null };

export function parseGalleryStories(data: unknown): Page<GalleryStory> {
  if (!isRecord(data)) return { items: [], nextCursor: null };
  const items = list(data.items)
    .filter(isRecord)
    .map((item) => ({
      key: `${str(item.duelId)}~${str(item.storyId)}`,
      duelId: str(item.duelId),
      storyId: str(item.storyId),
      prompt: str(item.prompt),
      storyPreview: str(item.storyPreview),
      storyText: str(item.storyText),
      authorId: str(item.authorId),
      authorDisplayName: str(item.authorDisplayName),
      authorRank: str(item.authorRank),
      score: num(item.score),
      strengths: list(item.strengths).filter((s): s is string => typeof s === 'string'),
    }))
    .filter((item) => item.duelId && item.storyId);
  return { items, nextCursor: cursor(data.nextCursor) };
}

export type GalleryWork = {
  id: string;
  title: string;
  authorId: string;
  authorDisplayName: string;
  publishedChapterCount: number;
  firstPublishedAt: string;
};

export function parseGalleryWorks(data: unknown): Page<GalleryWork> {
  if (!isRecord(data)) return { items: [], nextCursor: null };
  const items = list(data.items)
    .filter(isRecord)
    .map((item) => ({
      id: str(item.id),
      title: str(item.title),
      authorId: str(item.authorId),
      authorDisplayName: str(item.authorDisplayName),
      publishedChapterCount: nonNegative(item.publishedChapterCount),
      firstPublishedAt: str(item.firstPublishedAt),
    }))
    .filter((item) => item.id);
  return { items, nextCursor: cursor(data.nextCursor) };
}

export type Chapter = { id: string; orderIndex: number; title: string; content: string };
export type ChapterSummary = Omit<Chapter, 'content'>;

function parseChapter(data: unknown): Chapter | null {
  if (!isRecord(data) || !str(data.id)) return null;
  return { id: str(data.id), orderIndex: nonNegative(data.orderIndex), title: str(data.title), content: str(data.content) };
}

export type WorkDetail = {
  id: string;
  title: string;
  authorId: string;
  authorDisplayName: string;
  publishedChapterCount: number;
  firstPublishedChapter: Chapter | null;
};

export function parseWorkDetail(data: unknown): WorkDetail | null {
  if (!isRecord(data) || !str(data.id)) return null;
  return {
    id: str(data.id),
    title: str(data.title),
    authorId: str(data.authorId),
    authorDisplayName: str(data.authorDisplayName),
    publishedChapterCount: nonNegative(data.publishedChapterCount),
    firstPublishedChapter: parseChapter(data.firstPublishedChapter),
  };
}

export function parseChapterSummaries(data: unknown): Page<ChapterSummary> {
  if (!isRecord(data)) return { items: [], nextCursor: null };
  const items = list(data.items)
    .map(parseChapter)
    .filter((item): item is Chapter => item !== null)
    .map(({ id, orderIndex, title }) => ({ id, orderIndex, title }));
  return { items, nextCursor: cursor(data.nextCursor) };
}

export function parsePublicChapter(data: unknown): Chapter | null {
  return parseChapter(data);
}

import 'server-only';

// Public, unauthenticated backend endpoints used by the share pages. Called
// from the server only; the browser never talks to the backend in phase 0.

// INKDUEL_PUBLIC_API_BASE points a local or dev build at another backend
// (e.g. the dev one on :8081). Production builds leave it unset.
const API_BASE = process.env.INKDUEL_PUBLIC_API_BASE || 'https://inkduel-backend-production.up.railway.app';

export type PublicUser = {
  id: string;
  username: string;
  description: string;
  rankPoints: number;
  rankTier: string;
  rankDivision: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  /** null when the backend omits it (kill switch off, older backend): hidden, never 0. */
  bestWritingStreak: number | null;
  writerLevel: number;
  createdAt: string;
};

export type PublicStory = {
  id: string;
  title: string;
  contentExcerpt: string;
  createdAt: string;
  user: { id: string; username: string };
};

export type PublicDuelStory = {
  duelId: string;
  prompt: string;
  text: string;
  textExcerpt: string;
  createdAt: string;
  author: { id: string; username: string };
};

async function getJson(path: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// IDs come from the URL: each one is a single path segment, never a path.
const segment = (value: string) => encodeURIComponent(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

export async function fetchPublicUser(userId: string): Promise<PublicUser | null> {
  const data = await getJson(`/public/users/${segment(userId)}`);
  if (!isRecord(data) || !str(data.username)) return null;
  return {
    id: str(data.id),
    username: str(data.username),
    description: str(data.description),
    rankPoints: num(data.rankPoints),
    rankTier: str(data.rankTier),
    rankDivision: num(data.rankDivision),
    wins: num(data.wins),
    losses: num(data.losses),
    currentStreak: num(data.currentStreak),
    bestStreak: num(data.bestStreak),
    bestWritingStreak:
      typeof data.bestWritingStreak === 'number' && Number.isFinite(data.bestWritingStreak) && data.bestWritingStreak >= 0
        ? Math.trunc(data.bestWritingStreak)
        : null,
    writerLevel: num(data.writerLevel),
    createdAt: str(data.createdAt),
  };
}

export async function fetchPublicStory(storyId: string): Promise<PublicStory | null> {
  const data = await getJson(`/public/stories/${segment(storyId)}`);
  if (!isRecord(data) || !isRecord(data.user)) return null;
  return {
    id: str(data.id),
    title: str(data.title),
    contentExcerpt: str(data.contentExcerpt),
    createdAt: str(data.createdAt),
    user: { id: str(data.user.id), username: str(data.user.username) },
  };
}

export async function fetchPublicDuelStory(duelId: string, userId: string): Promise<PublicDuelStory | null> {
  const data = await getJson(`/public/duels/${segment(duelId)}/story/${segment(userId)}`);
  if (!isRecord(data) || !isRecord(data.author)) return null;
  return {
    duelId: str(data.duelId),
    prompt: str(data.prompt),
    text: str(data.text),
    textExcerpt: str(data.textExcerpt),
    createdAt: str(data.createdAt),
    author: { id: str(data.author.id), username: str(data.author.username) },
  };
}

// ---- Obras on the web (inkduel.com/w/{id}) ----

export type PublicWorkChapterSummary = { id: string; title: string; orderIndex: number };

export type PublicWork = {
  id: string;
  title: string;
  authorId: string;
  authorDisplayName: string;
  language: string;
  synopsis: string;
  genres: string[];
  completionStatus: string;
  publishedChapterCount: number;
  lastActivityAt: string;
  freeChapterId: string;
  chapters: PublicWorkChapterSummary[];
};

export type PublicWorkChapter = {
  id: string;
  title: string;
  orderIndex: number;
  position: number;
  locked: boolean;
  content: string;
};

const strList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

export async function fetchPublicWork(workId: string): Promise<PublicWork | null> {
  const data = await getJson(`/public/works/${segment(workId)}`);
  if (!isRecord(data) || !str(data.id)) return null;
  const chapters = (Array.isArray(data.chapters) ? data.chapters : [])
    .filter(isRecord)
    .map((c) => ({ id: str(c.id), title: str(c.title), orderIndex: num(c.orderIndex) }))
    .filter((c) => c.id);
  return {
    id: str(data.id),
    title: str(data.title),
    authorId: str(data.authorId),
    authorDisplayName: str(data.authorDisplayName),
    language: str(data.language),
    synopsis: str(data.synopsis),
    genres: strList(data.genres),
    completionStatus: str(data.completionStatus),
    publishedChapterCount: num(data.publishedChapterCount),
    lastActivityAt: str(data.lastActivityAt),
    freeChapterId: str(data.freeChapterId),
    chapters,
  };
}

export async function fetchPublicWorkChapter(workId: string, chapterId: string): Promise<PublicWorkChapter | null> {
  const data = await getJson(`/public/works/${segment(workId)}/chapters/${segment(chapterId)}`);
  if (!isRecord(data) || !str(data.id)) return null;
  return {
    id: str(data.id),
    title: str(data.title),
    orderIndex: num(data.orderIndex),
    position: num(data.position),
    locked: data.locked !== false,
    content: data.locked === false ? str(data.content) : '',
  };
}

/** Every visible work for the sitemap; [] when the backend is unreachable. */
export async function fetchPublicWorkIds(): Promise<{ id: string; lastActivityAt: string }[]> {
  const out: { id: string; lastActivityAt: string }[] = [];
  let cursor = '';
  for (let page = 0; page < 20; page += 1) {
    const data = await getJson(`/public/works-sitemap${cursor ? `?cursor=${segment(cursor)}` : ''}`);
    if (!isRecord(data)) break;
    for (const item of Array.isArray(data.items) ? data.items : []) {
      if (isRecord(item) && str(item.id)) out.push({ id: str(item.id), lastActivityAt: str(item.lastActivityAt) });
    }
    cursor = str(data.nextCursor);
    if (!cursor) break;
  }
  return out;
}


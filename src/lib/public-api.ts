import 'server-only';

// Public, unauthenticated backend endpoints used by the share pages. Called
// from the server only; the browser never talks to the backend in phase 0.

const API_BASE = 'https://inkduel-backend-production.up.railway.app';

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

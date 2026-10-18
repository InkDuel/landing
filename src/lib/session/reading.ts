'use client';

import { getApp } from '@firebase/app';

import { track } from '@/lib/analytics';
import { type Locale, parseLocale } from '@/lib/i18n';

import { ApiError, apiPath, apiRequest } from './api';
import { getFirebaseAuth } from './firebase';
import {
  type GalleryReaction,
  type GalleryReactionCounts,
  type GalleryStory,
  parseGalleryStory,
  parseReaction,
  parseReactionCounts,
} from './models';

// Historias reading flow, the reader side of
// inkduel-backend/docs/HISTORIAS_READING_FLOW.md: «Siguiente relato», the
// reading memory and the three reactions. Ported from the app's
// gallery_reading_data_repository.dart. Two switches, as in the app: the
// backend's (503 = off) and Remote Config's, so the web turns on with the app.

type Ctx = { locale: Locale; signal?: AbortSignal };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `duelId:storyId`, the ref /next takes in `after` and `exclude`. */
export function readingRef(story: Pick<GalleryStory, 'duelId' | 'storyId'>): string {
  return `${story.duelId}:${story.storyId}`;
}

export type ReadingQueue = { items: GalleryStory[]; exhausted: boolean };
export type ReactionResult = { storyId: string; myReaction: GalleryReaction | null; reactionCounts: GalleryReactionCounts };

export type ReadingApi = {
  next(afterRef: string | null, exclude: string[], limit: number, ctx: Ctx): Promise<ReadingQueue>;
  markRead(duelId: string, storyId: string, ctx: Ctx): Promise<void>;
  setReaction(duelId: string, storyId: string, reaction: GalleryReaction | null, ctx: Ctx): Promise<ReactionResult>;
};

const storyPath = (duelId: string, storyId: string, leaf: string) => apiPath('api', 'gallery', 'stories', duelId, storyId, leaf);

export const readingApi: ReadingApi = {
  async next(afterRef, exclude, limit, { locale, signal }) {
    const data = await apiRequest('GET', '/api/gallery/stories/next', {
      locale,
      signal,
      query: {
        after: afterRef ?? undefined,
        exclude: exclude.length > 0 ? exclude.join(',') : undefined,
        limit: String(limit),
      },
    });
    if (!isRecord(data)) return { items: [], exhausted: false };
    const items = (Array.isArray(data.items) ? data.items : [])
      .map(parseGalleryStory)
      .filter((story): story is GalleryStory => story !== null);
    return { items, exhausted: data.exhausted === true };
  },

  async markRead(duelId, storyId, { locale }) {
    await apiRequest('PUT', storyPath(duelId, storyId, 'read'), { locale });
  },

  async setReaction(duelId, storyId, reaction, { locale }) {
    const data = reaction
      ? await apiRequest('PUT', storyPath(duelId, storyId, 'reaction'), { locale, body: { reaction } })
      : await apiRequest('DELETE', storyPath(duelId, storyId, 'reaction'), { locale });
    if (!isRecord(data) || data.storyId !== storyId) throw new ApiError(200, 'parse');
    return { storyId, myReaction: parseReaction(data.myReaction), reactionCounts: parseReactionCounts(data.reactionCounts) };
  },
};

/**
 * Counters after one reader moves from [previous] to [next] (null = none),
 * the backend's own transition, so the optimistic UI lands where it will.
 */
export function transitionCounts(
  counts: GalleryReactionCounts,
  previous: GalleryReaction | null,
  next: GalleryReaction | null,
): GalleryReactionCounts {
  if (previous === next) return counts;
  const out = { ...counts };
  if (previous) out[previous] = Math.max(0, out[previous] - 1);
  if (next) out[next] = out[next] + 1;
  return out;
}

// ---- switches ----

export type ReadingFlags = { queue: boolean; reactions: boolean };

const OFF: ReadingFlags = { queue: false, reactions: false };
/** A first visit waits this long for Remote Config, then reads as before. */
const FIRST_FETCH_BUDGET_MS = 3000;

/**
 * The app's Remote Config keys and defaults (gallery_reading_queue_enabled,
 * gallery_reactions_enabled). A config already fetched answers at once and
 * refreshes in the background; the first ever fetch gets a short budget.
 * Anything that fails reads as off: Historias as it was.
 */
export async function readingFlags(): Promise<ReadingFlags> {
  try {
    if (!getFirebaseAuth()) return OFF;
    const { getRemoteConfig, ensureInitialized, fetchAndActivate, getBoolean, isSupported } = await import('@firebase/remote-config');
    if (!(await isSupported())) return OFF;
    const config = getRemoteConfig(getApp());
    config.defaultConfig = { ...config.defaultConfig, gallery_reading_queue_enabled: false, gallery_reactions_enabled: false };
    // The same settings as ranked-flags.ts: the instance is shared.
    config.settings = { fetchTimeoutMillis: 20_000, minimumFetchIntervalMillis: 15 * 60_000 };
    await ensureInitialized(config);
    const read = (): ReadingFlags => ({
      queue: getBoolean(config, 'gallery_reading_queue_enabled'),
      reactions: getBoolean(config, 'gallery_reactions_enabled'),
    });
    const fetching = fetchAndActivate(config).catch(() => false);
    if (config.fetchTimeMillis > 0) return read();
    await Promise.race([fetching, new Promise((resolve) => setTimeout(resolve, FIRST_FETCH_BUDGET_MS))]);
    return read();
  } catch {
    return OFF;
  }
}

// ---- «Leer de corrido» / «Ver lista» ----

export type HistoriasViewMode = 'reading' | 'list';

const VIEW_MODE_KEY = 'inkduel.historias.viewMode';

/** The reader's last choice; reading by default. A per-browser convenience. */
export function readViewMode(): HistoriasViewMode {
  try {
    return window.localStorage.getItem(VIEW_MODE_KEY) === 'list' ? 'list' : 'reading';
  } catch {
    return 'reading';
  }
}

export function saveViewMode(mode: HistoriasViewMode): void {
  try {
    window.localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    // Private mode or blocked storage: the choice lasts this visit only.
  }
}

// ---- analytics (the app's event names and values) ----

export type StoryViewSource = 'gallery' | 'reading_queue' | 'reading_feed';

/** The relato's language when it is a launch language, else the reader's. */
export function storyLanguage(story: GalleryStory, fallback: Locale): Locale {
  return story.language ? parseLocale(story.language) ?? fallback : fallback;
}

export const readingAnalytics = {
  storyViewed(story: GalleryStory, source: StoryViewSource, isOwnStory: boolean, locale: Locale) {
    track('story_viewed', {
      source,
      story_type: 'duel',
      language: storyLanguage(story, locale),
      is_own_story: isOwnStory ? 'yes' : 'no',
    });
  },
  nextStoryOpened(fromQueue: boolean) {
    track('gallery_next_story_opened', { source: fromQueue ? 'reading_queue' : 'reading_feed' });
  },
  reactionSet(reaction: GalleryReaction | null, isChange: boolean) {
    track('gallery_reaction_set', { reaction: reaction ?? 'none', is_change: isChange ? 'yes' : 'no' });
  },
  exhaustedViewed(locale: Locale) {
    track('gallery_reading_exhausted_viewed', { language: locale });
  },
};

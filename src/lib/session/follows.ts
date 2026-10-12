'use client';

import type { Locale } from '@/lib/i18n';

import { ApiError, apiPath, apiRequest } from './api';
import type { GalleryWork, Page } from './models';

// Seguir obras: inkduel-backend/internal/controllers/works_controller.go
// (GetGalleryWorkFollowState, Follow/UnfollowGalleryWork, GetFollowingWorks,
// GetWorkProfileSummary). The backend decides who may follow (canFollow:
// never the author); the new-chapter notice is its push to the app.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const count = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;

type Ctx = { locale: Locale; signal?: AbortSignal };

export type FollowState = { following: boolean; canFollow: boolean };
export type WorkProfileSummary = { myWorksCount: number; followingWorksCount: number };

function following(data: unknown): boolean {
  if (!isRecord(data) || typeof data.following !== 'boolean') throw new ApiError(200, 'parse');
  return data.following;
}

export const followsApi = {
  async state(workId: string, { locale, signal }: Ctx): Promise<FollowState> {
    const data = await apiRequest('GET', apiPath('api', 'gallery', 'works', workId, 'follow'), { locale, signal });
    return { following: isRecord(data) && data.following === true, canFollow: isRecord(data) && data.canFollow === true };
  },

  /** Idempotent; answers the canonical state. */
  async follow(workId: string, { locale }: Ctx): Promise<boolean> {
    return following(await apiRequest('PUT', apiPath('api', 'gallery', 'works', workId, 'follow'), { locale }));
  },

  async unfollow(workId: string, { locale }: Ctx): Promise<boolean> {
    return following(await apiRequest('DELETE', apiPath('api', 'gallery', 'works', workId, 'follow'), { locale }));
  },

  /** «Historias que sigo», newest follow first, in the gallery's own shape. */
  async following(pageCursor: string | null, { locale, signal }: Ctx): Promise<Page<GalleryWork>> {
    const data = await apiRequest('GET', '/api/works/following', { locale, signal, query: { cursor: pageCursor ?? undefined } });
    if (!isRecord(data)) return { items: [], nextCursor: null };
    const items = (Array.isArray(data.items) ? data.items : [])
      .filter(isRecord)
      .map((item) => ({
        id: str(item.workId),
        title: str(item.title),
        authorId: str(item.authorId),
        authorDisplayName: str(item.authorDisplayName),
        publishedChapterCount: count(item.publishedChapterCount),
        firstPublishedAt: str(item.firstPublishedAt),
      }))
      .filter((item) => item.id);
    return { items, nextCursor: typeof data.nextCursor === 'string' && data.nextCursor ? data.nextCursor : null };
  },

  async profileSummary({ locale, signal }: Ctx): Promise<WorkProfileSummary> {
    const data = await apiRequest('GET', '/api/works/profile-summary', { locale, signal });
    return isRecord(data)
      ? { myWorksCount: count(data.myWorksCount), followingWorksCount: count(data.followingWorksCount) }
      : { myWorksCount: 0, followingWorksCount: 0 };
  },
};

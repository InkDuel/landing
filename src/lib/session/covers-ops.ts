'use client';

import type { Locale } from '@/lib/i18n';
import { coverImageUrl } from '@/lib/covers';

import { apiPath, apiRequest } from './api';

// The cover review queue (operator only). The backend answers 404 to anyone
// else, so the page cannot tell "not an operator" from "no such page".

export const COVER_REJECT_REASONS = ['sexual', 'violence', 'hate', 'personal_data', 'third_party', 'not_a_cover'] as const;
export type CoverRejectReason = (typeof COVER_REJECT_REASONS)[number];

export type CoverQueueItem = {
  reviewId: string;
  workId: string;
  workTitle: string;
  authorName: string;
  /** Signed, short-lived (5 min): reload the queue to refresh it. */
  imageUrl: string;
  submittedAt: string;
  moderation: Record<string, string>;
  moderationNote: string;
  replacesCover: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const str = (value: unknown): string => (typeof value === 'string' ? value : '');

export function parseCoverQueue(data: unknown): CoverQueueItem[] {
  const items = isRecord(data) && Array.isArray(data.items) ? data.items : [];
  return items.filter(isRecord).flatMap((item) => {
    const reviewId = str(item.reviewId);
    if (!reviewId) return [];
    const moderation = isRecord(item.moderation)
      ? Object.fromEntries(Object.entries(item.moderation).filter((e): e is [string, string] => typeof e[1] === 'string'))
      : {};
    return [
      {
        reviewId,
        workId: str(item.workId),
        workTitle: str(item.workTitle),
        authorName: str(item.authorName),
        imageUrl: coverImageUrl(item.imageUrl),
        submittedAt: str(item.submittedAt),
        moderation,
        moderationNote: str(item.moderationNote),
        replacesCover: item.replacesCover === true,
      },
    ];
  });
}

export const coversOpsApi = {
  async queue(options: { locale: Locale; signal?: AbortSignal }): Promise<CoverQueueItem[]> {
    return parseCoverQueue(await apiRequest('GET', '/api/ops/covers', options));
  },
  async approve(reviewId: string, options: { locale: Locale }): Promise<void> {
    await apiRequest('POST', `/api/ops/covers${apiPath(reviewId)}/approve`, options);
  },
  async reject(reviewId: string, reasonCode: CoverRejectReason, options: { locale: Locale }): Promise<void> {
    await apiRequest('POST', `/api/ops/covers${apiPath(reviewId)}/reject`, { ...options, body: { reasonCode } });
  },
};

'use client';

import type { Locale } from '@/lib/i18n';

import { ApiError, apiDownload, apiPath, apiRequest } from '../api';
import { localTimezone } from '../local-time';
import {
  type DraftStatus,
  type Entity,
  type EntityKind,
  type EntityKindFields,
  isRecord,
  list,
  parseDraft,
  parseDraftSummary,
  parseEntity,
  parseOverview,
  parseProgress,
  parsePublishResult,
  parseSearch,
  parseSettings,
  parseSnapshot,
  parseSnapshotSummary,
  parseTrash,
  str,
  int,
  type SnapshotSummary,
  type StudioSettings,
} from './models';

// InkDuel Studio client: the author-only contract of
// inkduel-backend/internal/controllers/studio_controller.go. The backend is
// the authority; local checks only spare the author an invalid request.

type Ctx = { locale: Locale; signal?: AbortSignal; keepalive?: boolean };

const base = (workId: string, ...rest: string[]) => apiPath('api', 'works', workId, 'studio', ...rest);

function need<T>(value: T | null): T {
  if (value === null) throw new ApiError(200, 'parse');
  return value;
}

// Shared with the profile and the duel submissions; re-exported for Studio callers.
export { localDate, localTimezone } from '../local-time';

/** Studio switched off for this account (kill switch or rollout). */
export function isStudioUnavailable(error: unknown): boolean {
  return error instanceof ApiError && error.status === 503;
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 403);
}

/** The 409 body (code + snapshot fields), or null. */
export function conflictData(error: unknown): Record<string, unknown> | null {
  return error instanceof ApiError && error.status === 409 && isRecord(error.data) ? error.data : null;
}

export type DraftConflict = { revision: number; title: string; body: string };

export function draftConflict(error: unknown): DraftConflict | null {
  const data = conflictData(error);
  if (!data || data.code !== 'draft_conflict') return null;
  return { revision: int(data.currentRevision), title: str(data.currentTitle), body: str(data.currentBody) };
}

export type PublishedConflict = { revision: number; title: string; body: string; published: boolean };

export function publishedConflict(error: unknown): PublishedConflict | null {
  const data = conflictData(error);
  if (!data || data.code !== 'published_conflict') return null;
  return {
    revision: int(data.currentPublishedRevision),
    title: str(data.currentPublishedTitle),
    body: str(data.currentPublishedBody),
    published: data.currentPublished === true,
  };
}

export const studioApi = {
  async overview(workId: string, { locale, signal }: Ctx) {
    return need(parseOverview(await apiRequest('GET', base(workId), { locale, signal })));
  },

  async draft(workId: string, draftId: string, { locale, signal }: Ctx) {
    return need(parseDraft(await apiRequest('GET', base(workId, 'drafts', draftId), { locale, signal })));
  },

  /**
   * Opens the draft of an existing chapter (server-seeded, idempotent) or
   * creates a new draft with a client id (idempotent per payload).
   */
  async createDraft(
    workId: string,
    input: { draftId: string; chapterId?: string; title?: string; body?: string; status?: DraftStatus; source?: 'edit' | 'import' | 'split' },
    { locale }: Ctx,
  ) {
    const data = await apiRequest('POST', base(workId, 'drafts'), {
      locale,
      body: { ...input, timezone: input.source === 'import' ? localTimezone() : undefined },
    });
    const draft = need(parseDraftSummary(isRecord(data) ? data.draft : null));
    return { draft, created: isRecord(data) && data.created === true };
  },

  async saveDraft(
    workId: string,
    draftId: string,
    input: { expectedRevision: number; title: string; body: string; source?: 'edit' | 'import' | 'split' },
    { locale, keepalive }: Ctx,
  ) {
    return need(
      parseDraftSummary(
        await apiRequest('PATCH', base(workId, 'drafts', draftId), {
          locale,
          keepalive,
          body: { ...input, timezone: localTimezone() },
        }),
      ),
    );
  },

  async saveDraftMeta(
    workId: string,
    draftId: string,
    input: { expectedMetaRevision: number; synopsis?: string; status?: DraftStatus },
    { locale }: Ctx,
  ) {
    return need(parseDraftSummary(await apiRequest('PATCH', base(workId, 'drafts', draftId, 'meta'), { locale, body: input })));
  },

  async trashDraft(workId: string, draftId: string, { locale }: Ctx) {
    return need(parseDraftSummary(await apiRequest('DELETE', base(workId, 'drafts', draftId), { locale })));
  },

  async untrashDraft(workId: string, draftId: string, { locale }: Ctx) {
    return need(parseDraftSummary(await apiRequest('POST', base(workId, 'drafts', draftId, 'untrash'), { locale })));
  },

  async purgeDraft(workId: string, draftId: string, { locale }: Ctx) {
    await apiRequest('DELETE', base(workId, 'drafts', draftId, 'purge'), { locale });
  },

  async discardDraft(workId: string, draftId: string, expectedRevision: number, { locale }: Ctx) {
    return need(parseDraft(await apiRequest('POST', base(workId, 'drafts', draftId, 'discard'), { locale, body: { expectedRevision } })));
  },

  async publishDraft(
    workId: string,
    draftId: string,
    input: { expectedDraftRevision: number; expectedPublishedRevision: number | null; publishRequestId: string },
    { locale }: Ctx,
  ) {
    return need(parsePublishResult(await apiRequest('POST', base(workId, 'drafts', draftId, 'publish'), { locale, body: input })));
  },

  async snapshots(workId: string, draftId: string, { locale, signal }: Ctx): Promise<SnapshotSummary[]> {
    const data = await apiRequest('GET', base(workId, 'drafts', draftId, 'snapshots'), { locale, signal });
    return list(isRecord(data) ? data.items : null)
      .map(parseSnapshotSummary)
      .filter((s): s is SnapshotSummary => s !== null);
  },

  async snapshot(workId: string, draftId: string, snapshotId: string, { locale, signal }: Ctx) {
    return need(parseSnapshot(await apiRequest('GET', base(workId, 'drafts', draftId, 'snapshots', snapshotId), { locale, signal })));
  },

  async createSnapshot(workId: string, draftId: string, input: { snapshotId: string; label: string }, { locale }: Ctx) {
    return need(parseSnapshotSummary(await apiRequest('POST', base(workId, 'drafts', draftId, 'snapshots'), { locale, body: input })));
  },

  async deleteSnapshot(workId: string, draftId: string, snapshotId: string, { locale }: Ctx) {
    await apiRequest('DELETE', base(workId, 'drafts', draftId, 'snapshots', snapshotId), { locale });
  },

  async restoreSnapshot(workId: string, draftId: string, snapshotId: string, expectedRevision: number, { locale }: Ctx) {
    return need(
      parseDraft(
        await apiRequest('POST', base(workId, 'drafts', draftId, 'snapshots', snapshotId, 'restore'), { locale, body: { expectedRevision } }),
      ),
    );
  },

  async settings(workId: string, { locale, signal }: Ctx) {
    return parseSettings(await apiRequest('GET', base(workId, 'settings'), { locale, signal }));
  },

  async saveSettings(
    workId: string,
    input: Omit<StudioSettings, 'lastDraftId' | 'revision'> & { expectedRevision: number },
    { locale }: Ctx,
  ) {
    return parseSettings(await apiRequest('PUT', base(workId, 'settings'), { locale, body: input }));
  },

  async rememberDocument(workId: string, draftId: string, { locale }: Ctx) {
    await apiRequest('PUT', base(workId, 'settings', 'last-document'), { locale, body: { draftId } });
  },

  async progress(workId: string, range: { from: string; to: string; today: string }, { locale, signal }: Ctx) {
    return parseProgress(await apiRequest('GET', base(workId, 'progress'), { locale, signal, query: range }));
  },

  /** The query is the author's text: it goes in the body, never in the URL. */
  async search(workId: string, q: string, { locale, signal }: Ctx) {
    return parseSearch(await apiRequest('POST', base(workId, 'search'), { locale, signal, body: { q } }));
  },

  async trash(workId: string, { locale, signal }: Ctx) {
    return parseTrash(await apiRequest('GET', base(workId, 'trash'), { locale, signal }));
  },

  /** Never gated by the Studio flag: the author can always take the text out. */
  async exportFile(workId: string, format: 'txt' | 'md' | 'docx' | 'json', version: 'draft' | 'published', { locale }: Ctx) {
    return apiDownload(base(workId, 'export'), { locale, query: { format, version } });
  },

  // ---- Entities ----

  async listEntities<K extends EntityKind>(
    workId: string,
    kind: K,
    { trash = false, cursor }: { trash?: boolean; cursor?: string | null },
    { locale, signal }: Ctx,
  ): Promise<{ items: Entity<K>[]; nextCursor: string | null }> {
    const data = await apiRequest('GET', base(workId, kind), {
      locale,
      signal,
      query: { trash: trash ? '1' : undefined, cursor: cursor ?? undefined, limit: '200' },
    });
    const items = list(isRecord(data) ? data.items : null)
      .map((item) => parseEntity(kind, item))
      .filter((item): item is Entity<K> => item !== null);
    const next = isRecord(data) && typeof data.nextCursor === 'string' && data.nextCursor ? data.nextCursor : null;
    return { items, nextCursor: next };
  },

  async createEntity<K extends EntityKind>(workId: string, kind: K, id: string, fields: EntityKindFields[K], { locale }: Ctx) {
    const data = await apiRequest('POST', base(workId, kind), { locale, body: { id, fields } });
    return need(parseEntity(kind, isRecord(data) ? data.entity : null));
  },

  async updateEntity<K extends EntityKind>(
    workId: string,
    kind: K,
    id: string,
    expectedRevision: number,
    fields: EntityKindFields[K],
    { locale }: Ctx,
  ) {
    return need(parseEntity(kind, await apiRequest('PATCH', base(workId, kind, id), { locale, body: { expectedRevision, fields } })));
  },

  async trashEntity<K extends EntityKind>(workId: string, kind: K, id: string, { locale }: Ctx) {
    return need(parseEntity(kind, await apiRequest('DELETE', base(workId, kind, id), { locale })));
  },

  async untrashEntity<K extends EntityKind>(workId: string, kind: K, id: string, { locale }: Ctx) {
    return need(parseEntity(kind, await apiRequest('POST', base(workId, kind, id, 'untrash'), { locale })));
  },

  async purgeEntity(workId: string, kind: EntityKind, id: string, { locale }: Ctx) {
    await apiRequest('DELETE', base(workId, kind, id, 'purge'), { locale });
  },

  async moveScene(workId: string, id: string, input: { afterId: string | null; beforeId: string | null }, { locale }: Ctx) {
    return need(parseEntity('scenes', await apiRequest('POST', base(workId, 'scenes', id, 'move'), { locale, body: input })));
  },
};

/** The current entity carried by a 409 entity_conflict. */
export function entityConflict<K extends EntityKind>(kind: K, error: unknown): Entity<K> | null {
  const data = conflictData(error);
  if (!data || data.code !== 'entity_conflict') return null;
  return parseEntity(kind, data.current);
}

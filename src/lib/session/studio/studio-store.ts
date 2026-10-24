'use client';

import { useEffect, useSyncExternalStore } from 'react';

import type { Locale } from '@/lib/i18n';

import { ApiError } from '../api';
import { newClientId } from '../works';
import { entityConflict, studioApi } from './api';
import type { Entity, EntityKind, EntityKindFields } from './models';

// One in-memory store per open Work for the Studio entities, shared by
// Universe, Plan and the editor's context panel. Mutations are optimistic
// with rollback (founder standard): the UI changes at once, the server's
// canonical answer replaces it, and a failure restores the previous state and
// rethrows so the caller can say so. Nothing is ever kept only locally.

export type CollectionStatus = 'idle' | 'loading' | 'ready' | 'error';

export type CollectionState<K extends EntityKind> = {
  status: CollectionStatus;
  items: Entity<K>[];
};

type States = { [K in EntityKind]: CollectionState<K> };

/** A 409: the entity changed elsewhere; [current] is the server's version. */
export class EntityConflictError<K extends EntityKind> extends Error {
  constructor(readonly current: Entity<K> | null) {
    super('entity conflict');
    this.name = 'EntityConflictError';
  }
}

const initial = (): States => ({
  characters: { status: 'idle', items: [] },
  places: { status: 'idle', items: [] },
  notes: { status: 'idle', items: [] },
  scenes: { status: 'idle', items: [] },
  relations: { status: 'idle', items: [] },
});

export class StudioStore {
  private states: States = initial();
  private listeners = new Set<() => void>();
  private loading = new Map<EntityKind, Promise<void>>();

  constructor(
    readonly workId: string,
    private readonly locale: () => Locale,
  ) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  get<K extends EntityKind>(kind: K): CollectionState<K> {
    return this.states[kind] as CollectionState<K>;
  }

  private put<K extends EntityKind>(kind: K, next: CollectionState<K>) {
    this.states = { ...this.states, [kind]: next };
    for (const listener of this.listeners) listener();
  }

  private setItems<K extends EntityKind>(kind: K, items: Entity<K>[]) {
    this.put(kind, { status: 'ready', items });
  }

  /** Loads every page once (caps keep the total bounded). */
  ensure(kind: EntityKind): Promise<void> {
    const state = this.states[kind];
    if (state.status === 'ready' || state.status === 'loading') return this.loading.get(kind) ?? Promise.resolve();
    return this.reload(kind);
  }

  reload(kind: EntityKind): Promise<void> {
    const run = (async () => {
      this.put(kind, { ...this.states[kind], status: 'loading' } as CollectionState<typeof kind>);
      try {
        const all: Entity<typeof kind>[] = [];
        let cursor: string | null = null;
        for (let page = 0; page < 20; page += 1) {
          const res: { items: Entity<typeof kind>[]; nextCursor: string | null } = await studioApi.listEntities(
            this.workId,
            kind,
            { cursor },
            { locale: this.locale() },
          );
          all.push(...res.items);
          cursor = res.nextCursor;
          if (!cursor) break;
        }
        this.setItems(kind, all);
      } catch {
        this.put(kind, { ...this.states[kind], status: 'error' } as CollectionState<typeof kind>);
      } finally {
        this.loading.delete(kind);
      }
    })();
    this.loading.set(kind, run);
    return run;
  }

  /** Creates with a client id (idempotent on retry). */
  async create<K extends EntityKind>(kind: K, fields: EntityKindFields[K], id: string = newClientId()): Promise<Entity<K>> {
    const before = this.get(kind).items;
    const now = new Date().toISOString();
    const optimistic: Entity<K> = { id, fields, order: Number.MAX_SAFE_INTEGER, revision: 0, deleted: false, createdAt: now, updatedAt: now };
    this.setItems(kind, [...before.filter((e) => e.id !== id), optimistic]);
    try {
      const saved = await studioApi.createEntity(this.workId, kind, id, fields, { locale: this.locale() });
      this.setItems(kind, [...this.get(kind).items.filter((e) => e.id !== id), saved]);
      return saved;
    } catch (error) {
      this.setItems(kind, this.get(kind).items.filter((e) => e.id !== id));
      throw error;
    }
  }

  /** Replaces the fields under OCC. A 409 adopts the server version and throws. */
  async update<K extends EntityKind>(kind: K, entity: Entity<K>, fields: EntityKindFields[K]): Promise<Entity<K>> {
    const swap = (next: Entity<K>) => this.setItems(kind, this.get(kind).items.map((e) => (e.id === next.id ? next : e)));
    swap({ ...entity, fields });
    try {
      const saved = await studioApi.updateEntity(this.workId, kind, entity.id, entity.revision, fields, { locale: this.locale() });
      swap(saved);
      return saved;
    } catch (error) {
      const current = entityConflict(kind, error);
      swap(current ?? entity);
      if (current || (error instanceof ApiError && error.status === 409)) {
        throw new EntityConflictError(current);
      }
      throw error;
    }
  }

  /** To the trash (restorable for 30 days). */
  async trash(kind: EntityKind, id: string): Promise<void> {
    const before = this.get(kind).items;
    this.setItems(kind, before.filter((e) => e.id !== id));
    try {
      await studioApi.trashEntity(this.workId, kind, id, { locale: this.locale() });
    } catch (error) {
      this.setItems(kind, before);
      throw error;
    }
  }

  /** Brings an entity back from the trash into its list. */
  async untrash(kind: EntityKind, id: string): Promise<void> {
    const restored = await studioApi.untrashEntity(this.workId, kind, id, { locale: this.locale() });
    this.setItems(kind, [...this.get(kind).items.filter((e) => e.id !== id), restored] as Entity<typeof kind>[]);
  }

  /** Moves a scene in the private plan; never a public chapter order. */
  async moveScene(id: string, afterId: string | null, beforeId: string | null, optimisticOrder: number): Promise<void> {
    const before = this.get('scenes').items;
    this.setItems(
      'scenes',
      before.map((s) => (s.id === id ? { ...s, order: optimisticOrder } : s)),
    );
    try {
      const saved = await studioApi.moveScene(this.workId, id, { afterId, beforeId }, { locale: this.locale() });
      this.setItems('scenes', this.get('scenes').items.map((s) => (s.id === id ? saved : s)));
    } catch (error) {
      this.setItems('scenes', before);
      throw error;
    }
  }

  /** After a permanent character delete the server removed its relations. */
  dropRelationsOf(characterId: string) {
    const rel = this.get('relations');
    if (rel.status !== 'ready') return;
    this.setItems(
      'relations',
      rel.items.filter((r) => r.fields.fromCharacterId !== characterId && r.fields.toCharacterId !== characterId),
    );
  }
}

/** Subscribes to one collection and loads it on first use. */
export function useStudioCollection<K extends EntityKind>(store: StudioStore, kind: K): CollectionState<K> {
  const state = useSyncExternalStore(
    store.subscribe,
    () => store.get(kind),
    () => store.get(kind),
  );
  useEffect(() => {
    void store.ensure(kind);
  }, [store, kind]);
  return state;
}

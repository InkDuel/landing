'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { GraphIcon, ListIcon, PlusIcon, TrashIcon } from '@/components/ink/icons';
import { InkButton } from '@/components/ink/ink-button';
import { InkChip } from '@/components/ink/ink-chip';
import { InkEmptyState, InkTextAction } from '@/components/ink/ink-states';
import { INTL_LOCALE } from '@/lib/i18n';
import { type Entity, RELATION_TYPES, type RelationType } from '@/lib/session/studio/models';
import { useStudioCollection } from '@/lib/session/studio/studio-store';

import { RelationshipGraph } from './relationship-graph';
import { useStudio } from './studio-context';
import { StudioConfirm, StudioIconButton, StudioInput, StudioSegmented, StudioSelect } from './studio-ui';
import { CharacterSheet } from './universe-character-sheet';
import { ENTITY_CAPS, matchesQuery, NEW_ITEM, type SortKey, sortEntities, useUniverseCopy, useUniverseRoute } from './universe-common';
import { RelationSheet } from './universe-relation-sheet';

// Relationships: two views of the same data (PRD §8.3). The list is the
// fully accessible editor; the graph is a lighter way to look at it. The
// choice is remembered on this device; phones start on the list.

const VIEW_KEY = 'inkduel-studio-relations-view';
type RelationsView = 'list' | 'graph';

function storedView(): RelationsView | null {
  try {
    const value = window.localStorage.getItem(VIEW_KEY);
    return value === 'list' || value === 'graph' ? value : null;
  } catch {
    return null;
  }
}

function defaultView(): RelationsView {
  try {
    return window.matchMedia('(max-width: 639px)').matches ? 'list' : 'graph';
  } catch {
    return 'list';
  }
}

function useRelationsView(): [RelationsView, (view: RelationsView) => void] {
  const [view, setView] = useState<RelationsView>(() => (typeof window === 'undefined' ? 'list' : (storedView() ?? defaultView())));
  const choose = useCallback((next: RelationsView) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Private mode or blocked storage: the choice just lasts this visit.
    }
  }, []);
  return [view, choose];
}

type TypeFilter = 'all' | RelationType;

export function RelationsTab() {
  const copy = useUniverseCopy();
  const c = copy.relations;
  const { store, locale, toast } = useStudio();
  const route = useUniverseRoute();
  const { go } = route;
  const people = useStudioCollection(store, 'characters');
  const relations = useStudioCollection(store, 'relations');
  const [view, setView] = useRelationsView();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [trashing, setTrashing] = useState<Entity<'relations'> | null>(null);
  const [busy, setBusy] = useState(false);

  const collator = useMemo(() => new Intl.Collator(INTL_LOCALE[locale], { sensitivity: 'base', numeric: true }), [locale]);
  const characters = useMemo(() => [...people.items].sort((a, b) => collator.compare(a.fields.name, b.fields.name)), [people.items, collator]);
  const nameById = useMemo(() => new Map(characters.map((ch) => [ch.id, ch.fields.name || copy.common.unnamed])), [characters, copy.common.unnamed]);

  // A relation whose character is gone or in the trash is simply not shown.
  const live = useMemo(
    () => relations.items.filter((r) => nameById.has(r.fields.fromCharacterId) && nameById.has(r.fields.toCharacterId)),
    [relations.items, nameById],
  );
  const filtered = query.trim() !== '' || type !== 'all';
  const visible = useMemo(() => {
    const items = live.filter((r) => {
      const f = r.fields;
      if (type !== 'all' && f.type !== type) return false;
      return matchesQuery(query, nameById.get(f.fromCharacterId) ?? '', nameById.get(f.toCharacterId) ?? '', f.label, f.notes, c.types[f.type]);
    });
    return sortEntities(items, sort, locale, (r) => `${nameById.get(r.fields.fromCharacterId)} ${nameById.get(r.fields.toCharacterId)}`);
  }, [live, query, type, sort, locale, nameById, c.types]);
  const isolated = useMemo(() => {
    const connected = new Set(live.flatMap((r) => [r.fields.fromCharacterId, r.fields.toCharacterId]));
    return characters.filter((ch) => !connected.has(ch.id)).length;
  }, [live, characters]);

  // `item` is a relation (edit), a character (opens its sheet over the graph)
  // or `new`. Anything else is dropped once both lists are loaded.
  const ready = people.status === 'ready' && relations.status === 'ready';
  const item = route.item;
  const creating = item === NEW_ITEM && characters.length >= 2;
  const relationItem = item && item !== NEW_ITEM ? (live.find((r) => r.id === item) ?? null) : null;
  const characterItem = item && item !== NEW_ITEM && !relationItem ? (characters.find((ch) => ch.id === item) ?? null) : null;
  useEffect(() => {
    if (!item || !ready) return;
    if (item === NEW_ITEM ? characters.length < 2 : !relationItem && !characterItem) go({ item: null });
  }, [item, ready, characters.length, relationItem, characterItem, go]);

  const graphRelations = useMemo(
    () =>
      visible.map((r) => ({
        id: r.id,
        from: r.fields.fromCharacterId,
        to: r.fields.toCharacterId,
        type: r.fields.type,
        label: r.fields.label,
        directed: r.fields.directed,
        status: r.fields.status,
      })),
    [visible],
  );
  const graphCharacters = useMemo(() => characters.map((ch) => ({ id: ch.id, name: ch.fields.name || copy.common.unnamed })), [characters, copy.common.unnamed]);

  const fmt = (n: number) => n.toLocaleString(INTL_LOCALE[locale]);
  const countText = !ready ? '' : filtered ? c.countOf(fmt(visible.length), fmt(live.length)) : c.count(live.length, fmt(live.length));
  const needTwo = ready && characters.length < 2;
  const atCap = relations.items.length >= ENTITY_CAPS.relations;
  const failed = people.status === 'error' || relations.status === 'error';
  const loading = !ready && !failed;

  const trashNow = async () => {
    if (!trashing) return;
    setBusy(true);
    try {
      await store.trash('relations', trashing.id);
      toast(copy.common.trashed);
    } catch {
      toast(copy.common.trashFailed);
    } finally {
      setBusy(false);
      setTrashing(null);
    }
  };

  const retry = () => {
    void store.reload('characters');
    void store.reload('relations');
  };

  return (
    <section aria-labelledby="universe-relations-title" className="flex flex-col gap-4">
      <h2 id="universe-relations-title" className="sr-only">
        {copy.nav.relations}
      </h2>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <StudioSegmented<RelationsView>
              label={c.viewLabel}
              hideLabel
              value={view}
              onChange={setView}
              options={[
                { value: 'list', label: c.viewList, icon: <ListIcon size={16} /> },
                { value: 'graph', label: c.viewGraph, icon: <GraphIcon size={16} /> },
              ]}
            />
            <p role="status" aria-live="polite" className="min-h-5 type-caption text-secondary">
              {countText}
            </p>
          </div>
          {!needTwo ? (
            <InkButton fullWidth={false} disabled={atCap || !ready} leading={<PlusIcon size={20} />} onClick={() => route.go({ item: NEW_ITEM })}>
              {c.add}
            </InkButton>
          ) : null}
        </div>
        {atCap ? <p className="type-caption text-secondary">{c.capReached(String(ENTITY_CAPS.relations))}</p> : null}
      </div>

      {loading ? (
        <div role="status" className="flex flex-col gap-3">
          <span className="sr-only">{copy.common.loading}</span>
          {[0, 1, 2].map((n) => (
            <span key={n} aria-hidden="true" className="block h-16 animate-pulse rounded-card bg-sunken motion-reduce:animate-none" />
          ))}
        </div>
      ) : failed ? (
        <div role="alert" className="flex flex-col items-start gap-1 rounded-card border-brand border-danger bg-tint-danger p-4">
          <p className="type-body-strong text-primary">{c.loadError}</p>
          <InkTextAction onClick={retry}>{copy.common.retry}</InkTextAction>
        </div>
      ) : needTwo ? (
        <InkEmptyState
          title={c.needTwoTitle}
          message={c.needTwoMessage}
          action={
            <InkButton variant="secondary" fullWidth={false} onClick={() => route.go({ tab: 'characters', item: NEW_ITEM })}>
              {c.goCharacters}
            </InkButton>
          }
        />
      ) : view === 'list' && live.length === 0 ? (
        <InkEmptyState title={c.emptyTitle} message={c.emptyMessage} />
      ) : (
        <>
          {live.length > 0 ? (
            <div className="flex flex-wrap items-end gap-3">
              <StudioInput
                type="search"
                label={c.searchLabel}
                placeholder={c.searchPlaceholder}
                value={query}
                onChange={setQuery}
                className="min-w-[220px] flex-[2_1_240px]"
              />
              <StudioSelect<TypeFilter>
                label={c.typeLabel}
                value={type}
                onChange={setType}
                className="min-w-[140px] flex-[1_1_150px]"
                options={[{ value: 'all', label: c.typeAll }, ...RELATION_TYPES.map((t) => ({ value: t, label: c.types[t] }))]}
              />
              {view === 'list' ? (
                <StudioSelect<SortKey>
                  label={copy.common.sortLabel}
                  value={sort}
                  onChange={setSort}
                  className="min-w-[150px] flex-[1_1_170px]"
                  options={[
                    { value: 'name', label: copy.common.sortName },
                    { value: 'updated', label: copy.common.sortUpdated },
                  ]}
                />
              ) : null}
            </div>
          ) : null}

          {view === 'list' ? (
            visible.length === 0 ? (
              <div className="flex flex-col items-start gap-1 py-6">
                <p className="type-body text-secondary">{c.noMatches}</p>
                <InkTextAction
                  onClick={() => {
                    setQuery('');
                    setType('all');
                  }}
                >
                  {copy.common.clearFilters}
                </InkTextAction>
              </div>
            ) : (
              <ul aria-label={c.listLabel} className="m-0 list-none overflow-hidden rounded-card border-quiet border-divider bg-surface p-0">
                {visible.map((r) => {
                  const a = nameById.get(r.fields.fromCharacterId) ?? '';
                  const b = nameById.get(r.fields.toCharacterId) ?? '';
                  return (
                    <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-divider px-4 py-3 first:border-t-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-literary text-[17px] leading-[1.3] font-semibold break-words text-primary">
                          <span aria-hidden="true">
                            {a} {r.fields.directed ? '→' : '↔'} {b}
                          </span>
                          <span className="sr-only">{r.fields.directed ? c.rowDirected(a, b) : c.rowMutual(a, b)}</span>
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 type-caption text-secondary">
                          <InkChip tone="neutral">{c.types[r.fields.type]}</InkChip>
                          {r.fields.label ? <span className="break-words text-primary">{r.fields.label}</span> : null}
                          <span aria-hidden="true">·</span>
                          <span>{c.statuses[r.fields.status]}</span>
                        </p>
                      </div>
                      <div className="-mr-2 flex items-center">
                        <InkButton variant="link" fullWidth={false} aria-label={c.edit(a, b)} onClick={() => route.go({ item: r.id })}>
                          {c.editAction}
                        </InkButton>
                        <StudioIconButton label={c.trash(a, b)} onClick={() => setTrashing(r)}>
                          <TrashIcon size={20} />
                        </StudioIconButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          ) : (
            <>
              <RelationshipGraph
                characters={graphCharacters}
                relations={graphRelations}
                isolated={isolated}
                onOpenCharacter={(id) => route.go({ item: id })}
              />
              <p className="type-caption text-secondary sm:hidden">{c.graph.narrow}</p>
            </>
          )}
        </>
      )}

      <RelationSheet
        open={creating || relationItem !== null}
        entity={relationItem}
        total={relations.items.length}
        characters={characters}
        onClose={() => route.go({ item: null })}
      />
      <CharacterSheet
        open={characterItem !== null}
        entity={characterItem}
        total={people.items.length}
        onClose={() => route.go({ item: null })}
        onOpenItem={(id) => route.go({ item: id })}
      />
      <StudioConfirm
        open={trashing !== null}
        title={copy.common.trashTitle(trashing ? `${nameById.get(trashing.fields.fromCharacterId)} → ${nameById.get(trashing.fields.toCharacterId)}` : '')}
        body={c.trashBody}
        confirmLabel={copy.common.trashConfirm}
        cancelLabel={copy.common.cancel}
        destructive
        busy={busy}
        onClose={() => setTrashing(null)}
        onConfirm={() => void trashNow()}
      />
    </section>
  );
}

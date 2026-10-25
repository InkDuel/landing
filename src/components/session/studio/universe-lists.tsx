'use client';

import { type ReactNode, useMemo, useState } from 'react';

import { PlusIcon } from '@/components/ink/icons';
import { InkButton } from '@/components/ink/ink-button';
import { InkEmptyState, InkTextAction } from '@/components/ink/ink-states';
import { INTL_LOCALE } from '@/lib/i18n';
import type { CharacterFields, Entity, NoteFields, PlaceFields } from '@/lib/session/studio/models';
import { useStudioCollection } from '@/lib/session/studio/studio-store';

import { useStudio } from './studio-context';
import { StudioInput, StudioSelect } from './studio-ui';
import { CharacterSheet } from './universe-character-sheet';
import {
  CardGrid,
  type CardChip,
  CollectionGate,
  collectTags,
  EntityCard,
  ENTITY_CAPS,
  hasTag,
  matchesQuery,
  NEW_ITEM,
  type SortKey,
  sortEntities,
  useActiveItem,
  useUniverseCopy,
  useUniverseRoute,
} from './universe-common';
import { NoteSheet } from './universe-note-sheet';
import { PlaceSheet } from './universe-place-sheet';

// The three card lists of the Universe: characters, places and lore notes.
// Search ignores case and accents; filters and sort never touch the backend
// (every entry is already in the store).

function ListHeader({
  countText,
  addLabel,
  onAdd,
  atCap,
  capMessage,
}: {
  countText: string;
  addLabel: string;
  onAdd: () => void;
  atCap: boolean;
  capMessage: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="min-h-5 type-caption text-secondary">
          {countText}
        </p>
        <InkButton fullWidth={false} disabled={atCap} leading={<PlusIcon size={20} />} onClick={onAdd}>
          {addLabel}
        </InkButton>
      </div>
      {atCap ? <p className="type-caption text-secondary">{capMessage}</p> : null}
    </div>
  );
}

function ListToolbar({
  searchLabel,
  searchPlaceholder,
  query,
  onQuery,
  sort,
  onSort,
  children,
}: {
  searchLabel: string;
  searchPlaceholder: string;
  query: string;
  onQuery: (value: string) => void;
  sort: SortKey;
  onSort: (value: SortKey) => void;
  children?: ReactNode;
}) {
  const common = useUniverseCopy().common;
  return (
    <div className="flex flex-wrap items-end gap-3">
      <StudioInput
        type="search"
        label={searchLabel}
        placeholder={searchPlaceholder}
        value={query}
        onChange={onQuery}
        className="min-w-[220px] flex-[2_1_240px]"
      />
      {children}
      <StudioSelect<SortKey>
        label={common.sortLabel}
        value={sort}
        onChange={onSort}
        options={[
          { value: 'name', label: common.sortName },
          { value: 'updated', label: common.sortUpdated },
        ]}
        className="min-w-[150px] flex-[1_1_170px]"
      />
    </div>
  );
}

const filterClass = 'min-w-[140px] flex-[1_1_150px]';

function NoMatches({ message, onClear }: { message: string; onClear: () => void }) {
  const common = useUniverseCopy().common;
  return (
    <div className="flex flex-col items-start gap-1 py-6">
      <p className="type-body text-secondary">{message}</p>
      <InkTextAction onClick={onClear}>{common.clearFilters}</InkTextAction>
    </div>
  );
}

function useCountText(shown: number, total: number, filtered: boolean, ready: boolean, copy: {
  count: (count: number, formatted: string) => string;
  countOf: (shown: string, total: string) => string;
}): string {
  const { locale } = useStudio();
  if (!ready) return '';
  const fmt = (n: number) => n.toLocaleString(INTL_LOCALE[locale]);
  return filtered ? copy.countOf(fmt(shown), fmt(total)) : copy.count(total, fmt(total));
}

// ---- Characters ----

type RoleFilter = 'all' | 'none' | CharacterFields['role'];

export function CharactersTab() {
  const copy = useUniverseCopy();
  const c = copy.characters;
  const { store, locale } = useStudio();
  const route = useUniverseRoute();
  const state = useStudioCollection(store, 'characters');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');
  const [tag, setTag] = useState('all');
  const [sort, setSort] = useState<SortKey>('name');
  const active = useActiveItem(state.items, state.status, route.item, route.go);

  const tags = useMemo(() => collectTags(state.items.map((e) => e.fields.tags), locale), [state.items, locale]);
  const filtered = query.trim() !== '' || role !== 'all' || tag !== 'all';
  const visible = useMemo(() => {
    const items = state.items.filter((e) => {
      const f = e.fields;
      if (role === 'none' ? f.role !== '' : role !== 'all' && f.role !== role) return false;
      if (tag !== 'all' && !hasTag(f.tags, tag)) return false;
      return matchesQuery(query, f.name, f.aliases, f.summary, f.tags.join(' '));
    });
    return sortEntities(items, sort, locale, (e) => e.fields.name);
  }, [state.items, query, role, tag, sort, locale]);
  const countText = useCountText(visible.length, state.items.length, filtered, state.status === 'ready', c);
  const clear = () => {
    setQuery('');
    setRole('all');
    setTag('all');
  };

  const chipsOf = (f: CharacterFields): CardChip[] => {
    const chips: CardChip[] = [];
    if (f.role) chips.push({ label: c.roles[f.role], tone: 'neutral' });
    if (f.narrativeState && f.narrativeState !== 'active') chips.push({ label: c.states[f.narrativeState], tone: 'muted' });
    return chips;
  };

  return (
    <section aria-labelledby="universe-characters-title" className="flex flex-col gap-4">
      <h2 id="universe-characters-title" className="sr-only">
        {copy.nav.characters}
      </h2>
      <ListHeader
        countText={countText}
        addLabel={c.add}
        onAdd={() => route.go({ item: NEW_ITEM })}
        atCap={state.items.length >= ENTITY_CAPS.characters}
        capMessage={c.capReached(String(ENTITY_CAPS.characters))}
      />
      <CollectionGate status={state.status} itemCount={state.items.length} errorTitle={c.loadError} onRetry={() => void store.reload('characters')}>
        {state.items.length === 0 ? (
          <InkEmptyState title={c.emptyTitle} message={c.emptyMessage} />
        ) : (
          <>
            <ListToolbar searchLabel={c.searchLabel} searchPlaceholder={c.searchPlaceholder} query={query} onQuery={setQuery} sort={sort} onSort={setSort}>
              <StudioSelect<RoleFilter>
                label={c.roleLabel}
                value={role}
                onChange={setRole}
                className={filterClass}
                options={[
                  { value: 'all', label: copy.common.filterAll },
                  { value: 'none', label: c.roleNone },
                  { value: 'protagonist', label: c.roles.protagonist },
                  { value: 'antagonist', label: c.roles.antagonist },
                  { value: 'secondary', label: c.roles.secondary },
                  { value: 'other', label: c.roles.other },
                ]}
              />
              {tags.length > 0 ? (
                <StudioSelect
                  label={copy.common.tagLabel}
                  value={tag}
                  onChange={setTag}
                  className={filterClass}
                  options={[{ value: 'all', label: copy.common.filterAll }, ...tags.map((t) => ({ value: t, label: t }))]}
                />
              ) : null}
            </ListToolbar>
            {visible.length === 0 ? (
              <NoMatches message={c.noMatches} onClear={clear} />
            ) : (
              <CardGrid label={copy.nav.characters}>
                {visible.map((e) => (
                  <EntityCard
                    key={e.id}
                    id={e.id}
                    title={e.fields.name || copy.common.unnamed}
                    subtitle={e.fields.aliases}
                    summary={e.fields.summary}
                    chips={chipsOf(e.fields)}
                    tags={e.fields.tags}
                    onOpen={(id) => route.go({ item: id })}
                  />
                ))}
              </CardGrid>
            )}
          </>
        )}
      </CollectionGate>
      <CharacterSheet
        open={active.open}
        entity={active.entity}
        total={state.items.length}
        onClose={() => route.go({ item: null })}
        onOpenItem={(id) => route.go({ item: id })}
      />
    </section>
  );
}

// ---- Places ----

type ImportanceFilter = 'all' | 'none' | 'major' | 'minor';

export function PlacesTab() {
  const copy = useUniverseCopy();
  const c = copy.places;
  const { store, locale } = useStudio();
  const route = useUniverseRoute();
  const state = useStudioCollection(store, 'places');
  const [query, setQuery] = useState('');
  const [importance, setImportance] = useState<ImportanceFilter>('all');
  const [tag, setTag] = useState('all');
  const [sort, setSort] = useState<SortKey>('name');
  const active = useActiveItem(state.items, state.status, route.item, route.go);

  const tags = useMemo(() => collectTags(state.items.map((e) => e.fields.tags), locale), [state.items, locale]);
  const filtered = query.trim() !== '' || importance !== 'all' || tag !== 'all';
  const visible = useMemo(() => {
    const items = state.items.filter((e: Entity<'places'>) => {
      const f: PlaceFields = e.fields;
      if (importance === 'none' ? f.importance !== '' : importance !== 'all' && f.importance !== importance) return false;
      if (tag !== 'all' && !hasTag(f.tags, tag)) return false;
      return matchesQuery(query, f.name, f.placeType, f.description, f.tags.join(' '));
    });
    return sortEntities(items, sort, locale, (e) => e.fields.name);
  }, [state.items, query, importance, tag, sort, locale]);
  const countText = useCountText(visible.length, state.items.length, filtered, state.status === 'ready', c);
  const clear = () => {
    setQuery('');
    setImportance('all');
    setTag('all');
  };

  return (
    <section aria-labelledby="universe-places-title" className="flex flex-col gap-4">
      <h2 id="universe-places-title" className="sr-only">
        {copy.nav.places}
      </h2>
      <ListHeader
        countText={countText}
        addLabel={c.add}
        onAdd={() => route.go({ item: NEW_ITEM })}
        atCap={state.items.length >= ENTITY_CAPS.places}
        capMessage={c.capReached(String(ENTITY_CAPS.places))}
      />
      <CollectionGate status={state.status} itemCount={state.items.length} errorTitle={c.loadError} onRetry={() => void store.reload('places')}>
        {state.items.length === 0 ? (
          <InkEmptyState title={c.emptyTitle} message={c.emptyMessage} />
        ) : (
          <>
            <ListToolbar searchLabel={c.searchLabel} searchPlaceholder={c.searchPlaceholder} query={query} onQuery={setQuery} sort={sort} onSort={setSort}>
              <StudioSelect<ImportanceFilter>
                label={c.importanceLabel}
                value={importance}
                onChange={setImportance}
                className={filterClass}
                options={[
                  { value: 'all', label: copy.common.filterAll },
                  { value: 'none', label: c.importanceNone },
                  { value: 'major', label: c.importances.major },
                  { value: 'minor', label: c.importances.minor },
                ]}
              />
              {tags.length > 0 ? (
                <StudioSelect
                  label={copy.common.tagLabel}
                  value={tag}
                  onChange={setTag}
                  className={filterClass}
                  options={[{ value: 'all', label: copy.common.filterAll }, ...tags.map((t) => ({ value: t, label: t }))]}
                />
              ) : null}
            </ListToolbar>
            {visible.length === 0 ? (
              <NoMatches message={c.noMatches} onClear={clear} />
            ) : (
              <CardGrid label={copy.nav.places}>
                {visible.map((e) => (
                  <EntityCard
                    key={e.id}
                    id={e.id}
                    title={e.fields.name || copy.common.unnamed}
                    subtitle={e.fields.placeType}
                    summary={e.fields.description}
                    chips={e.fields.importance ? [{ label: c.importances[e.fields.importance], tone: 'neutral' }] : []}
                    tags={e.fields.tags}
                    onOpen={(id) => route.go({ item: id })}
                  />
                ))}
              </CardGrid>
            )}
          </>
        )}
      </CollectionGate>
      <PlaceSheet
        open={active.open}
        entity={active.entity}
        total={state.items.length}
        onClose={() => route.go({ item: null })}
        onOpenItem={(id) => route.go({ item: id })}
      />
    </section>
  );
}

// ---- Lore notes ----

type CategoryFilter = 'all' | 'none' | Exclude<NoteFields['category'], ''>;

export function NotesTab() {
  const copy = useUniverseCopy();
  const c = copy.notes;
  const { store, locale } = useStudio();
  const route = useUniverseRoute();
  const state = useStudioCollection(store, 'notes');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [tag, setTag] = useState('all');
  const [sort, setSort] = useState<SortKey>('updated');
  // Quick notes belong to the editor's side panel, not to the lore.
  const lore = useMemo(() => state.items.filter((e) => e.fields.kind !== 'quick'), [state.items]);
  const active = useActiveItem(lore, state.status, route.item, route.go);

  const tags = useMemo(() => collectTags(lore.map((e) => e.fields.tags), locale), [lore, locale]);
  const filtered = query.trim() !== '' || category !== 'all' || tag !== 'all';
  const visible = useMemo(() => {
    const items = lore.filter((e) => {
      const f = e.fields;
      if (category === 'none' ? f.category !== '' : category !== 'all' && f.category !== category) return false;
      if (tag !== 'all' && !hasTag(f.tags, tag)) return false;
      return matchesQuery(query, f.title, f.body, f.tags.join(' '), f.category ? c.categories[f.category] : '');
    });
    return sortEntities(items, sort, locale, (e) => e.fields.title);
  }, [lore, query, category, tag, sort, locale, c.categories]);
  const countText = useCountText(visible.length, lore.length, filtered, state.status === 'ready', c);
  const clear = () => {
    setQuery('');
    setCategory('all');
    setTag('all');
  };

  return (
    <section aria-labelledby="universe-notes-title" className="flex flex-col gap-4">
      <h2 id="universe-notes-title" className="sr-only">
        {copy.nav.notes}
      </h2>
      <ListHeader
        countText={countText}
        addLabel={c.add}
        onAdd={() => route.go({ item: NEW_ITEM })}
        atCap={state.items.length >= ENTITY_CAPS.notes}
        capMessage={c.capReached(String(ENTITY_CAPS.notes))}
      />
      <CollectionGate status={state.status} itemCount={lore.length} errorTitle={c.loadError} onRetry={() => void store.reload('notes')}>
        {lore.length === 0 ? (
          <InkEmptyState title={c.emptyTitle} message={c.emptyMessage} />
        ) : (
          <>
            <ListToolbar searchLabel={c.searchLabel} searchPlaceholder={c.searchPlaceholder} query={query} onQuery={setQuery} sort={sort} onSort={setSort}>
              <StudioSelect<CategoryFilter>
                label={c.categoryLabel}
                value={category}
                onChange={setCategory}
                className={filterClass}
                options={[
                  { value: 'all', label: copy.common.filterAll },
                  { value: 'none', label: c.categoryNone },
                  { value: 'rule', label: c.categories.rule },
                  { value: 'faction', label: c.categories.faction },
                  { value: 'object', label: c.categories.object },
                  { value: 'magic', label: c.categories.magic },
                  { value: 'culture', label: c.categories.culture },
                  { value: 'research', label: c.categories.research },
                  { value: 'other', label: c.categories.other },
                ]}
              />
              {tags.length > 0 ? (
                <StudioSelect
                  label={copy.common.tagLabel}
                  value={tag}
                  onChange={setTag}
                  className={filterClass}
                  options={[{ value: 'all', label: copy.common.filterAll }, ...tags.map((t) => ({ value: t, label: t }))]}
                />
              ) : null}
            </ListToolbar>
            {visible.length === 0 ? (
              <NoMatches message={c.noMatches} onClear={clear} />
            ) : (
              <CardGrid label={copy.nav.notes}>
                {visible.map((e) => (
                  <EntityCard
                    key={e.id}
                    id={e.id}
                    title={e.fields.title || c.untitled}
                    summary={e.fields.body}
                    chips={e.fields.category ? [{ label: c.categories[e.fields.category], tone: 'neutral' }] : []}
                    tags={e.fields.tags}
                    onOpen={(id) => route.go({ item: id })}
                  />
                ))}
              </CardGrid>
            )}
          </>
        )}
      </CollectionGate>
      <NoteSheet
        open={active.open}
        entity={active.entity}
        total={state.items.length}
        onClose={() => route.go({ item: null })}
        onOpenItem={(id) => route.go({ item: id })}
      />
    </section>
  );
}

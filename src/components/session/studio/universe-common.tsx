'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useCallback, useEffect } from 'react';

import { cx } from '@/components/ink/cx';
import { InkChip, type InkChipTone } from '@/components/ink/ink-chip';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { INTL_LOCALE, type Locale } from '@/lib/i18n';
import type { Entity, EntityKind } from '@/lib/session/studio/models';
import type { CollectionStatus } from '@/lib/session/studio/studio-store';
import { UNIVERSE_COPY, type UniverseCopy } from '@/lib/session/studio/studio-universe-copy';

import { useStudio } from './studio-context';
import { runes } from './studio-ui';

// Pieces shared by the Universe lists and sheets: the URL contract
// (?area=universe&tab=…&item=…), accent-insensitive search, sorting and the
// card/frame scaffolding. Nothing here talks to the backend.

export type UniverseTab = 'characters' | 'places' | 'notes' | 'relations';
export const UNIVERSE_TABS: readonly UniverseTab[] = ['characters', 'places', 'notes', 'relations'];

export function parseTab(value: string | null): UniverseTab {
  return (UNIVERSE_TABS as readonly string[]).includes(value ?? '') ? (value as UniverseTab) : 'characters';
}

/** Soft per-work caps (DECISIONS D3); the backend answers 409 past them. */
export const ENTITY_CAPS = { characters: 300, places: 300, notes: 500, relations: 1000 } as const;
/** internal/models MaxStudioLinkIDs and MaxStudioCustom. */
export const MAX_LINK_IDS = 50;
export const MAX_CUSTOM_FIELDS = 12;
/** `item=new` opens the create sheet of the current tab. */
export const NEW_ITEM = 'new';

export function useUniverseCopy(): UniverseCopy {
  return UNIVERSE_COPY[useStudio().locale];
}

// ---- URL ----

export type RouteChange = { tab?: UniverseTab; item?: string | null };

/** The Universe place lives in the URL, so Back, reloads and links work. */
export function useUniverseRoute() {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const tab = parseTab(params.get('tab'));
  const item = params.get('item');
  const query = params.toString();

  const hrefFor = useCallback(
    (change: RouteChange) => {
      const next = new URLSearchParams(query);
      next.set('area', 'universe');
      next.set('tab', change.tab ?? tab);
      if (change.tab && change.tab !== tab) next.delete('item');
      if (change.item !== undefined) {
        if (change.item) next.set('item', change.item);
        else next.delete('item');
      }
      return `${pathname}?${next.toString()}`;
    },
    [pathname, query, tab],
  );

  const go = useCallback((change: RouteChange) => router.replace(hrefFor(change), { scroll: false }), [router, hrefFor]);
  return { tab, item, hrefFor, go };
}

/**
 * Which entry of [items] the URL points at: `item=new` opens the create form,
 * an id opens that entry. An id that does not resolve once the list is loaded
 * (trashed, other work, old link) is dropped from the URL.
 */
export function useActiveItem<K extends EntityKind>(
  items: readonly Entity<K>[],
  status: CollectionStatus,
  item: string | null,
  go: (change: RouteChange) => void,
  accept: (entity: Entity<K>) => boolean = () => true,
) {
  const isNew = item === NEW_ITEM;
  const found = item && !isNew ? items.find((entity) => entity.id === item && accept(entity)) : undefined;
  const entity = found ?? null;
  useEffect(() => {
    if (item && !isNew && !entity && status === 'ready') go({ item: null });
  }, [item, isNew, entity, status, go]);
  return { isNew, entity, open: isNew || entity !== null };
}

// ---- Search, filter, sort ----

/** Lowercase without accents: «Álvaro» matches «alvaro». */
export function fold(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Every word of the query must appear somewhere in the haystack. */
export function matchesQuery(query: string, ...haystack: string[]): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = fold(haystack.join(' \n '));
  return words.every((word) => text.includes(word));
}

export type SortKey = 'name' | 'updated';

export function sortEntities<T extends { id: string; updatedAt: string }>(
  items: readonly T[],
  sort: SortKey,
  locale: Locale,
  nameOf: (item: T) => string,
): T[] {
  const collator = new Intl.Collator(INTL_LOCALE[locale], { sensitivity: 'base', numeric: true });
  const byName = (a: T, b: T) => collator.compare(nameOf(a), nameOf(b)) || (a.id < b.id ? -1 : 1);
  return [...items].sort((a, b) => {
    if (sort === 'updated') {
      const diff = (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0);
      if (diff !== 0) return diff;
    }
    return byName(a, b);
  });
}

/** Distinct tags (case-insensitive), alphabetically. */
export function collectTags(lists: readonly (readonly string[])[], locale: Locale): string[] {
  const seen = new Map<string, string>();
  for (const tags of lists) for (const tag of tags) if (!seen.has(tag.toLowerCase())) seen.set(tag.toLowerCase(), tag);
  const collator = new Intl.Collator(INTL_LOCALE[locale], { sensitivity: 'base' });
  return [...seen.values()].sort(collator.compare);
}

export const hasTag = (tags: readonly string[], wanted: string) => tags.some((tag) => tag.toLowerCase() === wanted.toLowerCase());

// ---- Frames ----

/** Skeleton while the first load runs, a retry banner when it fails. */
export function CollectionGate({
  status,
  itemCount,
  errorTitle,
  onRetry,
  children,
}: {
  status: CollectionStatus;
  itemCount: number;
  errorTitle: string;
  onRetry: () => void;
  children: ReactNode;
}) {
  const copy = useUniverseCopy().common;
  if (itemCount === 0 && (status === 'idle' || status === 'loading')) {
    return <InkSkeleton lines={4} height="h-24" label={copy.loading} />;
  }
  const banner =
    status === 'error' ? (
      <InkInlineBanner title={errorTitle} action={<InkTextAction onClick={onRetry}>{copy.retry}</InkTextAction>} />
    ) : null;
  if (itemCount === 0 && status === 'error') return banner;
  return (
    <>
      {banner}
      {children}
    </>
  );
}

/** Responsive grid of cards: one column on phones. */
export function CardGrid({ children, label }: { children: ReactNode; label: string }) {
  return (
    <ul aria-label={label} className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
      {children}
    </ul>
  );
}

export type CardChip = { label: string; tone: InkChipTone };

/** One entity card: opens its sheet. The title is Literata, like Obras. */
export function EntityCard({
  id,
  title,
  subtitle,
  summary,
  chips,
  tags,
  onOpen,
}: {
  id: string;
  title: string;
  subtitle?: string;
  summary?: string;
  chips?: CardChip[];
  tags?: string[];
  onOpen: (id: string) => void;
}) {
  const shownTags = (tags ?? []).slice(0, 3);
  const extra = (tags?.length ?? 0) - shownTags.length;
  return (
    <li className="min-w-0">
      <button
        type="button"
        data-entity-id={id}
        onClick={() => onOpen(id)}
        className={cx(
          'ink-focus flex h-full w-full flex-col items-start gap-2 rounded-card border-quiet border-divider bg-surface p-4 text-left',
          'hover:border-outline',
        )}
      >
        <span className="block w-full min-w-0">
          <span className="block font-literary text-[19px] leading-[1.25] font-semibold break-words text-primary">{title}</span>
          {subtitle ? <span className="mt-0.5 block type-caption break-words text-secondary">{subtitle}</span> : null}
        </span>
        {chips && chips.length > 0 ? (
          <span className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <InkChip key={chip.label} tone={chip.tone}>
                {chip.label}
              </InkChip>
            ))}
          </span>
        ) : null}
        {summary ? <span className="line-clamp-3 block type-body-sm break-words text-secondary">{summary}</span> : null}
        {shownTags.length > 0 ? (
          <span className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {shownTags.map((tag) => (
              <InkChip key={tag} tone="outline">
                {tag}
              </InkChip>
            ))}
            {extra > 0 ? <InkChip tone="outline">{`+${extra}`}</InkChip> : null}
          </span>
        ) : null}
      </button>
    </li>
  );
}

/** Rune-aware length check used by every sheet's validity rule. */
export function within(value: string, max: number): boolean {
  return value.length <= max || runes(value) <= max;
}

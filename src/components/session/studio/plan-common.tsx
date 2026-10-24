'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type DragEvent, type ReactNode, useCallback, useMemo, useState } from 'react';

import { cx } from '@/components/ink/cx';
import type { InkChipTone } from '@/components/ink/ink-chip';
import { INTL_LOCALE } from '@/lib/i18n';
import type { Entity, SceneStatus } from '@/lib/session/studio/models';
import { sameSubplot } from '@/lib/session/studio/plan-order';
import { PLAN_COPY, type PlanCopy } from '@/lib/session/studio/studio-plan-copy';
import { STUDIO_COPY } from '@/lib/session/studio/studio-copy';
import { useStudioCollection } from '@/lib/session/studio/studio-store';

import { entryTitle, useStudio } from './studio-context';
import { hasTag, matchesQuery } from './universe-common';

// Pieces shared by the planner's list, board, sheet and templates: copy, the
// URL contract (?area=plan&item=…), the view choice, name lookups, filters and
// the native drag and drop that both views use. Nothing here talks to the
// backend.

/** Soft per-work cap (DECISIONS D3); the backend answers 409 past it. */
export const SCENE_CAP = 500;
/** `item=new` opens a blank scene. */
export const NEW_SCENE = 'new';

export function usePlanCopy(): PlanCopy {
  return PLAN_COPY[useStudio().locale];
}

export const STATUS_TONE: Record<SceneStatus, InkChipTone> = {
  idea: 'muted',
  planned: 'done',
  draft: 'draw',
  revising: 'practice',
  done: 'success',
};

// ---- URL ----

/** The open card lives in the URL, so Back, reloads and links land on it. */
export function usePlanRoute() {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const item = params.get('item');
  const query = params.toString();
  const go = useCallback(
    (next: string | null) => {
      const q = new URLSearchParams(query);
      q.set('area', 'plan');
      if (next) q.set('item', next);
      else q.delete('item');
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [router, pathname, query],
  );
  return { item, go };
}

// ---- View choice ----

export type PlanView = 'list' | 'board';
export const PLAN_VIEW_KEY = 'inkduel-studio-plan-view';

function initialView(): PlanView {
  if (typeof window === 'undefined') return 'list';
  try {
    const stored = window.localStorage.getItem(PLAN_VIEW_KEY);
    if (stored === 'list' || stored === 'board') return stored;
  } catch {
    // Blocked storage: fall through to the default.
  }
  try {
    // Phones start on the list; wider screens on the board.
    return window.matchMedia('(max-width: 639px)').matches ? 'list' : 'board';
  } catch {
    return 'list';
  }
}

/** Lista | Tablero, remembered on this device. */
export function usePlanView(): [PlanView, (view: PlanView) => void] {
  const [view, setView] = useState<PlanView>(initialView);
  const choose = useCallback((next: PlanView) => {
    setView(next);
    try {
      window.localStorage.setItem(PLAN_VIEW_KEY, next);
    } catch {
      // Private mode or blocked storage: the choice just lasts this visit.
    }
  }, []);
  return [view, choose];
}

// ---- Names ----

export type SceneLookups = {
  /** Live characters by name. */
  characters: Entity<'characters'>[];
  places: Entity<'places'>[];
  /** Names of live entries only: ids of trashed or foreign ones resolve to null. */
  characterName: (id: string) => string | null;
  placeName: (id: string) => string | null;
  chapterTitle: (id: string) => string | null;
  chapters: { id: string; label: string }[];
  /** False while characters or places are still loading (an id may just not have arrived). */
  ready: boolean;
};

/** Resolves the ids on a card against the live characters, places and manuscript. */
export function useSceneLookups(): SceneLookups {
  const { store, overview, locale } = useStudio();
  const unnamed = PLAN_COPY[locale].unnamed;
  const characterState = useStudioCollection(store, 'characters');
  const placeState = useStudioCollection(store, 'places');
  return useMemo(() => {
    const collator = new Intl.Collator(INTL_LOCALE[locale], { sensitivity: 'base', numeric: true });
    const characters = [...characterState.items].sort((a, b) => collator.compare(a.fields.name, b.fields.name));
    const places = [...placeState.items].sort((a, b) => collator.compare(a.fields.name, b.fields.name));
    const characterNames = new Map(characters.map((c) => [c.id, c.fields.name || unnamed]));
    const placeNames = new Map(places.map((p) => [p.id, p.fields.name || unnamed]));
    const studio = STUDIO_COPY[locale].manuscript;
    const labels = { chapter: studio.chapterLabel, untitled: studio.untitledDraft };
    const chapters: { id: string; label: string }[] = [];
    const chapterTitles = new Map<string, string>();
    for (const entry of overview.manuscript) {
      const label = entryTitle(entry, labels);
      chapters.push({ id: entry.id, label });
      chapterTitles.set(entry.id, label);
      if (entry.chapterId) chapterTitles.set(entry.chapterId, label);
    }
    return {
      characters,
      places,
      characterName: (id) => characterNames.get(id) ?? null,
      placeName: (id) => placeNames.get(id) ?? null,
      chapterTitle: (id) => chapterTitles.get(id) ?? null,
      chapters,
      ready: characterState.status === 'ready' && placeState.status === 'ready',
    };
  }, [characterState.items, characterState.status, placeState.items, placeState.status, overview.manuscript, locale, unnamed]);
}

// ---- Filters ----

export type PlanFilters = {
  query: string;
  status: 'all' | SceneStatus;
  /** `s:<subplot>`, `t:<tag>` or `all`. */
  group: string;
  /** A character id (point of view or present) or `all`. */
  character: string;
};

export const NO_FILTERS: PlanFilters = { query: '', status: 'all', group: 'all', character: 'all' };

export const isFiltered = (f: PlanFilters) => f.query.trim() !== '' || f.status !== 'all' || f.group !== 'all' || f.character !== 'all';

export function filterScenes(scenes: readonly Entity<'scenes'>[], f: PlanFilters): Entity<'scenes'>[] {
  return scenes.filter((scene) => {
    const s = scene.fields;
    if (f.status !== 'all' && s.status !== f.status) return false;
    if (f.group.startsWith('s:') && !sameSubplot(s.subplot, f.group.slice(2))) return false;
    if (f.group.startsWith('t:') && !hasTag(s.tags, f.group.slice(2))) return false;
    if (f.character !== 'all' && s.povCharacterId !== f.character && !s.characterIds.includes(f.character)) return false;
    return matchesQuery(f.query, s.title, s.synopsis);
  });
}

// ---- Moving cards ----

/** What the views ask the area to do; the area talks to the store. */
export type MoveActions = {
  /** One step among the cards on screen. */
  nudge: (scene: Entity<'scenes'>, direction: 'up' | 'down', visibleIds: string[]) => void;
  /** The keyboard way across board columns: status only, plan order untouched. */
  setStatus: (scene: Entity<'scenes'>, status: SceneStatus, focus: 'left' | 'right') => void;
  /** A card dropped at [index] among the cards of [group] (without the dragged one). */
  drop: (id: string, group: string, index: number) => void;
  open: (id: string) => void;
};

export type DragState = { id: string; group: string | null; index: number };

/** Index (without the dragged card) where a card dropped at [clientY] would land. */
export function insertIndexAt(container: HTMLElement, clientY: number, draggingId: string): number {
  const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-plan-card]')).filter((el) => el.dataset.sceneId !== draggingId);
  for (let i = 0; i < cards.length; i += 1) {
    const rect = cards[i].getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return i;
  }
  return cards.length;
}

/**
 * Native HTML5 drag and drop. The grip is the only draggable part (a button
 * inside a draggable parent will not start a drag in Firefox); every group
 * (the list, each board column) is a drop target that works out the slot from
 * the pointer. The keyboard has its own buttons: drag is never required.
 */
export function useSceneDrag(onDrop: (id: string, group: string, index: number) => void) {
  const [drag, setDrag] = useState<DragState | null>(null);

  const handleProps = (id: string) => ({
    draggable: true as const,
    onDragStart: (event: DragEvent<HTMLElement>) => {
      const transfer = event.dataTransfer;
      if (transfer) {
        transfer.setData('text/plain', id);
        transfer.effectAllowed = 'move';
        const card = event.currentTarget.closest<HTMLElement>('[data-plan-card]');
        if (card && typeof transfer.setDragImage === 'function') transfer.setDragImage(card, 24, 24);
      }
      setDrag({ id, group: null, index: 0 });
    },
    onDragEnd: () => setDrag(null),
  });

  const groupProps = (group: string) => ({
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!drag) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      const index = insertIndexAt(event.currentTarget, event.clientY, drag.id);
      setDrag((current) => (current && (current.group !== group || current.index !== index) ? { ...current, group, index } : current));
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
      setDrag((current) => (current && current.group === group ? { ...current, group: null } : current));
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      if (!drag) return;
      event.preventDefault();
      const index = insertIndexAt(event.currentTarget, event.clientY, drag.id);
      setDrag(null);
      onDrop(drag.id, group, index);
    },
  });

  return { drag, handleProps, groupProps };
}

/** Class of a card while something is dragged over its group: a bar where it would land. */
export function dropBarClass(ids: readonly string[], group: string, drag: DragState | null, id: string): string {
  if (!drag) return '';
  if (drag.id === id) return 'opacity-50';
  if (drag.group !== group) return '';
  const others = ids.filter((other) => other !== drag.id);
  if (others[drag.index] === id) return 'shadow-[0_-4px_0_0_var(--ink-brand-blue)]';
  if (drag.index >= others.length && others[others.length - 1] === id) return 'shadow-[0_4px_0_0_var(--ink-brand-blue)]';
  return '';
}

export function GripIcon() {
  return (
    <svg width={16} height={20} viewBox="0 0 16 20" fill="currentColor" aria-hidden="true" focusable="false">
      {[4, 10, 16].map((y) => (
        <g key={y}>
          <circle cx="5" cy={y} r="1.5" />
          <circle cx="11" cy={y} r="1.5" />
        </g>
      ))}
    </svg>
  );
}

/**
 * A move control. It stays focusable at the edge of its range (aria-disabled,
 * not disabled) so a keyboard user pressing it repeatedly does not lose focus.
 */
export function MoveButton({
  label,
  move,
  disabled = false,
  onClick,
  children,
  className,
}: {
  label: string;
  move: 'up' | 'down' | 'left' | 'right';
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-move={move}
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (!disabled) onClick();
      }}
      className={cx(
        'ink-focus inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-control text-primary',
        disabled ? 'cursor-default text-disabled' : 'ink-dim hover:bg-sunken',
        className,
      )}
    >
      {children}
    </button>
  );
}

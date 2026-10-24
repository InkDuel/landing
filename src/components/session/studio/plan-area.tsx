'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { BoardIcon, ListIcon, PlusIcon } from '@/components/ink/icons';
import { InkButton } from '@/components/ink/ink-button';
import { InkChip } from '@/components/ink/ink-chip';
import { InkEmptyState, InkTextAction } from '@/components/ink/ink-states';
import { INTL_LOCALE } from '@/lib/i18n';
import { type Entity, SCENE_STATUSES, type SceneStatus } from '@/lib/session/studio/models';
import { countBy, nudgeScene, planSceneMove, type ScenePlacement, sortByPlanOrder, summarizeSubplots } from '@/lib/session/studio/plan-order';
import { EntityConflictError, useStudioCollection } from '@/lib/session/studio/studio-store';

import { PlanBoard, PlanList } from './plan-cards';
import {
  filterScenes,
  isFiltered,
  type MoveActions,
  NEW_SCENE,
  NO_FILTERS,
  type PlanFilters,
  type PlanView,
  SCENE_CAP,
  STATUS_TONE,
  usePlanCopy,
  usePlanRoute,
  usePlanView,
  useSceneLookups,
} from './plan-common';
import { SceneSheet } from './plan-scene-sheet';
import { SubplotPanel } from './plan-subplots';
import { TemplatesSheet } from './plan-templates';
import { useStudio } from './studio-context';
import { StudioInput, StudioSegmented, StudioSelect } from './studio-ui';
import { CollectionGate, collectTags, type RouteChange, useActiveItem } from './universe-common';

// Planificar (PRD §8.4–8.5): the author's private scene cards. Optional by
// design: nothing here is required to write, creating a card never publishes
// or creates a chapter, and the order is the plan's own, never the order of
// the published chapters.

const filterClass = 'min-w-[140px] flex-[1_1_150px]';

type StatusFilter = 'all' | SceneStatus;

export function PlanArea() {
  const copy = usePlanCopy();
  const { store, locale, toast } = useStudio();
  const route = usePlanRoute();
  const state = useStudioCollection(store, 'scenes');
  const lookups = useSceneLookups();
  const [view, setView] = usePlanView();
  const [filters, setFilters] = useState<PlanFilters>(NO_FILTERS);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const inflight = useRef(new Set<string>());

  const goTo = route.go;
  const goItem = useCallback((change: RouteChange) => goTo(change.item ?? null), [goTo]);
  const active = useActiveItem(state.items, state.status, route.item, goItem);

  const fmt = useCallback((n: number) => n.toLocaleString(INTL_LOCALE[locale]), [locale]);
  const ordered = useMemo(() => sortByPlanOrder(state.items), [state.items]);

  // Subplots and tags to filter by, and the filters that still point at
  // something that exists (a tag or a character can vanish after an edit).
  const groups = useMemo(() => {
    const collator = new Intl.Collator(INTL_LOCALE[locale], { sensitivity: 'base', numeric: true });
    const subplots = summarizeSubplots(
      state.items.map((scene) => scene.fields),
      SCENE_STATUSES,
      collator.compare,
    )
      .map((row) => row.name)
      .sort(collator.compare);
    const tags = collectTags(
      state.items.map((scene) => scene.fields.tags),
      locale,
    );
    return [
      ...subplots.map((name) => ({ value: `s:${name}`, label: copy.filters.subplot(name) })),
      ...tags.map((name) => ({ value: `t:${name}`, label: copy.filters.tag(name) })),
    ];
  }, [state.items, locale, copy]);

  const effective = useMemo<PlanFilters>(() => {
    const groupExists = filters.group === 'all' || groups.some((g) => g.value === filters.group || g.value.toLowerCase() === filters.group.toLowerCase());
    const characterExists = filters.character === 'all' || lookups.characters.some((c) => c.id === filters.character);
    return { ...filters, group: groupExists ? filters.group : 'all', character: characterExists ? filters.character : 'all' };
  }, [filters, groups, lookups.characters]);

  const visible = useMemo(() => filterScenes(ordered, effective), [ordered, effective]);
  const filtered = isFiltered(effective);
  const columns = useMemo(() => {
    const out = Object.fromEntries(SCENE_STATUSES.map((status) => [status, [] as Entity<'scenes'>[]])) as Record<SceneStatus, Entity<'scenes'>[]>;
    for (const scene of visible) out[scene.fields.status].push(scene);
    return out;
  }, [visible]);
  const counts = useMemo(() => countBy(visible, SCENE_STATUSES, (scene) => scene.fields.status), [visible]);

  const ready = state.status === 'ready';
  const atCap = state.items.length >= SCENE_CAP;
  const countText = !ready ? '' : filtered ? copy.countOf(fmt(visible.length), fmt(state.items.length)) : copy.count(state.items.length, fmt(state.items.length));
  const set = (patch: Partial<PlanFilters>) => setFilters((current) => ({ ...current, ...patch }));

  // ---- Moving cards ----

  const focusLater = (id: string, move: string) => {
    // The card may have changed place in the DOM: put the keyboard back on the control that was used.
    setTimeout(() => document.querySelector<HTMLElement>(`[data-scene-id="${id}"] [data-move="${move}"]`)?.focus(), 0);
  };

  /** Status first (its own save), then the plan order; one move per card at a time. */
  const run = async (scene: Entity<'scenes'>, op: { status?: SceneStatus; plan?: ScenePlacement | null; focus: string; message: string }) => {
    if (inflight.current.has(scene.id)) return;
    inflight.current.add(scene.id);
    try {
      if (op.status && op.status !== scene.fields.status) {
        await store.update('scenes', scene, { ...scene.fields, status: op.status });
      }
      if (op.plan) await store.moveScene(scene.id, op.plan.afterId, op.plan.beforeId, op.plan.order);
      setAnnouncement(op.message);
    } catch (error) {
      toast(error instanceof EntityConflictError ? copy.move.conflict : op.status ? copy.move.statusFailed : copy.move.failed);
    } finally {
      inflight.current.delete(scene.id);
      focusLater(scene.id, op.focus);
    }
  };

  const titleOf = (scene: Entity<'scenes'>) => scene.fields.title || copy.untitled;

  const actions: MoveActions = {
    open: (id) => route.go(id),
    nudge: (scene, direction, visibleIds) => {
      const plan = nudgeScene(state.items, visibleIds, scene.id, direction);
      if (!plan) return;
      const at = visibleIds.indexOf(scene.id) + (direction === 'up' ? 0 : 2);
      void run(scene, {
        plan,
        focus: direction,
        message: copy.move.movedTo(titleOf(scene), fmt(at), fmt(visibleIds.length)),
      });
    },
    // Across columns by keyboard the card keeps its place in the plan: only its status changes.
    setStatus: (scene, status, focus) =>
      void run(scene, { status, focus, message: copy.move.statusChanged(titleOf(scene), copy.status[status]) }),
    drop: (id, group, index) => {
      const scene = state.items.find((s) => s.id === id);
      if (!scene) return;
      const target = view === 'board' ? (SCENE_STATUSES.find((s) => s === group) ?? null) : null;
      if (view === 'board' && !target) return;
      const ids = (view === 'board' && target ? columns[target] : visible).map((s) => s.id);
      const plan = planSceneMove(state.items, id, ids, index);
      const status = target && target !== scene.fields.status ? target : undefined;
      if (!plan && !status) return;
      const position = plan ? ids.filter((other) => other !== id).slice(0, index).length + 1 : 0;
      void run(scene, {
        status,
        plan,
        focus: 'open',
        message: status
          ? copy.move.statusChanged(titleOf(scene), copy.status[status])
          : copy.move.movedTo(titleOf(scene), fmt(position), fmt(ids.length)),
      });
    },
  };

  const clear = () => setFilters(NO_FILTERS);
  const empty = ready && state.items.length === 0;

  return (
    <div className="flex flex-col gap-5 pb-8">
      <header className="flex flex-col gap-1">
        <h2 className="type-title-section text-primary">{copy.heading}</h2>
        {/* The one thing this order is not: the public order of the chapters. */}
        <p className="max-w-[62ch] type-body-sm text-secondary">{copy.privacy}</p>
      </header>

      <CollectionGate status={state.status} itemCount={state.items.length} errorTitle={copy.loadError} onRetry={() => void store.reload('scenes')}>
        {empty ? (
          <InkEmptyState
            title={copy.empty.title}
            message={copy.empty.message}
            action={
              <div className="flex flex-wrap gap-2">
                <InkButton fullWidth={false} leading={<PlusIcon size={20} />} onClick={() => route.go(NEW_SCENE)}>
                  {copy.add}
                </InkButton>
                <InkButton variant="secondary" fullWidth={false} onClick={() => setTemplatesOpen(true)}>
                  {copy.empty.useTemplate}
                </InkButton>
              </div>
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <StudioSegmented<PlanView>
                    label={copy.views.label}
                    hideLabel
                    value={view}
                    onChange={setView}
                    options={[
                      { value: 'list', label: copy.views.list, icon: <ListIcon size={16} /> },
                      { value: 'board', label: copy.views.board, icon: <BoardIcon size={16} /> },
                    ]}
                  />
                  <p role="status" aria-live="polite" className="min-h-5 type-caption text-secondary">
                    {countText}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <InkButton variant="secondary" fullWidth={false} disabled={atCap} onClick={() => setTemplatesOpen(true)}>
                    {copy.templatesButton}
                  </InkButton>
                  <InkButton fullWidth={false} disabled={atCap} leading={<PlusIcon size={20} />} onClick={() => route.go(NEW_SCENE)}>
                    {copy.add}
                  </InkButton>
                </div>
              </div>
              {atCap ? <p className="type-caption text-secondary">{copy.capReached(String(SCENE_CAP))}</p> : null}
              {visible.length > 0 ? (
                <ul aria-label={copy.heading} className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                  {SCENE_STATUSES.filter((status) => counts[status] > 0).map((status) => (
                    <li key={status}>
                      <InkChip tone={STATUS_TONE[status]}>{`${copy.status[status]} ${fmt(counts[status])}`}</InkChip>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div role="group" aria-label={copy.filters.label} className="flex flex-wrap items-end gap-3">
              <StudioInput
                type="search"
                label={copy.filters.search}
                placeholder={copy.filters.searchPlaceholder}
                value={filters.query}
                onChange={(query) => set({ query })}
                className="min-w-[220px] flex-[2_1_240px]"
              />
              <StudioSelect<StatusFilter>
                label={copy.filters.status}
                value={effective.status}
                onChange={(status) => set({ status })}
                className={filterClass}
                options={[{ value: 'all', label: copy.filters.allStatuses }, ...SCENE_STATUSES.map((s) => ({ value: s, label: copy.status[s] }))]}
              />
              {groups.length > 0 ? (
                <StudioSelect
                  label={copy.filters.group}
                  value={effective.group}
                  onChange={(group) => set({ group })}
                  className={filterClass}
                  options={[{ value: 'all', label: copy.filters.allGroups }, ...groups]}
                />
              ) : null}
              {lookups.characters.length > 0 ? (
                <StudioSelect
                  label={copy.filters.character}
                  value={effective.character}
                  onChange={(character) => set({ character })}
                  className={filterClass}
                  options={[
                    { value: 'all', label: copy.filters.allCharacters },
                    ...lookups.characters.map((c) => ({ value: c.id, label: c.fields.name || copy.unnamed })),
                  ]}
                />
              ) : null}
            </div>

            {visible.length === 0 ? (
              <div className="flex flex-col items-start gap-1 py-6">
                <p className="type-body text-secondary">{copy.noMatches}</p>
                <InkTextAction onClick={clear}>{copy.clearFilters}</InkTextAction>
              </div>
            ) : view === 'list' ? (
              <PlanList scenes={visible} lookups={lookups} actions={actions} />
            ) : (
              <PlanBoard columns={columns} lookups={lookups} actions={actions} menuId={menuId} onMenu={setMenuId} />
            )}

            <SubplotPanel scenes={state.items} onShow={(name) => set({ group: `s:${name}` })} />
          </>
        )}
      </CollectionGate>

      {/* What happened after a move, for those who cannot see the card land. */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <SceneSheet open={active.open} entity={active.entity} total={state.items.length} onClose={() => route.go(null)} />
      <TemplatesSheet open={templatesOpen} total={state.items.length} onClose={() => setTemplatesOpen(false)} />
    </div>
  );
}

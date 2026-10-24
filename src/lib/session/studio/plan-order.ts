// Pure helpers of the planner (PRD §8.4): the private plan order and the
// subplot summary. Nothing here touches the network or the public chapter
// order: a scene card only ever carries its own `order` in the plan.
//
// The backend (MoveStudioScene) places a card between two neighbours of the
// WHOLE plan: midpoint when it gets both, +1024 after the last, -1024 before
// the first. A filtered list or a board column only shows part of that
// sequence, so a move made there must be translated into neighbours of the
// global sequence: «right after the visible predecessor».

export type Positioned = { id: string; order: number };

/** Gap the backend leaves between cards (studioOrderStep). */
export const ORDER_STEP = 1024;

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** The plan sequence: by `order`, ties broken by id so it never flickers. */
export function sortByPlanOrder<T extends Positioned>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order || byId(a.id, b.id));
}

/** The order the backend will give a card placed between two neighbours. */
export function orderBetween(after: number | null, before: number | null): number {
  if (after !== null && before !== null) return (after + before) / 2;
  if (after !== null) return after + ORDER_STEP;
  if (before !== null) return before - ORDER_STEP;
  return ORDER_STEP;
}

/** Neighbours in the global plan plus the order to show until the server answers. */
export type ScenePlacement = { afterId: string | null; beforeId: string | null; order: number };

/**
 * Places [movingId] inside [visibleIds] (the cards on screen, in order, the
 * moving one may be among them) at [index], counted over the visible cards
 * without the moving one: 0 = before the first, n = after the last.
 *
 * - After a visible predecessor: afterId is that predecessor and beforeId the
 *   card that follows it in the global plan (it may be hidden by a filter).
 * - At the very start: beforeId is the first visible card and afterId the
 *   global card that precedes it (possibly hidden, possibly none).
 *
 * Returns null when nothing would change (same spot, or no visible card to
 * anchor to, as in an empty board column).
 */
export function planSceneMove(
  scenes: readonly Positioned[],
  movingId: string,
  visibleIds: readonly string[],
  index: number,
): ScenePlacement | null {
  const moving = scenes.find((s) => s.id === movingId);
  if (!moving) return null;
  const sequence = sortByPlanOrder(scenes).filter((s) => s.id !== movingId);
  const position = new Map(sequence.map((s, i) => [s.id, i]));
  const visible = visibleIds.filter((id) => id === movingId || position.has(id));
  const others = visible.filter((id) => id !== movingId);
  if (others.length === 0) return null;

  const at = Math.max(0, Math.min(Math.trunc(index), others.length));
  if (visible.indexOf(movingId) === at) return null;

  let after: Positioned | null;
  let before: Positioned | null;
  if (at === 0) {
    const successor = position.get(others[0]) as number;
    after = successor > 0 ? sequence[successor - 1] : null;
    before = sequence[successor];
  } else {
    const predecessor = position.get(others[at - 1]) as number;
    after = sequence[predecessor];
    before = sequence[predecessor + 1] ?? null;
  }
  return {
    afterId: after?.id ?? null,
    beforeId: before?.id ?? null,
    order: orderBetween(after?.order ?? null, before?.order ?? null),
  };
}

/** One step up or down among the visible cards (the keyboard alternative to dragging). */
export function nudgeScene(
  scenes: readonly Positioned[],
  visibleIds: readonly string[],
  movingId: string,
  direction: 'up' | 'down',
): ScenePlacement | null {
  const current = visibleIds.indexOf(movingId);
  if (current === -1) return null;
  const at = direction === 'up' ? current - 1 : current + 1;
  if (at < 0 || at > visibleIds.length - 1) return null;
  return planSceneMove(scenes, movingId, visibleIds, at);
}

/** Cards per value, in a fixed order of keys (zero included). */
export function countBy<T, K extends string>(items: readonly T[], keys: readonly K[], keyOf: (item: T) => K): Record<K, number> {
  const out = Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
  for (const item of items) {
    const key = keyOf(item);
    if (key in out) out[key] += 1;
  }
  return out;
}

export type SubplotSummary<S extends string> = {
  /** First spelling seen (subplots are compared ignoring case and spacing). */
  name: string;
  total: number;
  byStatus: Record<S, number>;
};

const subplotKey = (name: string) => name.split(/\s+/).filter(Boolean).join(' ').toLowerCase();

/**
 * The subplots in use: distinct `subplot` values with how many cards each has
 * per status. Derived on the fly; nothing is stored anywhere.
 */
export function summarizeSubplots<S extends string>(
  scenes: readonly { subplot: string; status: S }[],
  statuses: readonly S[],
  collate: (a: string, b: string) => number = (a, b) => a.localeCompare(b),
): SubplotSummary<S>[] {
  const found = new Map<string, SubplotSummary<S>>();
  for (const scene of scenes) {
    const key = subplotKey(scene.subplot);
    if (!key) continue;
    let entry = found.get(key);
    if (!entry) {
      entry = {
        name: scene.subplot.split(/\s+/).filter(Boolean).join(' '),
        total: 0,
        byStatus: Object.fromEntries(statuses.map((s) => [s, 0])) as Record<S, number>,
      };
      found.set(key, entry);
    }
    entry.total += 1;
    if (scene.status in entry.byStatus) entry.byStatus[scene.status] += 1;
  }
  return [...found.values()].sort((a, b) => b.total - a.total || collate(a.name, b.name));
}

/** Whether two spellings of a subplot name are the same subplot. */
export const sameSubplot = (a: string, b: string) => subplotKey(a) === subplotKey(b);

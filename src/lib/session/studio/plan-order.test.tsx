import { describe, expect, it } from 'vitest';

import { nudgeScene, ORDER_STEP, orderBetween, planSceneMove, sameSubplot, sortByPlanOrder, summarizeSubplots } from './plan-order';

// A..E in the plan, 1024 apart.
const plan = ['A', 'B', 'C', 'D', 'E'].map((id, i) => ({ id, order: (i + 1) * ORDER_STEP }));
const orderOf = (id: string) => plan.find((s) => s.id === id)!.order;

describe('plan order', () => {
  it('sorts by order and breaks ties by id', () => {
    const sorted = sortByPlanOrder([
      { id: 'b', order: 2 },
      { id: 'z', order: 1 },
      { id: 'a', order: 2 },
    ]);
    expect(sorted.map((s) => s.id)).toEqual(['z', 'a', 'b']);
  });

  it('mirrors the backend: midpoint between two neighbours, a step beyond the ends', () => {
    expect(orderBetween(1024, 2048)).toBe(1536);
    expect(orderBetween(2048, null)).toBe(2048 + ORDER_STEP);
    expect(orderBetween(null, 1024)).toBe(1024 - ORDER_STEP);
  });

  it('moves down in the full list: after the next card, before the one that follows it', () => {
    const move = planSceneMove(plan, 'B', ['A', 'B', 'C', 'D', 'E'], 2);
    expect(move).toEqual({ afterId: 'C', beforeId: 'D', order: (orderOf('C') + orderOf('D')) / 2 });
  });

  it('moves to the very start and the very end of the plan', () => {
    const start = planSceneMove(plan, 'D', ['A', 'B', 'C', 'D', 'E'], 0);
    expect(start).toEqual({ afterId: null, beforeId: 'A', order: orderOf('A') - ORDER_STEP });
    const end = planSceneMove(plan, 'B', ['A', 'B', 'C', 'D', 'E'], 4);
    expect(end).toEqual({ afterId: 'E', beforeId: null, order: orderOf('E') + ORDER_STEP });
  });

  it('in a filtered view lands right after the VISIBLE predecessor, ahead of hidden cards that followed it', () => {
    // B and D are hidden by a filter; the author sees A, C, E.
    const visible = ['A', 'C', 'E'];
    const move = planSceneMove(plan, 'E', visible, 1); // between A and C on screen
    expect(move).toEqual({ afterId: 'A', beforeId: 'B', order: (orderOf('A') + orderOf('B')) / 2 });
    // The result puts E right after A, before the hidden B.
    expect(move!.order).toBeGreaterThan(orderOf('A'));
    expect(move!.order).toBeLessThan(orderOf('B'));
  });

  it('at the start of a filtered view goes right before the first visible card', () => {
    const move = planSceneMove(plan, 'E', ['C', 'E'], 0); // A and B hidden before C
    expect(move).toEqual({ afterId: 'B', beforeId: 'C', order: (orderOf('B') + orderOf('C')) / 2 });
  });

  it('does not count the moving card as its own neighbour', () => {
    // Moving C one step down in a view that hides D: it goes after E (the next visible one).
    const move = planSceneMove(plan, 'C', ['A', 'C', 'E'], 2);
    expect(move).toEqual({ afterId: 'E', beforeId: null, order: orderOf('E') + ORDER_STEP });
    // Moving up past a hidden card: before A.
    const up = planSceneMove(plan, 'C', ['A', 'C', 'E'], 0);
    expect(up).toEqual({ afterId: null, beforeId: 'A', order: orderOf('A') - ORDER_STEP });
  });

  it('returns null when nothing would change or there is nothing to anchor to', () => {
    expect(planSceneMove(plan, 'B', ['A', 'B', 'C'], 1)).toBeNull(); // same spot
    expect(planSceneMove(plan, 'B', ['B'], 0)).toBeNull(); // alone in the column
    expect(planSceneMove(plan, 'B', [], 0)).toBeNull();
    expect(planSceneMove(plan, 'zzz', ['A', 'B'], 0)).toBeNull(); // unknown card
  });

  it('ignores visible ids the plan no longer has and clamps the index', () => {
    const move = planSceneMove(plan, 'A', ['A', 'ghost', 'B'], 99);
    expect(move).toEqual({ afterId: 'B', beforeId: 'C', order: (orderOf('B') + orderOf('C')) / 2 });
  });

  it('nudges one step up or down among the visible cards and stops at the ends', () => {
    const visible = ['A', 'C', 'E'];
    expect(nudgeScene(plan, visible, 'C', 'down')).toEqual({ afterId: 'E', beforeId: null, order: orderOf('E') + ORDER_STEP });
    expect(nudgeScene(plan, visible, 'C', 'up')).toEqual({ afterId: null, beforeId: 'A', order: orderOf('A') - ORDER_STEP });
    expect(nudgeScene(plan, visible, 'A', 'up')).toBeNull();
    expect(nudgeScene(plan, visible, 'E', 'down')).toBeNull();
    expect(nudgeScene(plan, visible, 'B', 'down')).toBeNull(); // not on screen
  });
});

describe('subplot summary', () => {
  const statuses = ['idea', 'planned', 'done'] as const;

  it('groups the same subplot ignoring case and spacing, counts per status, skips scenes without one', () => {
    const summary = summarizeSubplots(
      [
        { subplot: 'La carta', status: 'idea' },
        { subplot: ' la  CARTA ', status: 'done' },
        { subplot: 'El viaje', status: 'planned' },
        { subplot: '   ', status: 'idea' },
        { subplot: '', status: 'done' },
      ],
      statuses,
    );
    expect(summary).toEqual([
      { name: 'La carta', total: 2, byStatus: { idea: 1, planned: 0, done: 1 } },
      { name: 'El viaje', total: 1, byStatus: { idea: 0, planned: 1, done: 0 } },
    ]);
    expect(sameSubplot('La  carta', 'la carta')).toBe(true);
    expect(sameSubplot('La carta', 'El viaje')).toBe(false);
  });
});

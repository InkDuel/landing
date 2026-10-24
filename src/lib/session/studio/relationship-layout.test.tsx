import { describe, expect, it } from 'vitest';

import {
  edgeGeometry,
  edgeOffsets,
  layoutRelationshipGraph,
  MAX_SCALE,
  MAX_SINGLE_RING,
  minNodeDistance,
  NODE_RADIUS,
  zoomView,
} from './relationship-layout';

const names = ['Ana', 'Álvaro', 'Beto', 'Carla', 'Dani', 'Elena', 'Fran', 'Gaby', 'Hugo', 'Inés'];
const make = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `id-${String(i).padStart(3, '0')}`, name: `${names[i % names.length]} ${i}` }));

describe('relationship graph layout', () => {
  it('is deterministic: the same characters land on the same spots in any input order', () => {
    const nodes = make(20);
    const shuffled = [...nodes].reverse().sort((a, b) => (a.id.charCodeAt(5) % 3) - (b.id.charCodeAt(5) % 3));
    expect(layoutRelationshipGraph(shuffled)).toEqual(layoutRelationshipGraph(nodes));
    expect(layoutRelationshipGraph(nodes)).toEqual(layoutRelationshipGraph(nodes));
  });

  it('sorts by name ignoring accents and case, ties by id', () => {
    const layout = layoutRelationshipGraph([
      { id: 'b', name: 'beto' },
      { id: 'a2', name: 'Ana' },
      { id: 'a1', name: 'Ana' },
      { id: 'c', name: 'Álvaro' },
    ]);
    expect(layout.nodes.map((n) => n.id)).toEqual(['c', 'a1', 'a2', 'b']);
  });

  it.each([0, 1, 2, 3, 8, MAX_SINGLE_RING, MAX_SINGLE_RING + 1, 40, 120])('keeps %i nodes apart', (count) => {
    const layout = layoutRelationshipGraph(make(count));
    expect(layout.nodes).toHaveLength(count);
    expect(new Set(layout.nodes.map((n) => n.id)).size).toBe(count);
    // Never closer than two radii plus a margin, so circles cannot overlap.
    expect(minNodeDistance(layout.nodes)).toBeGreaterThanOrEqual(2 * NODE_RADIUS + 24);
    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(layout.bounds.minX);
      expect(node.x).toBeLessThanOrEqual(layout.bounds.minX + layout.bounds.width);
      expect(node.y).toBeGreaterThanOrEqual(layout.bounds.minY);
      expect(node.y).toBeLessThanOrEqual(layout.bounds.minY + layout.bounds.height);
    }
  });

  it('uses one ring up to 16 nodes and two concentric rings beyond', () => {
    expect(new Set(layoutRelationshipGraph(make(MAX_SINGLE_RING)).nodes.map((n) => n.ring))).toEqual(new Set([0]));
    const two = layoutRelationshipGraph(make(MAX_SINGLE_RING + 1));
    expect(new Set(two.nodes.map((n) => n.ring))).toEqual(new Set([0, 1]));
    const radius = (ring: 0 | 1) => {
      const n = two.nodes.find((node) => node.ring === ring)!;
      return Math.hypot(n.x, n.y);
    };
    expect(radius(0)).toBeGreaterThan(radius(1));
  });
});

describe('relationship graph edges and zoom', () => {
  it('fans parallel edges apart and keeps a lone edge straight', () => {
    const offsets = edgeOffsets([
      { id: 'e1', from: 'a', to: 'b' },
      { id: 'e2', from: 'b', to: 'a' },
      { id: 'e3', from: 'a', to: 'c' },
    ]);
    expect(offsets.get('e3')).toBe(0);
    // Two edges between the same pair sit on opposite sides of the chord.
    const a = { x: 0, y: 0 };
    const b = { x: 200, y: 0 };
    const first = edgeGeometry(a, b, offsets.get('e1')!, NODE_RADIUS);
    const second = edgeGeometry(b, a, offsets.get('e2')!, NODE_RADIUS);
    expect(Math.sign(first.label.y)).toBe(-Math.sign(second.label.y));
    expect(Math.abs(first.label.y)).toBeGreaterThan(0);
    const geometry = edgeGeometry({ x: 0, y: 0 }, { x: 200, y: 0 }, 0, NODE_RADIUS);
    expect(geometry.path.startsWith('M')).toBe(true);
    expect(geometry.path).not.toContain('Q');
    expect(geometry.start.x).toBeCloseTo(NODE_RADIUS);
    expect(geometry.end.x).toBeCloseTo(200 - NODE_RADIUS);
    expect(edgeGeometry({ x: 0, y: 0 }, { x: 200, y: 0 }, 38, NODE_RADIUS).path).toContain('Q');
  });

  it('zooms around the cursor and clamps the scale', () => {
    const view = zoomView({ scale: 1, x: 0, y: 0 }, 2, { x: 100, y: 50 });
    expect(view).toEqual({ scale: 2, x: -100, y: -50 });
    // The world point under the cursor stays under the cursor.
    expect(100 * 2 + view.x).toBe(100);
    expect(zoomView(view, 99, { x: 0, y: 0 }).scale).toBe(MAX_SCALE);
  });
});

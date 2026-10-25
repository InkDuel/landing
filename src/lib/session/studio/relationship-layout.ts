// Pure layout math of the relationship graph (PRD §8.3): a deterministic,
// physics-free placement. Nodes are sorted by name and sit on a circle; past
// 16 nodes they alternate between two concentric rings. The same characters
// always land on the same spots, whatever order they arrive in, and no two
// nodes ever overlap. The SVG component only draws what this module computes.

export type LayoutNode = { id: string; name: string };
export type PositionedNode = { id: string; x: number; y: number; ring: 0 | 1 };
export type Bounds = { minX: number; minY: number; width: number; height: number };
export type GraphLayout = { nodes: PositionedNode[]; nodeRadius: number; bounds: Bounds };
export type Point = { x: number; y: number };

export const NODE_RADIUS = 24;
/** Minimum distance between two node centres (room for a 14-char label). */
export const NODE_SPACING = 120;
/** More nodes than this are split over two rings. */
export const MAX_SINGLE_RING = 16;
const MIN_RING_RADIUS = 150;
const PAD_X = 76;
const PAD_Y = 64;
const MIN_WIDTH = 360;
const MIN_HEIGHT = 300;

const fold = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Stable order: accent/case-insensitive name, then id. Locale independent. */
function byNameThenId(a: LayoutNode, b: LayoutNode): number {
  const fa = fold(a.name);
  const fb = fold(b.name);
  if (fa < fb) return -1;
  if (fa > fb) return 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

const round = (n: number) => Math.round(n * 100) / 100;

function ringRadius(count: number): number {
  if (count <= 1) return 0;
  return Math.max(MIN_RING_RADIUS, NODE_SPACING / (2 * Math.sin(Math.PI / count)));
}

function place(ids: string[], radius: number, ring: 0 | 1, startAngle: number): PositionedNode[] {
  return ids.map((id, index) => {
    const angle = startAngle + (2 * Math.PI * index) / ids.length;
    return { id, x: round(radius * Math.cos(angle)), y: round(radius * Math.sin(angle)), ring };
  });
}

export function layoutRelationshipGraph(input: readonly LayoutNode[]): GraphLayout {
  const sorted = [...input].sort(byNameThenId);
  const top = -Math.PI / 2;
  let nodes: PositionedNode[];

  if (sorted.length === 0) {
    nodes = [];
  } else if (sorted.length === 1) {
    nodes = [{ id: sorted[0].id, x: 0, y: 0, ring: 0 }];
  } else if (sorted.length <= MAX_SINGLE_RING) {
    nodes = place(
      sorted.map((n) => n.id),
      ringRadius(sorted.length),
      0,
      top,
    );
  } else {
    // 3 of every 5 names go to the outer ring, 2 to the inner one, so both
    // rings read alphabetically all the way round.
    const outer: string[] = [];
    const inner: string[] = [];
    sorted.forEach((node, index) => (index % 5 === 1 || index % 5 === 3 ? inner : outer).push(node.id));
    const innerRadius = ringRadius(inner.length);
    const outerRadius = Math.max(innerRadius + NODE_SPACING, ringRadius(outer.length));
    nodes = [
      ...place(outer, outerRadius, 0, top),
      // Staggered by half a step so spokes do not line up.
      ...place(inner, innerRadius, 1, top + Math.PI / inner.length),
    ];
  }

  return { nodes, nodeRadius: NODE_RADIUS, bounds: boundsOf(nodes) };
}

function boundsOf(nodes: readonly PositionedNode[]): Bounds {
  if (nodes.length === 0) return { minX: -MIN_WIDTH / 2, minY: -MIN_HEIGHT / 2, width: MIN_WIDTH, height: MIN_HEIGHT };
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs) - PAD_X;
  const maxX = Math.max(...xs) + PAD_X;
  const minY = Math.min(...ys) - PAD_Y;
  const maxY = Math.max(...ys) + PAD_Y;
  const width = Math.max(MIN_WIDTH, maxX - minX);
  const height = Math.max(MIN_HEIGHT, maxY - minY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return { minX: round(cx - width / 2), minY: round(cy - height / 2), width: round(width), height: round(height) };
}

/** Smallest centre-to-centre distance in a layout (Infinity below 2 nodes). */
export function minNodeDistance(nodes: readonly PositionedNode[]): number {
  let min = Infinity;
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      min = Math.min(min, Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y));
    }
  }
  return min;
}

// ---- Edges ----

export type EdgeRef = { id: string; from: string; to: string };

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Perpendicular offset (px) of each edge's midpoint. A lone edge between two
 * characters is straight (0); several share the gap, side by side. The sign
 * is relative to the pair's canonical direction (smaller id first), so the
 * same edge keeps its side whichever way it points.
 */
export function edgeOffsets(edges: readonly EdgeRef[], gap = 38): Map<string, number> {
  const groups = new Map<string, EdgeRef[]>();
  for (const edge of edges) {
    const key = pairKey(edge.from, edge.to);
    groups.set(key, [...(groups.get(key) ?? []), edge]);
  }
  const offsets = new Map<string, number>();
  for (const group of groups.values()) {
    const ordered = [...group].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    ordered.forEach((edge, index) => {
      const canonical = edge.from < edge.to ? 1 : -1;
      offsets.set(edge.id, round((index - (ordered.length - 1) / 2) * gap * canonical));
    });
  }
  return offsets;
}

export type EdgeGeometry = { path: string; label: Point; start: Point; end: Point };

/**
 * A straight or slightly curved path from one node's rim to the other's,
 * leaving [arrowGap] px before the target for the arrowhead.
 */
export function edgeGeometry(from: Point, to: Point, offset: number, nodeRadius: number, arrowGap = 0): EdgeGeometry {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const control: Point = { x: (from.x + to.x) / 2 - uy * offset * 2, y: (from.y + to.y) / 2 + ux * offset * 2 };

  const toward = (origin: Point, target: Point, distance: number): Point => {
    const vx = target.x - origin.x;
    const vy = target.y - origin.y;
    const len = Math.hypot(vx, vy) || 1;
    return { x: origin.x + (vx / len) * distance, y: origin.y + (vy / len) * distance };
  };
  const start = toward(from, control, nodeRadius);
  const end = toward(to, control, nodeRadius + arrowGap);
  const label: Point = {
    x: 0.25 * start.x + 0.5 * control.x + 0.25 * end.x,
    y: 0.25 * start.y + 0.5 * control.y + 0.25 * end.y,
  };
  const p = (n: number) => round(n);
  const path =
    offset === 0
      ? `M ${p(start.x)} ${p(start.y)} L ${p(end.x)} ${p(end.y)}`
      : `M ${p(start.x)} ${p(start.y)} Q ${p(control.x)} ${p(control.y)} ${p(end.x)} ${p(end.y)}`;
  return { path, label: { x: p(label.x), y: p(label.y) }, start, end };
}

// ---- Zoom and pan ----

export type View = { scale: number; x: number; y: number };
export const IDENTITY_VIEW: View = { scale: 1, x: 0, y: 0 };
export const MIN_SCALE = 0.4;
export const MAX_SCALE = 3;

export const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

/**
 * Rescales keeping [anchor] (in the same units as the translation) fixed on
 * screen: the point under the cursor stays under the cursor.
 */
export function zoomView(view: View, nextScale: number, anchor: Point): View {
  const scale = clampScale(nextScale);
  if (scale === view.scale) return view;
  const ratio = scale / view.scale;
  return {
    scale: round(scale * 1000) / 1000,
    x: round(anchor.x - (anchor.x - view.x) * ratio),
    y: round(anchor.y - (anchor.y - view.y) * ratio),
  };
}

// ---- Screen ↔ graph units ----

/** Pixels per graph unit when the viewBox is fitted into the element ("meet"). */
export function fitScale(width: number, height: number, bounds: Bounds): number {
  return Math.min(width / bounds.width, height / bounds.height) || 1;
}

/** A pointer position (client pixels) in the units of the viewBox. */
export function clientToUnits(
  rect: { left: number; top: number; width: number; height: number },
  bounds: Bounds,
  clientX: number,
  clientY: number,
): Point {
  const scale = fitScale(rect.width, rect.height, bounds);
  const offsetX = (rect.width - bounds.width * scale) / 2;
  const offsetY = (rect.height - bounds.height * scale) / 2;
  return {
    x: bounds.minX + (clientX - rect.left - offsetX) / scale,
    y: bounds.minY + (clientY - rect.top - offsetY) / scale,
  };
}

/** Translation that puts the middle of [bounds] in the middle of the screen at [scale]. */
export function centeredView(bounds: Bounds, scale: number): View {
  const cx = bounds.minX + bounds.width / 2;
  const cy = bounds.minY + bounds.height / 2;
  return { scale, x: round(cx * (1 - scale)), y: round(cy * (1 - scale)) };
}

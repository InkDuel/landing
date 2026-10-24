'use client';

import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { RelationFields, RelationType } from '@/lib/session/studio/models';
import {
  centeredView,
  clientToUnits,
  edgeGeometry,
  edgeOffsets,
  fitScale,
  IDENTITY_VIEW,
  layoutRelationshipGraph,
  type Point,
  type View,
  zoomView,
} from '@/lib/session/studio/relationship-layout';

import { useUniverseCopy } from './universe-common';

// The relationship graph (PRD §8.3): a simple SVG view of the same data the
// list edits. Layout is deterministic and computed in relationship-layout.ts;
// there is no physics. Colour never carries meaning alone: every type also has
// its own dash pattern and a written legend. The list is the accessible way to
// edit; the graph only needs to be navigable: nodes are buttons, the canvas
// pans with the arrow keys and zooms with + and −. No transitions at all, so
// prefers-reduced-motion is respected by construction.

/** Colours come from the Ink tokens; dashes keep types apart without colour. */
export const RELATION_STYLE: Record<RelationType, { color: string; dash: string | undefined }> = {
  family: { color: 'var(--ink-league-escriba)', dash: undefined },
  friendship: { color: 'var(--ink-brand-blue)', dash: undefined },
  romance: { color: 'var(--ink-brand-pink)', dash: undefined },
  rivalry: { color: 'var(--ink-warning)', dash: '10 5' },
  mentorship: { color: 'var(--ink-league-narrador)', dash: '2 5' },
  alliance: { color: 'var(--ink-league-aprendiz)', dash: '14 4 3 4' },
  antagonism: { color: 'var(--ink-danger)', dash: '5 3' },
  other: { color: 'var(--ink-text-tertiary)', dash: '1 6' },
};

export type GraphCharacter = { id: string; name: string };
export type GraphRelation = {
  id: string;
  from: string;
  to: string;
  type: RelationType;
  label: string;
  directed: boolean;
  status: RelationFields['status'];
};

const ZOOM_STEP = 1.25;
const PAN_STEP = 48;

const clip = (value: string, max: number) => {
  const chars = Array.from(value);
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : value;
};

export function RelationshipGraph({
  characters,
  relations,
  isolated,
  onOpenCharacter,
}: {
  /** Every live character (names). */
  characters: readonly GraphCharacter[];
  /** The relations to draw (already filtered, both ends live). */
  relations: readonly GraphRelation[];
  /** Live characters with no relation at all, for the note under the graph. */
  isolated: number;
  onOpenCharacter: (id: string) => void;
}) {
  const copy = useUniverseCopy().relations;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const helpId = `${uid}-help`;
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Point | null>(null);
  const [view, setView] = useState<View>(IDENTITY_VIEW);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const activeId = focused ?? hovered;

  const names = useMemo(() => new Map(characters.map((c) => [c.id, c.name])), [characters]);

  const model = useMemo(() => {
    const drawn = relations.filter((r) => names.has(r.from) && names.has(r.to));
    const connected = new Set(drawn.flatMap((r) => [r.from, r.to]));
    const nodes = characters.filter((c) => connected.has(c.id));
    const layout = layoutRelationshipGraph(nodes);
    const pos = new Map(layout.nodes.map((n) => [n.id, n]));
    const offsets = edgeOffsets(drawn);
    const degree = new Map<string, number>();
    const neighbours = new Map<string, Set<string>>();
    for (const r of drawn) {
      degree.set(r.from, (degree.get(r.from) ?? 0) + 1);
      degree.set(r.to, (degree.get(r.to) ?? 0) + 1);
      neighbours.set(r.from, (neighbours.get(r.from) ?? new Set()).add(r.to));
      neighbours.set(r.to, (neighbours.get(r.to) ?? new Set()).add(r.from));
    }
    const edges = drawn.flatMap((r) => {
      const a = pos.get(r.from);
      const b = pos.get(r.to);
      if (!a || !b) return [];
      return [{ relation: r, geometry: edgeGeometry(a, b, offsets.get(r.id) ?? 0, layout.nodeRadius, r.directed ? 3 : 0) }];
    });
    const types = [...new Set(drawn.map((r) => r.type))];
    return { layout, pos, degree, neighbours, edges, types, nodes };
  }, [characters, relations, names]);

  const { bounds } = model.layout;

  // Wheel zoom needs a non-passive listener to keep the page from scrolling.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const anchor = clientToUnits(svg.getBoundingClientRect(), bounds, event.clientX, event.clientY);
      const factor = Math.exp(-event.deltaY * 0.0015);
      setView((v) => zoomView(v, v.scale * factor, anchor));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [bounds, model.nodes.length]);

  const middle: Point = { x: bounds.minX + bounds.width / 2, y: bounds.minY + bounds.height / 2 };
  const zoomBy = (factor: number) => setView((v) => zoomView(v, v.scale * factor, middle));
  const center = () => setView((v) => centeredView(bounds, v.scale));
  const reset = () => setView(IDENTITY_VIEW);

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 || (event.target as Element).closest('[data-graph-node]')) return;
    drag.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const last = drag.current;
    if (!last) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const perPixel = 1 / fitScale(rect.width, rect.height, bounds);
    const dx = (event.clientX - last.x) * perPixel;
    const dy = (event.clientY - last.y) * perPixel;
    drag.current = { x: event.clientX, y: event.clientY };
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };
  const endDrag = (event: PointerEvent<SVGSVGElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onCanvasKey = (event: KeyboardEvent<HTMLDivElement>) => {
    // Only when the canvas itself has focus: on a node, arrows stay with it.
    if (event.target !== event.currentTarget) return;
    const move = (dx: number, dy: number) => setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    switch (event.key) {
      case 'ArrowLeft':
        move(PAN_STEP, 0);
        break;
      case 'ArrowRight':
        move(-PAN_STEP, 0);
        break;
      case 'ArrowUp':
        move(0, PAN_STEP);
        break;
      case 'ArrowDown':
        move(0, -PAN_STEP);
        break;
      case '+':
      case '=':
        zoomBy(ZOOM_STEP);
        break;
      case '-':
      case '_':
        zoomBy(1 / ZOOM_STEP);
        break;
      case '0':
        reset();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  if (characters.length < 2) {
    return (
      <div className="flex flex-col items-start gap-1 py-6">
        <h3 className="type-title-section text-primary">{copy.graph.emptyTitle}</h3>
        <p className="type-body text-secondary">{copy.graph.emptyMessage}</p>
      </div>
    );
  }
  if (model.nodes.length === 0) {
    return <p className="py-6 type-body text-secondary">{copy.graph.noRelations}</p>;
  }

  const highlighted = (id: string) => activeId === null || id === activeId || model.neighbours.get(activeId)?.has(id) === true;
  const showAllLabels = model.edges.length <= 10;
  const viewBox = `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`;
  const buttonClass = 'ink-focus ink-dim inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border-quiet border-control bg-surface px-3 type-button-sm text-primary';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-label={copy.graph.zoomOut} title={copy.graph.zoomOut} onClick={() => zoomBy(1 / ZOOM_STEP)} className={buttonClass}>
          <span aria-hidden="true" className="text-[20px] leading-none">
            −
          </span>
        </button>
        <button type="button" aria-label={copy.graph.zoomIn} title={copy.graph.zoomIn} onClick={() => zoomBy(ZOOM_STEP)} className={buttonClass}>
          <span aria-hidden="true" className="text-[20px] leading-none">
            +
          </span>
        </button>
        <button type="button" onClick={reset} className={buttonClass}>
          {copy.graph.zoomReset}
        </button>
        <button type="button" onClick={center} className={buttonClass}>
          {copy.graph.center}
        </button>
      </div>

      <div
        tabIndex={0}
        role="group"
        aria-label={copy.graph.label}
        aria-describedby={helpId}
        onKeyDown={onCanvasKey}
        className="ink-focus overflow-hidden rounded-card border-quiet border-divider bg-surface"
      >
        <svg
          ref={svgRef}
          viewBox={viewBox}
          className="block h-[min(68vh,560px)] min-h-[320px] w-full cursor-grab touch-none select-none active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <defs>
            {model.types.map((type) => (
              <marker
                key={type}
                id={`${uid}-arrow-${type}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M0 0 L10 5 L0 10 z" style={{ fill: RELATION_STYLE[type].color }} />
              </marker>
            ))}
          </defs>
          <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
            {model.edges.map(({ relation, geometry }) => {
              const style = RELATION_STYLE[relation.type];
              const touching = activeId !== null && (relation.from === activeId || relation.to === activeId);
              const dim = activeId !== null && !touching;
              const what = relation.label || copy.types[relation.type];
              const a = names.get(relation.from) ?? '';
              const b = names.get(relation.to) ?? '';
              return (
                <g key={relation.id} aria-hidden="true" opacity={dim ? 0.15 : relation.status === 'past' ? 0.7 : 1}>
                  <title>{copy.graph.edge(a, b, what, relation.directed)}</title>
                  <path
                    d={geometry.path}
                    fill="none"
                    strokeLinecap="round"
                    strokeWidth={touching ? 3.5 : 2.25}
                    strokeDasharray={style.dash}
                    markerEnd={relation.directed ? `url(#${uid}-arrow-${relation.type})` : undefined}
                    style={{ stroke: style.color }}
                  />
                  {showAllLabels || touching ? (
                    <text
                      x={geometry.label.x}
                      y={geometry.label.y}
                      textAnchor="middle"
                      dy="-0.4em"
                      fontSize="12"
                      fontWeight="700"
                      paintOrder="stroke"
                      strokeWidth={4}
                      strokeLinejoin="round"
                      style={{ fill: 'var(--ink-text-primary)', stroke: 'var(--ink-bg-surface)', fontFamily: 'var(--font-figtree), system-ui, sans-serif' }}
                    >
                      {clip(what, 22)}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {model.nodes.map((character) => {
              const at = model.pos.get(character.id);
              if (!at) return null;
              const count = model.degree.get(character.id) ?? 0;
              const isActive = activeId === character.id;
              const open = () => onOpenCharacter(character.id);
              return (
                <g
                  key={character.id}
                  data-graph-node
                  transform={`translate(${at.x} ${at.y})`}
                  tabIndex={0}
                  role="button"
                  aria-label={`${character.name}, ${copy.graph.node(count, String(count))}`}
                  opacity={highlighted(character.id) ? 1 : 0.35}
                  className="cursor-pointer"
                  style={{ outline: 'none' }}
                  onClick={open}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      open();
                    }
                  }}
                  onFocus={() => setFocused(character.id)}
                  onBlur={() => setFocused((current) => (current === character.id ? null : current))}
                  onMouseEnter={() => setHovered(character.id)}
                  onMouseLeave={() => setHovered((current) => (current === character.id ? null : current))}
                >
                  <title>{character.name}</title>
                  {focused === character.id ? (
                    <circle r={model.layout.nodeRadius + 6} fill="none" strokeWidth={3} style={{ stroke: 'var(--ink-brand-blue)' }} />
                  ) : null}
                  <circle
                    r={model.layout.nodeRadius}
                    strokeWidth={2}
                    style={{ fill: isActive ? 'var(--ink-brand-yellow)' : 'var(--ink-bg-surface)', stroke: 'var(--ink-border-strong)' }}
                  />
                  <text
                    textAnchor="middle"
                    dy="0.35em"
                    fontSize="15"
                    fontWeight="800"
                    style={{ fill: 'var(--ink-text-on-accent)', fontFamily: 'var(--font-figtree), system-ui, sans-serif', pointerEvents: 'none' }}
                  >
                    {Array.from(character.name.trim())[0]?.toUpperCase() ?? '·'}
                  </text>
                  <text
                    y={model.layout.nodeRadius + 17}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="700"
                    paintOrder="stroke"
                    strokeWidth={4}
                    strokeLinejoin="round"
                    style={{
                      fill: 'var(--ink-text-primary)',
                      stroke: 'var(--ink-bg-surface)',
                      fontFamily: 'var(--font-figtree), system-ui, sans-serif',
                      pointerEvents: 'none',
                    }}
                  >
                    {clip(character.name, 14)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <p id={helpId} className="type-caption text-secondary">
        {copy.graph.hint} {copy.graph.canvasHelp}
      </p>

      <section aria-label={copy.graph.legend} className="flex flex-col gap-2 rounded-card border-quiet border-divider bg-surface p-3">
        <h3 className="type-label text-secondary">{copy.graph.legend}</h3>
        <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0">
          {model.types.map((type) => (
            <li key={type} className="flex items-center gap-2 type-caption text-primary">
              <svg width="40" height="10" viewBox="0 0 40 10" aria-hidden="true" focusable="false">
                <line
                  x1="2"
                  y1="5"
                  x2="38"
                  y2="5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={RELATION_STYLE[type].dash}
                  style={{ stroke: RELATION_STYLE[type].color }}
                />
              </svg>
              {copy.types[type]}
            </li>
          ))}
        </ul>
        <p className="type-caption text-secondary">
          {copy.graph.directedNote} {copy.graph.mutualNote}
        </p>
        {isolated > 0 ? <p className="type-caption text-secondary">{copy.graph.isolated(isolated, String(isolated))}</p> : null}
      </section>
    </div>
  );
}

'use client';

import { cx } from '@/components/ink/cx';
import { ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/ink/icons';
import { InkChip } from '@/components/ink/ink-chip';
import { type Entity, SCENE_STATUSES, type SceneStatus } from '@/lib/session/studio/models';

import {
  dropBarClass,
  GripIcon,
  type MoveActions,
  MoveButton,
  type SceneLookups,
  STATUS_TONE,
  useSceneDrag,
  usePlanCopy,
} from './plan-common';

// The two views of the plan (PRD §8.4). Both show the same cards, each with a
// handle to drag and buttons that do the same from the keyboard. The list is
// the plan itself, in order; the board groups the same cards by status and
// keeps their plan order inside each column.

function SceneSummary({ scene, lookups, showStatus }: { scene: Entity<'scenes'>; lookups: SceneLookups; showStatus: boolean }) {
  const copy = usePlanCopy();
  const f = scene.fields;
  const pov = f.povCharacterId ? lookups.characterName(f.povCharacterId) : null;
  const names = f.characterIds.map((id) => lookups.characterName(id)).filter((name): name is string => Boolean(name));
  const together = names.slice(0, 4).join(', ') + (names.length > 4 ? ` +${names.length - 4}` : '');
  const place = f.placeId ? lookups.placeName(f.placeId) : null;
  const chapter = f.chapterDraftId ? lookups.chapterTitle(f.chapterDraftId) : null;
  const meta = [
    pov ? copy.card.pov(pov) : null,
    names.length > 0 ? copy.card.withCharacters(together) : null,
    place ? copy.card.atPlace(place) : null,
    chapter ? copy.card.chapter(chapter) : null,
  ].filter((line): line is string => line !== null);
  const tags = f.tags.slice(0, 3);
  const moreTags = f.tags.length - tags.length;
  return (
    <span className="flex min-w-0 flex-col items-start gap-1.5">
      <span className="block w-full min-w-0 font-literary text-[18px] leading-[1.25] font-semibold break-words text-primary">
        {f.title || copy.untitled}
      </span>
      {showStatus || f.subplot || tags.length > 0 ? (
        <span className="flex flex-wrap gap-1.5">
          {showStatus ? <InkChip tone={STATUS_TONE[f.status]}>{copy.status[f.status]}</InkChip> : null}
          {f.subplot ? (
            <span title={copy.card.subplot(f.subplot)}>
              <InkChip tone="practice">{f.subplot}</InkChip>
            </span>
          ) : null}
          {tags.map((tag) => (
            <InkChip key={tag} tone="outline">
              {tag}
            </InkChip>
          ))}
          {moreTags > 0 ? <InkChip tone="outline">{`+${moreTags}`}</InkChip> : null}
        </span>
      ) : null}
      {f.synopsis ? <span className="line-clamp-2 block type-body-sm break-words text-secondary">{f.synopsis}</span> : null}
      {meta.length > 0 ? (
        <span className="flex flex-col gap-0.5">
          {meta.map((line) => (
            <span key={line} className="block type-caption break-words text-secondary">
              {line}
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}

const handleClass = 'flex w-9 shrink-0 cursor-grab touch-none items-center justify-center text-tertiary active:cursor-grabbing';
const bodyClass = 'ink-focus min-w-0 flex-1 rounded-card p-3 text-left';

// ---- List ----

export function PlanList({ scenes, lookups, actions }: { scenes: Entity<'scenes'>[]; lookups: SceneLookups; actions: MoveActions }) {
  const copy = usePlanCopy();
  const ids = scenes.map((scene) => scene.id);
  const { drag, handleProps, groupProps } = useSceneDrag(actions.drop);
  return (
    <div className="flex flex-col gap-2">
      <p className="type-caption text-secondary">{copy.move.dragHint}</p>
      <ol aria-label={copy.layout.listLabel} className="m-0 flex list-none flex-col gap-2 p-0" {...groupProps('list')}>
        {scenes.map((scene, index) => {
          const title = scene.fields.title || copy.untitled;
          return (
            <li
              key={scene.id}
              data-plan-card
              data-scene-id={scene.id}
              className={cx('min-w-0 rounded-card bg-surface', dropBarClass(ids, 'list', drag, scene.id))}
            >
              <div className="flex items-stretch rounded-card border-quiet border-divider hover:border-outline">
                <span {...handleProps(scene.id)} title={copy.move.dragHandle(title)} className={handleClass}>
                  <GripIcon />
                </span>
                <button type="button" data-move="open" onClick={() => actions.open(scene.id)} className={bodyClass}>
                  <SceneSummary scene={scene} lookups={lookups} showStatus />
                </button>
                <div className="flex shrink-0 flex-col justify-center border-l border-divider">
                  <MoveButton
                    move="up"
                    label={copy.move.upLabel(title)}
                    disabled={index === 0}
                    onClick={() => actions.nudge(scene, 'up', ids)}
                  >
                    <ArrowUpIcon size={20} />
                  </MoveButton>
                  <MoveButton
                    move="down"
                    label={copy.move.downLabel(title)}
                    disabled={index === scenes.length - 1}
                    onClick={() => actions.nudge(scene, 'down', ids)}
                  >
                    <ArrowDownIcon size={20} />
                  </MoveButton>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---- Board ----

const menuButtonClass = 'border-quiet border-control bg-surface px-3 type-button-sm';

export function PlanBoard({
  columns,
  lookups,
  actions,
  menuId,
  onMenu,
}: {
  columns: Record<SceneStatus, Entity<'scenes'>[]>;
  lookups: SceneLookups;
  actions: MoveActions;
  /** The card whose «Mover» controls are open. */
  menuId: string | null;
  onMenu: (id: string | null) => void;
}) {
  const copy = usePlanCopy();
  const { drag, handleProps, groupProps } = useSceneDrag(actions.drop);
  return (
    <div className="flex flex-col gap-2">
      <p className="type-caption text-secondary">{copy.move.dragHint}</p>
      {/* A scrolling region must be reachable by keyboard. */}
      <div role="region" aria-label={copy.layout.boardLabel} tabIndex={0} className="ink-focus overflow-x-auto rounded-card pb-2">
        <div className="flex snap-x snap-mandatory gap-3 sm:snap-none">
          {SCENE_STATUSES.map((status, column) => {
            const cards = columns[status];
            const ids = cards.map((scene) => scene.id);
            const previous = SCENE_STATUSES[column - 1];
            const next = SCENE_STATUSES[column + 1];
            const over = drag?.group === status;
            return (
              <section
                key={status}
                aria-labelledby={`plan-column-${status}`}
                className={cx(
                  'w-[84%] max-w-[320px] min-w-[260px] shrink-0 snap-start rounded-card bg-sunken p-2 sm:w-[270px]',
                  over && 'outline-2 -outline-offset-2 outline-dashed outline-blue',
                )}
              >
                <h3 id={`plan-column-${status}`} className="flex items-baseline justify-between gap-2 px-2 py-1.5 type-label text-primary">
                  <span>{copy.status[status]}</span>
                  <span className="tabular-nums text-secondary">{cards.length}</span>
                </h3>
                <ul
                  aria-labelledby={`plan-column-${status}`}
                  className="m-0 flex min-h-16 list-none flex-col gap-2 p-0"
                  {...groupProps(status)}
                >
                  {cards.length === 0 ? (
                    <li className="px-2 py-4 type-caption text-secondary">{drag ? copy.layout.dropHere : copy.layout.emptyColumn}</li>
                  ) : null}
                  {cards.map((scene, index) => {
                    const title = scene.fields.title || copy.untitled;
                    const menuOpen = menuId === scene.id;
                    const menuDomId = `plan-menu-${scene.id}`;
                    return (
                      <li
                        key={scene.id}
                        data-plan-card
                        data-scene-id={scene.id}
                        className={cx('min-w-0 rounded-card bg-surface', dropBarClass(ids, status, drag, scene.id))}
                      >
                        <div className="rounded-card border-quiet border-divider hover:border-outline">
                          <div className="flex items-stretch">
                            <span {...handleProps(scene.id)} title={copy.move.dragHandle(title)} className={handleClass}>
                              <GripIcon />
                            </span>
                            <button type="button" data-move="open" onClick={() => actions.open(scene.id)} className={bodyClass}>
                              <SceneSummary scene={scene} lookups={lookups} showStatus={false} />
                            </button>
                          </div>
                          <div className="flex border-t border-divider px-1">
                            <button
                              type="button"
                              data-move="menu"
                              aria-expanded={menuOpen}
                              aria-controls={menuDomId}
                              aria-label={copy.move.menuLabel(title)}
                              onClick={() => onMenu(menuOpen ? null : scene.id)}
                              className="ink-focus ink-dim inline-flex min-h-11 items-center rounded-control px-3 type-button-sm text-blue"
                            >
                              {copy.move.menu}
                            </button>
                          </div>
                          {menuOpen ? (
                            <div id={menuDomId} role="group" aria-label={copy.move.menuLabel(title)} className="grid grid-cols-2 gap-2 border-t border-divider p-2">
                              {previous ? (
                                <MoveButton
                                  move="left"
                                  label={copy.move.toStatusLabel(title, copy.status[previous])}
                                  className={menuButtonClass}
                                  onClick={() => actions.setStatus(scene, previous, 'left')}
                                >
                                  <ChevronLeftIcon size={16} />
                                  {copy.move.toStatus(copy.status[previous])}
                                </MoveButton>
                              ) : (
                                <span aria-hidden="true" />
                              )}
                              {next ? (
                                <MoveButton
                                  move="right"
                                  label={copy.move.toStatusLabel(title, copy.status[next])}
                                  className={menuButtonClass}
                                  onClick={() => actions.setStatus(scene, next, 'right')}
                                >
                                  {copy.move.toStatus(copy.status[next])}
                                  <ChevronRightIcon size={16} />
                                </MoveButton>
                              ) : (
                                <span aria-hidden="true" />
                              )}
                              <MoveButton
                                move="up"
                                label={copy.move.upLabel(title)}
                                disabled={index === 0}
                                className={menuButtonClass}
                                onClick={() => actions.nudge(scene, 'up', ids)}
                              >
                                <ArrowUpIcon size={16} />
                                {copy.move.up}
                              </MoveButton>
                              <MoveButton
                                move="down"
                                label={copy.move.downLabel(title)}
                                disabled={index === cards.length - 1}
                                className={menuButtonClass}
                                onClick={() => actions.nudge(scene, 'down', ids)}
                              >
                                <ArrowDownIcon size={16} />
                                {copy.move.down}
                              </MoveButton>
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

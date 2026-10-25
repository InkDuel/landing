'use client';

import { useMemo } from 'react';

import { InkButton } from '@/components/ink/ink-button';
import { type Entity, emptyFields, type PlaceFields, type StudioLimits } from '@/lib/session/studio/models';
import { useStudioCollection } from '@/lib/session/studio/studio-store';

import { useStudio } from './studio-context';
import { StudioInput, StudioSelect, StudioTagsInput, StudioTextArea } from './studio-ui';
import { ENTITY_CAPS, useUniverseCopy, within } from './universe-common';
import { type SheetApi, UniverseEntitySheet } from './universe-entity-sheet';

// Place sheet (PRD §8.2): name, type, importance, description, history,
// atmosphere, rules, tags, and the scenes that happen there (read-only; they
// are linked from the plan by id).

const LONG_KEYS = ['description', 'history', 'atmosphere', 'rules'] as const;

export function placeIsValid(f: PlaceFields, limits: StudioLimits): boolean {
  if (!f.name.trim() || !within(f.name, limits.shortText) || !within(f.placeType, limits.shortText)) return false;
  if (!LONG_KEYS.every((key) => within(f[key], limits.longText))) return false;
  return f.tags.length <= limits.tags && f.tags.every((tag) => within(tag, limits.tagLength));
}

export function PlaceSheet({
  open,
  entity,
  total,
  onClose,
  onOpenItem,
}: {
  open: boolean;
  entity: Entity<'places'> | null;
  total: number;
  onClose: () => void;
  onOpenItem: (id: string) => void;
}) {
  const c = useUniverseCopy().places;
  const { limits } = useStudio();
  return (
    <UniverseEntitySheet
      kind="places"
      open={open}
      entity={entity}
      empty={() => emptyFields('places')}
      title={entity ? entity.fields.name || c.editTitle : c.newTitle}
      isValid={(fields) => placeIsValid(fields, limits)}
      nameOf={(fields) => fields.name}
      analyticsType="place"
      total={total}
      cap={ENTITY_CAPS.places}
      capMessage={c.capReached(String(ENTITY_CAPS.places))}
      onClose={onClose}
      onOpenItem={onOpenItem}
    >
      {(api) => <PlaceForm key={api.sessionKey} api={api} placeId={entity?.id ?? null} />}
    </UniverseEntitySheet>
  );
}

function PlaceForm({ api, placeId }: { api: SheetApi<PlaceFields>; placeId: string | null }) {
  const c = useUniverseCopy().places;
  const { limits } = useStudio();
  const { fields, set } = api;
  const importanceOptions = [
    { value: '' as const, label: c.importanceNone },
    { value: 'major' as const, label: c.importances.major },
    { value: 'minor' as const, label: c.importances.minor },
  ];
  const labels = { description: c.description, history: c.history, atmosphere: c.atmosphere, rules: c.rules };
  return (
    <>
      <StudioInput
        label={c.nameLabel}
        value={fields.name}
        max={limits.shortText}
        error={api.dirty && !fields.name.trim() ? c.nameRequired : undefined}
        required
        onChange={(v) => set('name', v)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <StudioInput label={c.typeLabel} hint={c.typeHint} value={fields.placeType} max={limits.shortText} onChange={(v) => set('placeType', v)} />
        <StudioSelect label={c.importanceLabel} value={fields.importance} options={importanceOptions} onChange={(v) => set('importance', v)} />
      </div>
      {LONG_KEYS.map((key) => (
        <StudioTextArea key={key} label={labels[key]} value={fields[key]} max={limits.longText} rows={3} onChange={(v) => set(key, v)} />
      ))}
      <StudioTagsInput
        label={c.tags}
        value={fields.tags}
        onChange={(tags) => set('tags', tags)}
        maxTags={limits.tags}
        maxLength={limits.tagLength}
        addLabel={c.tagAdd}
        removeLabel={c.tagRemove}
      />
      {placeId ? <PlaceScenes placeId={placeId} guard={api.guard} /> : null}
    </>
  );
}

function PlaceScenes({ placeId, guard }: { placeId: string; guard: (action: () => void) => void }) {
  const copy = useUniverseCopy();
  const { store, goTo } = useStudio();
  const scenes = useStudioCollection(store, 'scenes');
  const items = useMemo(() => scenes.items.filter((s) => s.fields.placeId === placeId), [scenes.items, placeId]);
  return (
    <section aria-labelledby="place-scenes" className="flex flex-col gap-2 border-t border-divider pt-4">
      <h3 id="place-scenes" className="type-label text-secondary">
        {copy.places.scenes}
      </h3>
      {scenes.status === 'ready' && items.length === 0 ? <p className="type-body-sm text-secondary">{copy.places.scenesNone}</p> : null}
      {items.length > 0 ? (
        <>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {items.map((scene) => (
              <li key={scene.id} className="type-body-sm break-words text-primary">
                {scene.fields.title || copy.common.untitledScene}
              </li>
            ))}
          </ul>
          <InkButton variant="link" fullWidth={false} className="self-start" onClick={() => guard(() => void goTo('plan'))}>
            {copy.common.goPlan}
          </InkButton>
        </>
      ) : null}
    </section>
  );
}

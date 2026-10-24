'use client';

import { useMemo } from 'react';

import { type Entity, emptyFields, type RelationFields, RELATION_TYPES, type StudioLimits } from '@/lib/session/studio/models';

import { useStudio } from './studio-context';
import { StudioInput, StudioSelect, StudioTextArea, StudioToggle } from './studio-ui';
import { ENTITY_CAPS, useUniverseCopy, within } from './universe-common';
import { type SheetApi, UniverseEntitySheet } from './universe-entity-sheet';

// «Añadir relación» / edit sheet: two different live characters, a type, an
// optional free label (it wins over the type wherever the relation is named),
// notes, direction and status. The list is the accessible editor; this is its
// form.

export function relationIsValid(f: RelationFields, liveIds: ReadonlySet<string>, limits: StudioLimits): boolean {
  return (
    f.fromCharacterId !== '' &&
    f.toCharacterId !== '' &&
    f.fromCharacterId !== f.toCharacterId &&
    liveIds.has(f.fromCharacterId) &&
    liveIds.has(f.toCharacterId) &&
    within(f.label, limits.shortText) &&
    within(f.notes, limits.longText)
  );
}

export function RelationSheet({
  open,
  entity,
  total,
  characters,
  onClose,
}: {
  open: boolean;
  entity: Entity<'relations'> | null;
  total: number;
  /** Live characters, in display order. */
  characters: readonly Entity<'characters'>[];
  onClose: () => void;
}) {
  const c = useUniverseCopy().relations;
  const { limits } = useStudio();
  const liveIds = useMemo(() => new Set(characters.map((ch) => ch.id)), [characters]);
  const nameOf = (id: string) => characters.find((ch) => ch.id === id)?.fields.name ?? '';
  return (
    <UniverseEntitySheet
      kind="relations"
      open={open}
      entity={entity}
      empty={() => emptyFields('relations')}
      title={entity ? c.editTitle : c.newTitle}
      wide={false}
      isValid={(fields) => relationIsValid(fields, liveIds, limits)}
      nameOf={(fields) => `${nameOf(fields.fromCharacterId)} → ${nameOf(fields.toCharacterId)}`}
      analyticsType="relation"
      total={total}
      cap={ENTITY_CAPS.relations}
      capMessage={c.capReached(String(ENTITY_CAPS.relations))}
      onClose={onClose}
      trashBody={c.trashBody}
    >
      {(api) => <RelationForm key={api.sessionKey} api={api} characters={characters} />}
    </UniverseEntitySheet>
  );
}

function RelationForm({ api, characters }: { api: SheetApi<RelationFields>; characters: readonly Entity<'characters'>[] }) {
  const c = useUniverseCopy().relations;
  const { limits } = useStudio();
  const { fields, set } = api;
  const people = [{ value: '', label: c.pick }, ...characters.map((ch) => ({ value: ch.id, label: ch.fields.name }))];
  const typeOptions = RELATION_TYPES.map((type) => ({ value: type, label: c.types[type] }));
  const statusOptions = [
    { value: 'active' as const, label: c.statuses.active },
    { value: 'past' as const, label: c.statuses.past },
    { value: 'unknown' as const, label: c.statuses.unknown },
  ];
  const same = fields.fromCharacterId !== '' && fields.fromCharacterId === fields.toCharacterId;
  return (
    <>
      <StudioSelect label={c.from} value={fields.fromCharacterId} options={people} onChange={(v) => set('fromCharacterId', v)} />
      <StudioSelect label={c.to} value={fields.toCharacterId} options={people} onChange={(v) => set('toCharacterId', v)} />
      {same ? (
        <p role="alert" className="-mt-3 type-caption text-danger">
          {c.sameCharacter}
        </p>
      ) : null}
      <StudioSelect label={c.typeField} value={fields.type} options={typeOptions} onChange={(v) => set('type', v)} />
      <StudioInput label={c.label} hint={c.labelHint} value={fields.label} max={limits.shortText} onChange={(v) => set('label', v)} />
      <StudioTextArea label={c.notes} value={fields.notes} max={limits.longText} rows={3} onChange={(v) => set('notes', v)} />
      <StudioToggle label={c.directed} help={c.directedHelp} checked={fields.directed} onChange={(v) => set('directed', v)} />
      <StudioSelect label={c.statusLabel} value={fields.status} options={statusOptions} onChange={(v) => set('status', v)} />
    </>
  );
}

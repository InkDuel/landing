'use client';

import { useMemo, useState } from 'react';

import { ChevronDownIcon, PlusIcon, TrashIcon } from '@/components/ink/icons';
import { InkButton } from '@/components/ink/ink-button';
import { InkChip } from '@/components/ink/ink-chip';
import {
  type CharacterFields,
  type Entity,
  emptyFields,
  type StudioLimits,
} from '@/lib/session/studio/models';
import { useStudioCollection } from '@/lib/session/studio/studio-store';
import type { CharacterTextKey } from '@/lib/session/studio/studio-universe-copy';

import { useStudio } from './studio-context';
import {
  StudioIconButton,
  StudioInput,
  StudioSelect,
  StudioTagsInput,
  StudioTextArea,
} from './studio-ui';
import { ENTITY_CAPS, MAX_CUSTOM_FIELDS, useUniverseCopy, useUniverseRoute, within } from './universe-common';
import { type SheetApi, UniverseEntitySheet } from './universe-entity-sheet';

// Character sheet (PRD §8.1): a short first level — name, aliases, role,
// summary, tags — and an optional «Más detalles» with grouped sections. It is
// never a twenty-field form; an empty character is a valid character.

const DETAIL_GROUPS: readonly { id: 'identity' | 'inner' | 'arc' | 'voice' | 'notes'; keys: readonly CharacterTextKey[] }[] = [
  { id: 'identity', keys: ['age', 'pronouns', 'appearance'] },
  {
    id: 'inner',
    keys: ['personality', 'strengths', 'flaws', 'fear', 'desire', 'externalGoal', 'internalNeed', 'conflict', 'secret', 'motivation'],
  },
  { id: 'arc', keys: ['arcStart', 'arcEnd'] },
  { id: 'voice', keys: ['voice'] },
  { id: 'notes', keys: ['notes'] },
];
const SINGLE_LINE: readonly CharacterTextKey[] = ['age', 'pronouns'];
const DETAIL_KEYS = DETAIL_GROUPS.flatMap((group) => group.keys);

/** Mirrors the backend rules (internal/services/studio_entity_kinds.go). */
export function characterIsValid(f: CharacterFields, limits: StudioLimits): boolean {
  const { shortText, longText } = limits;
  if (!f.name.trim() || !within(f.name, shortText) || !within(f.aliases, shortText)) return false;
  if (!within(f.summary, longText)) return false;
  for (const key of DETAIL_KEYS) {
    if (!within(f[key], SINGLE_LINE.includes(key) ? shortText : longText)) return false;
  }
  if (f.tags.length > limits.tags || f.tags.some((tag) => !within(tag, limits.tagLength))) return false;
  if (f.customFields.length > MAX_CUSTOM_FIELDS) return false;
  return f.customFields.every(
    (field) => within(field.key, shortText) && within(field.value, longText) && (field.key.trim() !== '' || field.value.trim() === ''),
  );
}

const hasDetails = (f: CharacterFields) =>
  DETAIL_KEYS.some((key) => f[key].trim() !== '') || f.narrativeState !== '' || f.customFields.length > 0;

function copyName(name: string, suffix: string, max: number): string {
  const tail = ` ${suffix}`;
  const head = Array.from(name).slice(0, Math.max(1, max - Array.from(tail).length)).join('').trimEnd();
  return `${head}${tail}`;
}

export function CharacterSheet({
  open,
  entity,
  total,
  onClose,
  onOpenItem,
}: {
  open: boolean;
  entity: Entity<'characters'> | null;
  total: number;
  onClose: () => void;
  onOpenItem: (id: string) => void;
}) {
  const copy = useUniverseCopy();
  const { limits } = useStudio();
  const c = copy.characters;
  return (
    <UniverseEntitySheet
      kind="characters"
      open={open}
      entity={entity}
      empty={() => emptyFields('characters')}
      title={entity ? entity.fields.name || c.editTitle : c.newTitle}
      isValid={(fields) => characterIsValid(fields, limits)}
      nameOf={(fields) => fields.name}
      analyticsType="character"
      total={total}
      cap={ENTITY_CAPS.characters}
      capMessage={c.capReached(String(ENTITY_CAPS.characters))}
      onClose={onClose}
      onOpenItem={onOpenItem}
      duplicate={(fields) => ({ ...fields, name: copyName(fields.name, copy.common.copySuffix, limits.shortText) })}
    >
      {(api) => <CharacterForm key={api.sessionKey} api={api} characterId={entity?.id ?? null} />}
    </UniverseEntitySheet>
  );
}

function CharacterForm({ api, characterId }: { api: SheetApi<CharacterFields>; characterId: string | null }) {
  const copy = useUniverseCopy();
  const { limits } = useStudio();
  const c = copy.characters;
  const { fields, set } = api;
  const [expanded, setExpanded] = useState(() => hasDetails(fields));
  const nameError = api.dirty && !fields.name.trim() ? c.nameRequired : undefined;

  const roleOptions = [
    { value: '' as const, label: c.roleNone },
    { value: 'protagonist' as const, label: c.roles.protagonist },
    { value: 'antagonist' as const, label: c.roles.antagonist },
    { value: 'secondary' as const, label: c.roles.secondary },
    { value: 'other' as const, label: c.roles.other },
  ];
  const stateOptions = [
    { value: '' as const, label: c.stateNone },
    { value: 'active' as const, label: c.states.active },
    { value: 'absent' as const, label: c.states.absent },
    { value: 'deceased' as const, label: c.states.deceased },
    { value: 'unknown' as const, label: c.states.unknown },
  ];

  return (
    <>
      <StudioInput label={c.nameLabel} value={fields.name} max={limits.shortText} error={nameError} required onChange={(v) => set('name', v)} />
      <StudioInput label={c.aliases} hint={c.aliasesHint} value={fields.aliases} max={limits.shortText} onChange={(v) => set('aliases', v)} />
      <StudioSelect label={c.roleLabel} value={fields.role} options={roleOptions} onChange={(v) => set('role', v)} />
      <StudioTextArea
        label={c.summary}
        hint={c.summaryHint}
        value={fields.summary}
        max={limits.longText}
        rows={3}
        onChange={(v) => set('summary', v)}
      />
      <StudioTagsInput
        label={c.tags}
        value={fields.tags}
        onChange={(tags) => set('tags', tags)}
        maxTags={limits.tags}
        maxLength={limits.tagLength}
        addLabel={c.tagAdd}
        removeLabel={c.tagRemove}
      />

      <div className="flex flex-col gap-4 border-t border-divider pt-4">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="character-details"
          onClick={() => setExpanded((v) => !v)}
          className="ink-focus ink-dim -mx-2 inline-flex min-h-11 items-center gap-2 self-start rounded-control px-2 type-button-sm text-primary"
        >
          <ChevronDownIcon size={20} className={expanded ? 'rotate-180' : undefined} />
          {expanded ? c.lessDetails : c.moreDetails}
        </button>
        {expanded ? (
          <div id="character-details" className="flex flex-col gap-6">
            <p className="type-body-sm text-secondary">{c.moreHint}</p>
            <StudioSelect label={c.stateLabel} value={fields.narrativeState} options={stateOptions} onChange={(v) => set('narrativeState', v)} />
            {DETAIL_GROUPS.map((group) => (
              <section key={group.id} aria-labelledby={`character-group-${group.id}`} className="flex flex-col gap-4">
                <h3 id={`character-group-${group.id}`} className="type-label text-secondary">
                  {c.groups[group.id]}
                </h3>
                {group.keys.map((key) =>
                  SINGLE_LINE.includes(key) ? (
                    <StudioInput key={key} label={c.texts[key]} value={fields[key]} max={limits.shortText} onChange={(v) => set(key, v)} />
                  ) : (
                    <StudioTextArea
                      key={key}
                      label={c.texts[key]}
                      value={fields[key]}
                      max={limits.longText}
                      rows={key === 'notes' ? 5 : 3}
                      onChange={(v) => set(key, v)}
                    />
                  ),
                )}
              </section>
            ))}
            <CustomFields api={api} />
          </div>
        ) : null}
      </div>

      {characterId ? (
        <>
          <AppearsIn characterId={characterId} guard={api.guard} />
          <CharacterRelations characterId={characterId} guard={api.guard} />
        </>
      ) : null}
    </>
  );
}

function CustomFields({ api }: { api: SheetApi<CharacterFields> }) {
  const c = useUniverseCopy().characters;
  const { limits } = useStudio();
  const { fields, set } = api;
  const rows = fields.customFields;
  const update = (index: number, patch: Partial<{ key: string; value: string }>) =>
    set(
      'customFields',
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  const full = rows.length >= MAX_CUSTOM_FIELDS;
  return (
    <section aria-labelledby="character-custom" className="flex flex-col gap-3">
      <div>
        <h3 id="character-custom" className="type-label text-secondary">
          {c.custom.title}
        </h3>
        <p className="mt-1 type-body-sm text-secondary">{c.custom.hint}</p>
      </div>
      {rows.map((row, index) => (
        <div key={index} className="flex items-start gap-2 rounded-control border-quiet border-divider p-3">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <StudioInput
              label={c.custom.key}
              value={row.key}
              max={limits.shortText}
              error={row.value.trim() && !row.key.trim() ? c.custom.keyRequired : undefined}
              onChange={(v) => update(index, { key: v })}
            />
            <StudioTextArea label={c.custom.value} value={row.value} max={limits.longText} rows={2} onChange={(v) => update(index, { value: v })} />
          </div>
          <StudioIconButton
            label={c.custom.remove(row.key || String(index + 1))}
            className="mt-6"
            onClick={() =>
              set(
                'customFields',
                rows.filter((_, i) => i !== index),
              )
            }
          >
            <TrashIcon size={20} />
          </StudioIconButton>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <InkButton
          variant="secondary"
          fullWidth={false}
          disabled={full}
          leading={<PlusIcon size={20} />}
          onClick={() => set('customFields', [...rows, { key: '', value: '' }])}
        >
          {c.custom.add}
        </InkButton>
        {full ? <span className="type-caption text-secondary">{c.custom.max(String(MAX_CUSTOM_FIELDS))}</span> : null}
      </div>
    </section>
  );
}

/** Read-only: the scenes whose characters or point of view include this one. */
function AppearsIn({ characterId, guard }: { characterId: string; guard: (action: () => void) => void }) {
  const copy = useUniverseCopy();
  const { store, goTo } = useStudio();
  const scenes = useStudioCollection(store, 'scenes');
  const items = useMemo(
    () => scenes.items.filter((s) => s.fields.characterIds.includes(characterId) || s.fields.povCharacterId === characterId),
    [scenes.items, characterId],
  );
  return (
    <section aria-labelledby="character-appears" className="flex flex-col gap-2 border-t border-divider pt-4">
      <h3 id="character-appears" className="type-label text-secondary">
        {copy.characters.appearsIn}
      </h3>
      {scenes.status === 'ready' && items.length === 0 ? <p className="type-body-sm text-secondary">{copy.characters.appearsNone}</p> : null}
      {scenes.status === 'error' ? <p className="type-body-sm text-secondary">{copy.characters.appearsNone}</p> : null}
      {items.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {items.map((scene) => (
            <li key={scene.id} className="flex flex-wrap items-center gap-2 type-body-sm text-primary">
              <span className="min-w-0 break-words">{scene.fields.title || copy.common.untitledScene}</span>
              {scene.fields.povCharacterId === characterId ? <InkChip tone="muted">{copy.common.povSuffix}</InkChip> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {items.length > 0 ? (
        <InkButton variant="link" fullWidth={false} className="self-start" onClick={() => guard(() => void goTo('plan'))}>
          {copy.common.goPlan}
        </InkButton>
      ) : null}
    </section>
  );
}

/** Read-only: this character's live relationships, with a way to open each. */
function CharacterRelations({ characterId, guard }: { characterId: string; guard: (action: () => void) => void }) {
  const copy = useUniverseCopy();
  const { store } = useStudio();
  const route = useUniverseRoute();
  const relations = useStudioCollection(store, 'relations');
  const characters = useStudioCollection(store, 'characters');
  const rows = useMemo(() => {
    const names = new Map(characters.items.map((ch) => [ch.id, ch.fields.name]));
    return relations.items
      .filter((r) => r.fields.fromCharacterId === characterId || r.fields.toCharacterId === characterId)
      .map((r) => {
        const otherId = r.fields.fromCharacterId === characterId ? r.fields.toCharacterId : r.fields.fromCharacterId;
        return { relation: r, name: names.get(otherId) };
      })
      .filter((row): row is { relation: Entity<'relations'>; name: string } => row.name !== undefined);
  }, [relations.items, characters.items, characterId]);
  const r = copy.relations;
  return (
    <section aria-labelledby="character-relations" className="flex flex-col gap-2 border-t border-divider pt-4">
      <h3 id="character-relations" className="type-label text-secondary">
        {copy.characters.relations}
      </h3>
      {relations.status === 'ready' && rows.length === 0 ? <p className="type-body-sm text-secondary">{copy.characters.relationsNone}</p> : null}
      {rows.length > 0 ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {rows.map(({ relation, name }) => (
            <li key={relation.id} className="flex items-center justify-between gap-3 border-b border-divider py-1 last:border-b-0">
              <span className="min-w-0 type-body-sm break-words text-primary">
                {name}
                <span className="text-secondary">
                  {' · '}
                  {relation.fields.label || r.types[relation.fields.type]}
                  {' · '}
                  {r.statuses[relation.fields.status]}
                </span>
              </span>
              <InkButton
                variant="link"
                fullWidth={false}
                aria-label={copy.characters.relationOpen(name)}
                onClick={() => guard(() => route.go({ tab: 'relations', item: relation.id }))}
              >
                {r.editAction}
              </InkButton>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

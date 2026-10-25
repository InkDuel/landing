'use client';

import { useMemo } from 'react';

import { type Entity, emptyFields, type NoteFields, type StudioLimits } from '@/lib/session/studio/models';
import { useStudioCollection } from '@/lib/session/studio/studio-store';

import { useStudio } from './studio-context';
import { StudioInput, StudioSelect, StudioTagsInput, StudioTextArea } from './studio-ui';
import { ENTITY_CAPS, MAX_LINK_IDS, useUniverseCopy, within } from './universe-common';
import { type SheetApi, UniverseEntitySheet } from './universe-entity-sheet';
import { UniverseLinkPicker } from './universe-multiselect';

// Lore note sheet (PRD §8.2): title, light category, body, tags and links to
// other lore notes and scenes. «Lore» also means context or research for a
// realist story: nothing here assumes fantasy. Quick notes (kind «quick») are
// the editor panel's and never reach this sheet.

export function noteIsValid(f: NoteFields, limits: StudioLimits): boolean {
  if (!f.title.trim() || !within(f.title, limits.shortText) || !within(f.body, limits.noteBody)) return false;
  if (f.tags.length > limits.tags || f.tags.some((tag) => !within(tag, limits.tagLength))) return false;
  return f.linkedNoteIds.length <= MAX_LINK_IDS && f.sceneIds.length <= MAX_LINK_IDS;
}

export function NoteSheet({
  open,
  entity,
  total,
  onClose,
  onOpenItem,
}: {
  open: boolean;
  entity: Entity<'notes'> | null;
  total: number;
  onClose: () => void;
  onOpenItem: (id: string) => void;
}) {
  const c = useUniverseCopy().notes;
  const { limits } = useStudio();
  return (
    <UniverseEntitySheet
      kind="notes"
      open={open}
      entity={entity}
      empty={() => emptyFields('notes')}
      title={entity ? entity.fields.title || c.editTitle : c.newTitle}
      description={c.intro}
      isValid={(fields) => noteIsValid(fields, limits)}
      nameOf={(fields) => fields.title}
      analyticsType="note"
      total={total}
      cap={ENTITY_CAPS.notes}
      capMessage={c.capReached(String(ENTITY_CAPS.notes))}
      onClose={onClose}
      onOpenItem={onOpenItem}
    >
      {(api) => <NoteForm key={api.sessionKey} api={api} noteId={entity?.id ?? null} />}
    </UniverseEntitySheet>
  );
}

function NoteForm({ api, noteId }: { api: SheetApi<NoteFields>; noteId: string | null }) {
  const copy = useUniverseCopy();
  const c = copy.notes;
  const { store, limits } = useStudio();
  const notes = useStudioCollection(store, 'notes');
  const scenes = useStudioCollection(store, 'scenes');
  const { fields, set } = api;

  const noteOptions = useMemo(
    () =>
      notes.items
        .filter((n) => n.fields.kind === 'lore' && n.id !== noteId)
        .map((n) => ({ id: n.id, label: n.fields.title || c.untitled }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [notes.items, noteId, c.untitled],
  );
  const sceneOptions = useMemo(
    () => scenes.items.map((s) => ({ id: s.id, label: s.fields.title || copy.common.untitledScene })),
    [scenes.items, copy.common.untitledScene],
  );

  const categoryOptions = [
    { value: '' as const, label: c.categoryNone },
    { value: 'rule' as const, label: c.categories.rule },
    { value: 'faction' as const, label: c.categories.faction },
    { value: 'object' as const, label: c.categories.object },
    { value: 'magic' as const, label: c.categories.magic },
    { value: 'culture' as const, label: c.categories.culture },
    { value: 'research' as const, label: c.categories.research },
    { value: 'other' as const, label: c.categories.other },
  ];

  return (
    <>
      <StudioInput
        label={c.titleLabel}
        value={fields.title}
        max={limits.shortText}
        error={api.dirty && !fields.title.trim() ? c.titleRequired : undefined}
        required
        onChange={(v) => set('title', v)}
      />
      <StudioSelect label={c.categoryLabel} value={fields.category} options={categoryOptions} onChange={(v) => set('category', v)} />
      <StudioTextArea
        label={c.bodyLabel}
        hint={c.bodyHint}
        value={fields.body}
        max={limits.noteBody}
        rows={8}
        onChange={(v) => set('body', v)}
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
      <UniverseLinkPicker
        label={c.linkedNotes}
        options={noteOptions}
        value={fields.linkedNoteIds}
        onChange={(ids) => set('linkedNoteIds', ids)}
        searchLabel={c.linkSearch}
        emptyLabel={c.linkNone}
        selectedLabel={c.linkSelected}
      />
      <UniverseLinkPicker
        label={c.linkedScenes}
        options={sceneOptions}
        value={fields.sceneIds}
        onChange={(ids) => set('sceneIds', ids)}
        searchLabel={c.linkSearch}
        emptyLabel={c.linkNone}
        selectedLabel={c.linkSelected}
      />
    </>
  );
}

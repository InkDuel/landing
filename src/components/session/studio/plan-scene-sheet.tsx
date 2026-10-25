'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { InkButton } from '@/components/ink/ink-button';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkTextAction } from '@/components/ink/ink-states';
import { ApiError } from '@/lib/session/api';
import { emptyFields, type Entity, SCENE_STATUSES, type SceneFields, type SceneStatus, type StudioLimits } from '@/lib/session/studio/models';
import { studioAnalytics } from '@/lib/session/studio/studio-analytics';
import { EntityConflictError } from '@/lib/session/studio/studio-store';
import { newClientId } from '@/lib/session/works';

import { NEW_SCENE, SCENE_CAP, type SceneLookups, usePlanCopy, useSceneLookups } from './plan-common';
import { useStudio } from './studio-context';
import { StudioConfirm, StudioInput, StudioSelect, StudioSheet, StudioTagsInput, StudioTextArea } from './studio-ui';
import { MAX_LINK_IDS, within } from './universe-common';
import { UniverseLinkPicker } from './universe-multiselect';

// The scene sheet (PRD §8.4): one card, edited on the side. Same flow as every
// Studio sheet: explicit «Guardar» (Cmd/Ctrl+S too) that stays disabled while
// nothing changed or something is invalid; closing with edits asks first; a 409
// keeps the author's text and offers the saved version or «Guardar la mía de
// todos modos». Creating a scene never publishes or creates a chapter.

const LONG_KEYS = ['synopsis', 'purpose', 'conflict', 'outcome', 'notes'] as const;

export function sceneIsValid(f: SceneFields, limits: StudioLimits): boolean {
  if (!f.title.trim() || !within(f.title, limits.shortText) || !within(f.subplot, limits.shortText)) return false;
  if (!LONG_KEYS.every((key) => within(f[key], limits.longText))) return false;
  if (f.tags.length > limits.tags || !f.tags.every((tag) => within(tag, limits.tagLength))) return false;
  return f.characterIds.length <= MAX_LINK_IDS;
}

type Api = {
  fields: SceneFields;
  set: <P extends keyof SceneFields>(key: P, value: SceneFields[P]) => void;
  dirty: boolean;
  guard: (action: () => void) => void;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function SceneSheet({
  open,
  entity,
  total,
  onClose,
}: {
  open: boolean;
  /** The saved card, or null for a blank one. */
  entity: Entity<'scenes'> | null;
  /** Live scenes, to stop before the 409 past the cap. */
  total: number;
  onClose: () => void;
}) {
  const copy = usePlanCopy().sheet;
  const { store, workId, toast, limits } = useStudio();

  const sessionKey = open ? (entity?.id ?? NEW_SCENE) : '';
  const [session, setSession] = useState(sessionKey);
  const [fields, setFields] = useState<SceneFields>(() => entity?.fields ?? emptyFields('scenes'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, setPending] = useState<{ run: () => void } | null>(null);
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const attempt = useRef<{ id: string; sig: string } | null>(null);

  // Another card (or reopening) starts from its saved fields.
  if (session !== sessionKey) {
    setSession(sessionKey);
    setFields(entity?.fields ?? emptyFields('scenes'));
    setBusy(false);
    setError(null);
    setConflict(false);
    setJustSaved(false);
    setPending(null);
    setConfirmTrash(false);
    setConfirmOverwrite(false);
  }

  const base = entity?.fields ?? emptyFields('scenes');
  const dirty = open && !same(fields, base);
  const valid = sceneIsValid(fields, limits);
  const canSave = open && dirty && valid && !busy;
  const capMessage = copy.capReached(String(SCENE_CAP));

  const set = useCallback(<P extends keyof SceneFields>(key: P, value: SceneFields[P]) => {
    setFields((current) => ({ ...current, [key]: value }));
    setJustSaved(false);
  }, []);

  const guard = useCallback(
    (action: () => void) => {
      if (dirty) setPending({ run: action });
      else action();
    },
    [dirty],
  );

  const failure = useCallback(
    (e: unknown): string => {
      if (e instanceof ApiError) {
        if (e.kind === 'network' || e.kind === 'timeout') return copy.saveFailedNetwork;
        if (e.status === 400) return copy.saveFailedInvalid;
        if (e.status === 429) return copy.saveFailedRate;
        if (e.status === 409) return capMessage;
      }
      return copy.saveFailed;
    },
    [copy, capMessage],
  );

  const save = useCallback(async () => {
    if (!canSave) return;
    if (!entity && total >= SCENE_CAP) {
      setError(capMessage);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (entity) {
        const sent = fields;
        const saved = await store.update('scenes', entity, sent);
        // The server's version replaces what was sent, unless the author kept
        // typing while it saved: that newer text stays theirs.
        setFields((current) => (same(current, sent) ? saved.fields : current));
        setConflict(false);
        setJustSaved(true);
      } else {
        // A retry of the same payload reuses its id: the server treats it as
        // the same create instead of making a second card.
        const sig = JSON.stringify(fields);
        const id = attempt.current?.sig === sig ? attempt.current.id : newClientId();
        attempt.current = { id, sig };
        await store.create('scenes', fields, id);
        attempt.current = null;
        studioAnalytics.sceneCreated(workId);
        toast(copy.created);
        onClose();
      }
    } catch (e) {
      if (e instanceof EntityConflictError) {
        setConflict(true);
        if (!e.current) void store.reload('scenes');
      } else {
        setError(failure(e));
      }
    } finally {
      setBusy(false);
    }
  }, [canSave, entity, total, capMessage, store, fields, workId, toast, copy, onClose, failure]);

  // Cmd/Ctrl+S while the sheet is open (never the browser's «save page»).
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // A dialog focuses its close button; a blank card should start on its title.
  useEffect(() => {
    if (!open || entity) return;
    const timer = setTimeout(() => bodyRef.current?.querySelector<HTMLInputElement>('input:not([type=checkbox])')?.focus(), 30);
    return () => clearTimeout(timer);
  }, [open, entity]);

  const requestClose = () => {
    if (busy) return;
    guard(onClose);
  };

  const trashNow = async () => {
    if (!entity) return;
    setBusy(true);
    try {
      await store.trash('scenes', entity.id);
      setConfirmTrash(false);
      toast(copy.trashed);
      onClose();
    } catch {
      setConfirmTrash(false);
      setError(copy.trashFailed);
    } finally {
      setBusy(false);
    }
  };

  const status = busy ? copy.saving : dirty ? copy.unsaved : justSaved ? copy.saved : '';

  return (
    <>
      <StudioSheet
        open={open}
        onClose={requestClose}
        title={entity ? entity.fields.title || copy.editTitle : copy.newTitle}
        closeLabel={copy.close}
        wide
        footer={
          <>
            {entity ? (
              <div className="mr-auto flex flex-wrap items-center gap-x-1">
                <InkButton variant="link" fullWidth={false} className="text-danger" disabled={busy} onClick={() => setConfirmTrash(true)}>
                  {copy.trashAction}
                </InkButton>
              </div>
            ) : null}
            <span role="status" aria-live="polite" className="type-caption text-secondary">
              {status}
            </span>
            <InkButton fullWidth={false} disabled={!canSave} busy={busy} busyLabel={copy.saving} onClick={() => void save()}>
              {copy.save}
            </InkButton>
          </>
        }
      >
        <div ref={bodyRef} className="flex flex-col gap-5">
          {conflict ? (
            <InkInlineBanner
              tone="notice"
              title={copy.conflictTitle}
              detail={copy.conflictBody}
              action={
                <div className="flex flex-wrap gap-x-4">
                  <InkTextAction
                    onClick={() => {
                      setFields(entity?.fields ?? emptyFields('scenes'));
                      setConflict(false);
                    }}
                  >
                    {copy.viewSaved}
                  </InkTextAction>
                  <InkTextAction onClick={() => setConfirmOverwrite(true)}>{copy.overwrite}</InkTextAction>
                </div>
              }
            />
          ) : null}
          {error ? <InkInlineBanner title={error} /> : null}
          <SceneForm key={sessionKey} api={{ fields, set, dirty, guard }} />
        </div>
      </StudioSheet>

      <StudioConfirm
        open={pending !== null}
        title={copy.discardTitle}
        body={copy.discardBody}
        confirmLabel={copy.discardConfirm}
        cancelLabel={copy.discardKeep}
        destructive
        onClose={() => setPending(null)}
        onConfirm={() => {
          const action = pending?.run;
          setPending(null);
          action?.();
        }}
      />
      <StudioConfirm
        open={confirmOverwrite}
        title={copy.overwriteTitle}
        body={copy.overwriteBody}
        confirmLabel={copy.overwriteConfirm}
        cancelLabel={copy.cancel}
        destructive
        onClose={() => setConfirmOverwrite(false)}
        onConfirm={() => {
          setConfirmOverwrite(false);
          void save();
        }}
      />
      <StudioConfirm
        open={confirmTrash}
        title={copy.trashTitle(entity?.fields.title || copy.editTitle)}
        body={copy.trashBody}
        confirmLabel={copy.trashConfirm}
        cancelLabel={copy.cancel}
        destructive
        busy={busy}
        onClose={() => setConfirmTrash(false)}
        onConfirm={() => void trashNow()}
      />
    </>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-divider pt-4 first:border-t-0 first:pt-0">
      <h3 className="type-label text-secondary">{title}</h3>
      {children}
    </section>
  );
}

/** A select option for an id that no longer resolves, so saving never drops it silently. */
function withUnavailable(
  options: { value: string; label: string }[],
  current: string,
  known: boolean,
  ready: boolean,
  label: string,
): { value: string; label: string }[] {
  if (!current || known) return options;
  return [...options, { value: current, label: ready ? label : '…' }];
}

function SceneForm({ api }: { api: Api }) {
  const plan = usePlanCopy();
  const copy = plan.sheet;
  const unnamed = plan.unnamed;
  const { limits, goTo } = useStudio();
  const lookups: SceneLookups = useSceneLookups();
  const { fields, set } = api;

  const statusOptions = SCENE_STATUSES.map((value) => ({ value, label: plan.status[value] }));
  const povOptions = withUnavailable(
    [{ value: '', label: copy.povNone }, ...lookups.characters.map((c) => ({ value: c.id, label: c.fields.name || unnamed }))],
    fields.povCharacterId,
    lookups.characterName(fields.povCharacterId) !== null,
    lookups.ready,
    copy.unavailable,
  );
  const placeOptions = withUnavailable(
    [{ value: '', label: copy.placeNone }, ...lookups.places.map((p) => ({ value: p.id, label: p.fields.name || unnamed }))],
    fields.placeId,
    lookups.placeName(fields.placeId) !== null,
    lookups.ready,
    copy.unavailable,
  );
  const chapterOptions = withUnavailable(
    [{ value: '', label: copy.chapterNone }, ...lookups.chapters.map((c) => ({ value: c.id, label: c.label }))],
    fields.chapterDraftId,
    lookups.chapterTitle(fields.chapterDraftId) !== null,
    true,
    copy.unavailable,
  );
  const characterOptions = lookups.characters.map((c) => ({ id: c.id, label: c.fields.name || unnamed }));
  const linkedChapter = fields.chapterDraftId && lookups.chapterTitle(fields.chapterDraftId) !== null;

  return (
    <>
      <Group title={copy.groups.essentials}>
        <StudioInput
          label={copy.titleLabel}
          value={fields.title}
          max={limits.shortText}
          error={api.dirty && !fields.title.trim() ? copy.titleRequired : undefined}
          required
          onChange={(v) => set('title', v)}
        />
        <StudioSelect<SceneStatus> label={copy.statusLabel} value={fields.status} options={statusOptions} onChange={(v) => set('status', v)} />
        <StudioTextArea label={copy.synopsis} hint={copy.synopsisHint} value={fields.synopsis} max={limits.longText} rows={3} onChange={(v) => set('synopsis', v)} />
      </Group>

      <Group title={copy.groups.drama}>
        <StudioTextArea label={copy.purpose} hint={copy.purposeHint} value={fields.purpose} max={limits.longText} rows={2} onChange={(v) => set('purpose', v)} />
        <StudioTextArea label={copy.conflict} hint={copy.conflictHint} value={fields.conflict} max={limits.longText} rows={2} onChange={(v) => set('conflict', v)} />
        <StudioTextArea label={copy.outcome} hint={copy.outcomeHint} value={fields.outcome} max={limits.longText} rows={2} onChange={(v) => set('outcome', v)} />
      </Group>

      <Group title={copy.groups.cast}>
        <StudioSelect label={copy.pov} value={fields.povCharacterId} options={povOptions} onChange={(v) => set('povCharacterId', v)} />
        <UniverseLinkPicker
          label={copy.characters}
          options={characterOptions}
          value={fields.characterIds}
          onChange={(ids) => set('characterIds', ids)}
          searchLabel={copy.charactersSearch}
          emptyLabel={copy.charactersNone}
          selectedLabel={copy.charactersSelected}
        />
        <StudioSelect label={copy.place} value={fields.placeId} options={placeOptions} onChange={(v) => set('placeId', v)} />
      </Group>

      <Group title={copy.groups.organize}>
        <StudioInput label={copy.subplot} hint={copy.subplotHint} value={fields.subplot} max={limits.shortText} onChange={(v) => set('subplot', v)} />
        <StudioTagsInput
          label={copy.tags}
          value={fields.tags}
          onChange={(tags) => set('tags', tags)}
          maxTags={limits.tags}
          maxLength={limits.tagLength}
          addLabel={copy.tagAdd}
          removeLabel={copy.tagRemove}
        />
        <div className="flex flex-col gap-2">
          <StudioSelect
            label={copy.chapter}
            hint={copy.chapterHint}
            value={fields.chapterDraftId}
            options={chapterOptions}
            onChange={(v) => set('chapterDraftId', v)}
          />
          {linkedChapter ? (
            <InkButton
              variant="link"
              fullWidth={false}
              className="self-start"
              onClick={() => api.guard(() => void goTo('write', fields.chapterDraftId))}
            >
              {copy.openChapter}
            </InkButton>
          ) : null}
        </div>
        <StudioTextArea label={copy.notes} value={fields.notes} max={limits.longText} rows={3} onChange={(v) => set('notes', v)} />
      </Group>
    </>
  );
}

'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { InkButton } from '@/components/ink/ink-button';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkTextAction } from '@/components/ink/ink-states';
import { ApiError } from '@/lib/session/api';
import type { Entity, EntityKind, EntityKindFields } from '@/lib/session/studio/models';
import { studioAnalytics, type StudioEntityType } from '@/lib/session/studio/studio-analytics';
import { EntityConflictError } from '@/lib/session/studio/studio-store';
import { newClientId } from '@/lib/session/works';

import { useStudio } from './studio-context';
import { StudioConfirm, StudioSheet } from './studio-ui';
import { NEW_ITEM, useUniverseCopy } from './universe-common';

// The one editing flow of every Universe sheet: explicit «Guardar» (Cmd/Ctrl+S
// too), disabled while unchanged or invalid; closing with edits asks first;
// a 409 keeps the author's text and offers «Ver la versión guardada» or
// «Guardar la mía de todos modos»; duplicate and trash for saved entries. The
// kind-specific fields are rendered by the caller.

export type SheetApi<F> = {
  /** Changes when another entry (or the create form) is shown; use as a key. */
  sessionKey: string;
  isNew: boolean;
  fields: F;
  set: <P extends keyof F>(key: P, value: F[P]) => void;
  dirty: boolean;
  busy: boolean;
  /** Runs [action] now, or after the author agrees to discard unsaved edits. */
  guard: (action: () => void) => void;
};

type Props<K extends EntityKind> = {
  kind: K;
  open: boolean;
  /** The saved entry, or null for the create form. */
  entity: Entity<K> | null;
  empty: () => EntityKindFields[K];
  title: string;
  description?: string;
  wide?: boolean;
  isValid: (fields: EntityKindFields[K]) => boolean;
  nameOf: (fields: EntityKindFields[K]) => string;
  analyticsType: StudioEntityType;
  /** Live entries of this kind and the per-work cap, to stop before the 409. */
  total: number;
  cap: number;
  capMessage: string;
  onClose: () => void;
  /** Opens another entry (the copy just made). */
  onOpenItem?: (id: string) => void;
  /** Present: shows «Duplicar como plantilla» with the fields of the copy. */
  duplicate?: (fields: EntityKindFields[K]) => EntityKindFields[K];
  trashBody?: string;
  children: (api: SheetApi<EntityKindFields[K]>) => ReactNode;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function UniverseEntitySheet<K extends EntityKind>({
  kind,
  open,
  entity,
  empty,
  title,
  description,
  wide = true,
  isValid,
  nameOf,
  analyticsType,
  total,
  cap,
  capMessage,
  onClose,
  onOpenItem,
  duplicate,
  trashBody,
  children,
}: Props<K>) {
  type F = EntityKindFields[K];
  const { store, workId, toast } = useStudio();
  const copy = useUniverseCopy().common;

  const sessionKey = open ? (entity?.id ?? NEW_ITEM) : '';
  const [session, setSession] = useState(sessionKey);
  const [fields, setFields] = useState<F>(() => entity?.fields ?? empty());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, setPending] = useState<{ run: () => void } | null>(null);
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const attempt = useRef<{ id: string; sig: string } | null>(null);

  // A different entry (or reopening) starts from its saved fields.
  if (session !== sessionKey) {
    setSession(sessionKey);
    setFields(entity?.fields ?? empty());
    setBusy(false);
    setError(null);
    setConflict(false);
    setJustSaved(false);
    setPending(null);
    setConfirmTrash(false);
    setConfirmOverwrite(false);
  }

  const base = entity?.fields ?? empty();
  const dirty = open && !same(fields, base);
  const valid = isValid(fields);
  const canSave = open && dirty && valid && !busy;

  const set = useCallback(<P extends keyof F>(key: P, value: F[P]) => {
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
    if (!entity && total >= cap) {
      setError(capMessage);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (entity) {
        const sent = fields;
        const saved = await store.update(kind, entity, sent);
        // The server's version replaces what was sent, unless the author kept
        // typing while it saved: that newer text stays theirs.
        setFields((current) => (same(current, sent) ? saved.fields : current));
        setConflict(false);
        setJustSaved(true);
      } else {
        // A retry of the same payload reuses its id: the server treats it as
        // the same create instead of making a second entry.
        const sig = JSON.stringify(fields);
        const id = attempt.current?.sig === sig ? attempt.current.id : newClientId();
        attempt.current = { id, sig };
        await store.create(kind, fields, id);
        attempt.current = null;
        studioAnalytics.entityCreated(workId, analyticsType);
        toast(copy.created);
        onClose();
      }
    } catch (e) {
      if (e instanceof EntityConflictError) {
        setConflict(true);
        if (!e.current) void store.reload(kind);
      } else {
        setError(failure(e));
      }
    } finally {
      setBusy(false);
    }
  }, [canSave, entity, total, cap, capMessage, store, kind, fields, workId, analyticsType, toast, copy, onClose, failure]);

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

  // A dialog focuses its close button; a new entry should start on its name.
  useEffect(() => {
    if (!open || entity) return;
    const timer = setTimeout(() => bodyRef.current?.querySelector<HTMLInputElement>('input:not([type=checkbox])')?.focus(), 30);
    return () => clearTimeout(timer);
  }, [open, entity]);

  const requestClose = () => {
    if (busy) return;
    guard(onClose);
  };

  const duplicateNow = async () => {
    if (!entity || !duplicate || dirty || busy) return;
    if (total >= cap) {
      setError(capMessage);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await store.create(kind, duplicate(entity.fields));
      studioAnalytics.entityCreated(workId, analyticsType);
      toast(copy.duplicated);
      onOpenItem?.(created.id);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? capMessage : copy.duplicateFailed);
    } finally {
      setBusy(false);
    }
  };

  const trashNow = async () => {
    if (!entity) return;
    setBusy(true);
    try {
      await store.trash(kind, entity.id);
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
        title={title}
        description={description}
        closeLabel={copy.close}
        wide={wide}
        footer={
          <>
            {entity ? (
              <div className="mr-auto flex flex-wrap items-center gap-x-1">
                {duplicate ? (
                  <InkButton
                    variant="link"
                    fullWidth={false}
                    disabled={dirty || busy}
                    title={dirty ? copy.duplicateHint : undefined}
                    onClick={() => void duplicateNow()}
                  >
                    {copy.duplicateAction}
                  </InkButton>
                ) : null}
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
                      setFields(entity?.fields ?? empty());
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
          {children({ sessionKey, isNew: !entity, fields, set, dirty, busy, guard })}
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
        title={copy.trashTitle(nameOf(entity?.fields ?? fields) || copy.unnamed)}
        body={trashBody ?? copy.trashBody}
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

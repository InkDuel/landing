'use client';

import { useCallback, useEffect, useState } from 'react';

import { InkButton } from '@/components/ink/ink-button';
import { InkChip } from '@/components/ink/ink-chip';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { INTL_LOCALE } from '@/lib/i18n';
import { ApiError } from '@/lib/session/api';
import type { ChapterAutosave } from '@/lib/session/chapter-autosave';
import { conflictData, studioApi } from '@/lib/session/studio/api';
import type { Snapshot, SnapshotSummary } from '@/lib/session/studio/models';
import { STUDIO_COPY } from '@/lib/session/studio/studio-copy';
import { newClientId } from '@/lib/session/works';

import { useStudio } from './studio-context';
import { StudioConfirm, StudioInput, StudioSheet } from './studio-ui';

// «Versiones» of a draft: manual versions, automatic ones every 15 minutes of
// writing, a checkpoint per publish and backups taken before risky actions.
// Restoring backs up the current text and creates a new revision; the
// published chapter never changes from here.

export function VersionsSheet({
  open,
  onClose,
  draftId,
  engine,
  adopt,
  readOnly,
}: {
  open: boolean;
  onClose: () => void;
  draftId: string;
  engine: ChapterAutosave;
  /** Takes a restored version as the editor's saved text. */
  adopt: (snapshot: { revision: number; title: string; content: string }) => void;
  readOnly: boolean;
}) {
  const studio = useStudio();
  const { workId, locale, limits } = studio;
  const copy = STUDIO_COPY[locale];
  const v = copy.versions;
  const [items, setItems] = useState<SnapshotSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<Snapshot | null>(null);
  const [confirm, setConfirm] = useState<null | { kind: 'restore' | 'delete'; snapshot: SnapshotSummary }>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setItems(await studioApi.snapshots(workId, draftId, { locale }));
    } catch {
      setFailed(true);
    }
  }, [workId, draftId, locale]);

  useEffect(() => {
    if (open) void load();
    else {
      setPreview(null);
      setNotice(null);
    }
  }, [open, load]);

  const when = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(INTL_LOCALE[locale], { dateStyle: 'medium', timeStyle: 'short' });
  };
  const kindLabel = (s: SnapshotSummary) => {
    switch (s.kind) {
      case 'auto':
        return v.kindAuto;
      case 'publish':
        return v.kindPublish;
      case 'backup':
        return (
          {
            before_import: v.reasonBeforeImport,
            before_restore: v.reasonBeforeRestore,
            before_discard: v.reasonBeforeDiscard,
            before_split: v.reasonBeforeSplit,
          } as Record<string, string>
        )[s.reason] ?? v.kindBackup;
      default:
        return v.kindManual;
    }
  };

  async function saveVersion() {
    setSaving(true);
    setNotice(null);
    try {
      // A version is the server's text: sync first so it is what you see.
      if (!(await engine.flush())) {
        setNotice(copy.save.failed);
        return;
      }
      const created = await studioApi.createSnapshot(workId, draftId, { snapshotId: newClientId(), label: label.trim() }, { locale });
      setItems((prev) => [created, ...(prev ?? []).filter((s) => s.id !== created.id)]);
      setLabel('');
    } catch (error) {
      const code = conflictData(error)?.code;
      setNotice(code === 'limit_reached' ? v.limit(String(limits.manualSnapshots)) : copy.save.failed);
    } finally {
      setSaving(false);
    }
  }

  async function show(snapshot: SnapshotSummary) {
    try {
      setPreview(await studioApi.snapshot(workId, draftId, snapshot.id, { locale }));
    } catch {
      setNotice(v.loadError);
    }
  }

  async function run() {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === 'delete') {
        await studioApi.deleteSnapshot(workId, draftId, confirm.snapshot.id, { locale });
        setItems((prev) => (prev ?? []).filter((s) => s.id !== confirm.snapshot.id));
        if (preview?.id === confirm.snapshot.id) setPreview(null);
      } else {
        if (!(await engine.flush())) {
          setNotice(v.unsavedFirst);
          return;
        }
        const restored = await studioApi.restoreSnapshot(workId, draftId, confirm.snapshot.id, engine.getState().savedRevision, { locale });
        adopt({ revision: restored.revision, title: restored.title, content: restored.body });
        studio.applyDraft(restored);
        setNotice(v.restored);
        setPreview(null);
        await load();
      }
      setConfirm(null);
    } catch (error) {
      setNotice(error instanceof ApiError && error.status === 409 ? copy.conflict.title : copy.save.failed);
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  const fmt = (n: number) => n.toLocaleString(INTL_LOCALE[locale]);

  return (
    <StudioSheet open={open} onClose={onClose} title={v.title} description={v.intro} closeLabel={copy.shell.close} wide>
      <div className="flex flex-col gap-4">
        {!readOnly ? (
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              void saveVersion();
            }}
          >
            <StudioInput label={v.labelHint} value={label} onChange={setLabel} max={limits.snapshotLabel} maxLength={limits.snapshotLabel} className="flex-1" />
            <InkButton type="submit" variant="secondary" fullWidth={false} busy={saving} busyLabel={v.saving}>
              {v.saveVersion}
            </InkButton>
          </form>
        ) : null}
        {notice ? <InkInlineBanner tone="info" title={notice} /> : null}
        {failed ? <InkInlineBanner title={v.loadError} action={<InkTextAction onClick={() => void load()}>{copy.shell.retry}</InkTextAction>} /> : null}
        {items === null && !failed ? <InkSkeleton lines={3} height="h-14" label={copy.shell.loading} /> : null}
        {items?.length === 0 ? <p className="type-body text-secondary">{v.empty}</p> : null}
        {items && items.length > 0 ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {items.map((s) => (
              <li key={s.id} className="flex flex-col gap-1 border-t border-divider py-3 first:border-t-0">
                <div className="flex flex-wrap items-center gap-2">
                  <InkChip tone={s.kind === 'manual' ? 'victory' : s.kind === 'publish' ? 'success' : 'muted'}>{kindLabel(s)}</InkChip>
                  <span className="type-caption text-secondary">{when(s.createdAt)}</span>
                  <span className="type-caption text-tertiary">· {v.words(s.wordCount, fmt(s.wordCount))}</span>
                </div>
                {s.label ? <p className="type-body-strong text-[15px] break-words text-primary">{s.label}</p> : null}
                {s.title ? <p className="font-literary text-[15px] italic break-words text-reader-muted">{s.title}</p> : null}
                <div className="flex flex-wrap gap-x-1">
                  <InkButton variant="link" fullWidth={false} onClick={() => void show(s)}>
                    {v.view}
                  </InkButton>
                  {!readOnly ? (
                    <InkButton variant="link" fullWidth={false} onClick={() => setConfirm({ kind: 'restore', snapshot: s })}>
                      {v.restore}
                    </InkButton>
                  ) : null}
                  {!readOnly && s.kind === 'manual' ? (
                    <InkButton variant="link" fullWidth={false} className="text-danger" onClick={() => setConfirm({ kind: 'delete', snapshot: s })}>
                      {v.delete}
                    </InkButton>
                  ) : null}
                </div>
                {preview?.id === s.id ? (
                  <div className="ctx-reading mt-1 max-h-[50vh] overflow-y-auto rounded-control border-quiet border-divider p-4">
                    {preview.title ? <p className="type-literary-title text-content">{preview.title}</p> : null}
                    <p className="mt-2 font-literary text-[16px] leading-[1.7] whitespace-pre-wrap break-words text-content">{preview.body}</p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <StudioConfirm
        open={confirm !== null}
        title={confirm?.kind === 'delete' ? v.deleteTitle : v.restoreTitle}
        body={confirm?.kind === 'delete' ? v.deleteBody : v.restoreBody}
        confirmLabel={confirm?.kind === 'delete' ? v.delete : v.restoreConfirm}
        cancelLabel={copy.shell.cancel}
        destructive={confirm?.kind === 'delete'}
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => void run()}
      />
    </StudioSheet>
  );
}

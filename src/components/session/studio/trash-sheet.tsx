'use client';

import { useCallback, useEffect, useState } from 'react';

import { InkButton } from '@/components/ink/ink-button';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { formatDate } from '@/lib/i18n';
import { studioApi } from '@/lib/session/studio/api';
import { removeRecovery } from '@/lib/session/studio/local-recovery';
import { ENTITY_KINDS, type EntityKind, type TrashItem } from '@/lib/session/studio/models';
import { STUDIO_COPY } from '@/lib/session/studio/studio-copy';

import { useStudio } from './studio-context';
import { StudioConfirm, StudioSheet } from './studio-ui';

// Papelera: drafts and Studio entities stay restorable for 30 days; a
// permanent delete is always an explicit, confirmed choice.

export function TrashSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const studio = useStudio();
  const { workId, locale, store } = studio;
  const copy = STUDIO_COPY[locale];
  const t = copy.trash;
  const [items, setItems] = useState<TrashItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [purge, setPurge] = useState<TrashItem | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setItems(await studioApi.trash(workId, { locale }));
    } catch {
      setFailed(true);
    }
  }, [workId, locale]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function restore(item: TrashItem) {
    setBusy(item.id);
    try {
      if (item.kind === 'drafts') {
        const draft = await studioApi.untrashDraft(workId, item.id, { locale });
        studio.applyDraft(draft);
      } else if ((ENTITY_KINDS as readonly string[]).includes(item.kind)) {
        await store.untrash(item.kind as EntityKind, item.id);
      }
      setItems((prev) => (prev ?? []).filter((i) => i.id !== item.id));
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  async function purgeNow(item: TrashItem) {
    setBusy(item.id);
    try {
      if (item.kind === 'drafts') {
        await studioApi.purgeDraft(workId, item.id, { locale });
        void removeRecovery(studio.uid, workId, item.id);
      } else await studioApi.purgeEntity(workId, item.kind as EntityKind, item.id, { locale });
      if (item.kind === 'characters') store.dropRelationsOf(item.id);
      setItems((prev) => (prev ?? []).filter((i) => i.id !== item.id));
      setPurge(null);
    } catch {
      setFailed(true);
      setPurge(null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <StudioSheet open={open} onClose={onClose} title={t.title} description={t.intro} closeLabel={copy.shell.close}>
      {failed ? <InkInlineBanner title={t.error} action={<InkTextAction onClick={() => void load()}>{copy.shell.retry}</InkTextAction>} /> : null}
      {items === null && !failed ? <InkSkeleton lines={3} height="h-12" label={copy.shell.loading} /> : null}
      {items?.length === 0 ? <p className="type-body text-secondary">{t.empty}</p> : null}
      <ul className="m-0 flex list-none flex-col p-0">
        {items?.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="flex flex-col gap-1 border-t border-divider py-3 first:border-t-0">
            <p className="type-label text-[10.5px] text-tertiary">{t.kinds[item.kind] ?? item.kind}</p>
            <p className="type-body-strong break-words text-primary">{item.title || copy.manuscript.untitledDraft}</p>
            <p className="type-caption text-secondary">{t.purgeAt(formatDate(item.purgeAt, locale))}</p>
            <div className="flex flex-wrap gap-x-1">
              <InkButton variant="link" fullWidth={false} busy={busy === item.id} onClick={() => void restore(item)}>
                {t.restore}
              </InkButton>
              <InkButton variant="link" fullWidth={false} className="text-danger" disabled={busy !== null} onClick={() => setPurge(item)}>
                {t.purge}
              </InkButton>
            </div>
          </li>
        ))}
      </ul>
      <StudioConfirm
        open={purge !== null}
        title={t.purgeTitle}
        body={t.purgeBody}
        confirmLabel={t.purge}
        cancelLabel={copy.shell.cancel}
        destructive
        busy={busy !== null}
        onClose={() => setPurge(null)}
        onConfirm={() => purge && void purgeNow(purge)}
      />
    </StudioSheet>
  );
}

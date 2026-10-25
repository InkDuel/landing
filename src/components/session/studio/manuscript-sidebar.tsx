'use client';

import { useMemo, useState } from 'react';

import { cx } from '@/components/ink/cx';
import { PlusIcon, SearchIcon, TrashIcon, UploadIcon } from '@/components/ink/icons';
import { InkChip } from '@/components/ink/ink-chip';
import { INTL_LOCALE } from '@/lib/i18n';
import type { ManuscriptEntry } from '@/lib/session/studio/models';
import { STUDIO_COPY } from '@/lib/session/studio/studio-copy';

import { ImportSheet } from './portability';
import { entryTitle, entryWords, useStudio } from './studio-context';
import { TrashSheet } from './trash-sheet';

// The manuscript index: chapters in their public order, then the drafts that
// are not chapters yet. Selecting one saves the open text first.

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function ManuscriptSidebar({ onSelected }: { onSelected?: () => void }) {
  const studio = useStudio();
  const { overview, locale, docId } = studio;
  const copy = STUDIO_COPY[locale];
  const m = copy.manuscript;
  const [filter, setFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const fmt = (n: number) => n.toLocaleString(INTL_LOCALE[locale]);
  const labels = { chapter: m.chapterLabel, untitled: m.untitledDraft };

  const entries = useMemo(() => {
    const q = fold(filter.trim());
    if (!q) return overview.manuscript;
    return overview.manuscript.filter((e) => fold(entryTitle(e, labels)).includes(q) || fold(e.draft?.synopsis ?? '').includes(q));
    // labels are stable per locale
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, overview.manuscript, locale]);

  async function select(entry: ManuscriptEntry) {
    if (await studio.openEntry(entry)) onSelected?.();
  }

  async function create() {
    setCreating(true);
    const id = await studio.createChapter();
    setCreating(false);
    if (id) onSelected?.();
  }

  const atLimit = overview.manuscript.filter((e) => !e.chapterId).length >= overview.limits.maxDrafts;

  return (
    <nav aria-label={m.title} className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="type-label text-secondary">{m.title}</h2>
        <span className="type-caption tabular-nums text-tertiary">{overview.manuscript.length}</span>
      </div>
      {overview.manuscript.length > 6 ? (
        <label className="flex min-h-11 items-center gap-2 rounded-control border-quiet border-control bg-surface px-3">
          <SearchIcon size={16} className="shrink-0 text-tertiary" />
          <span className="sr-only">{m.filter}</span>
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={m.filter}
            className="min-w-0 flex-1 bg-transparent type-body-sm outline-none placeholder:text-placeholder"
          />
        </label>
      ) : null}
      <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
        {entries.map((entry) => {
          const active = entry.id === docId;
          const pending = entry.published && entry.draft?.pendingChanges;
          const words = entryWords(entry);
          return (
            <li key={entry.id}>
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => void select(entry)}
                className={cx(
                  // A border inside the box (never a ring outside it): the
                  // scrolling sidebar would clip anything drawn outside.
                  'ink-focus flex w-full flex-col items-start gap-0.5 rounded-control border-brand px-3 py-2 text-left',
                  active ? 'border-outline bg-surface' : 'border-transparent hover:bg-surface',
                )}
              >
                <span className="type-label text-[10.5px] text-tertiary">{entry.chapterId ? m.chapterLabel(entry.orderIndex) : m.newDraftLabel}</span>
                <span className="line-clamp-2 font-literary text-[16px] leading-[1.25] font-semibold break-words text-primary">
                  {entryTitle(entry, labels)}
                </span>
                <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {entry.published ? (
                    <InkChip tone={pending ? 'draw' : 'success'}>{pending ? m.publishedPending : m.published}</InkChip>
                  ) : (
                    <InkChip tone="muted">{entry.chapterId ? m.unpublished : m.notChapterYet}</InkChip>
                  )}
                  {entry.draft && entry.draft.status !== 'draft' ? <InkChip tone="outline">{copy.status[entry.draft.status]}</InkChip> : null}
                  <span className="type-caption tabular-nums text-tertiary">{m.words(words, fmt(words))}</span>
                </span>
                {entry.publishedChanged ? <span className="type-caption text-warning">{m.changedElsewhere}</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
      {filter && entries.length === 0 ? <p className="type-body-sm text-secondary">{m.noMatches}</p> : null}
      {atLimit ? (
        <p className="type-caption text-secondary">{m.limitReached(fmt(overview.limits.maxDrafts))}</p>
      ) : (
        <button
          type="button"
          onClick={() => void create()}
          disabled={creating}
          className="ink-focus ink-dim inline-flex min-h-11 items-center gap-2 rounded-control border-quiet border-dashed border-control px-3 type-button-sm text-primary"
        >
          <PlusIcon size={20} />
          {creating ? m.creating : m.newChapter}
        </button>
      )}
      <div className="flex flex-wrap gap-1 border-t border-divider pt-2">
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="ink-focus ink-dim inline-flex min-h-11 items-center gap-2 rounded-control px-2 type-caption text-secondary"
        >
          <UploadIcon size={16} />
          {m.import}
        </button>
        <button
          type="button"
          onClick={() => setTrashOpen(true)}
          className="ink-focus ink-dim inline-flex min-h-11 items-center gap-2 rounded-control px-2 type-caption text-secondary"
        >
          <TrashIcon size={16} />
          {m.trash}
        </button>
      </div>
      <TrashSheet open={trashOpen} onClose={() => setTrashOpen(false)} />
      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} />
    </nav>
  );
}

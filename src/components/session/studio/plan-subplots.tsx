'use client';

import { useMemo } from 'react';

import { InkChip } from '@/components/ink/ink-chip';
import { INTL_LOCALE } from '@/lib/i18n';
import { type Entity, SCENE_STATUSES } from '@/lib/session/studio/models';
import { summarizeSubplots } from '@/lib/session/studio/plan-order';

import { STATUS_TONE, usePlanCopy } from './plan-common';
import { useStudio } from './studio-context';

// «Sinopsis general y subtramas» (PRD §8.4). Only what the cards already say:
// the subplots in use and how their scenes are doing. Nothing is stored for
// it, so it can never disagree with the cards.

export function SubplotPanel({ scenes, onShow }: { scenes: readonly Entity<'scenes'>[]; onShow: (name: string) => void }) {
  const copy = usePlanCopy();
  const { locale } = useStudio();
  const rows = useMemo(() => {
    const collator = new Intl.Collator(INTL_LOCALE[locale], { sensitivity: 'base', numeric: true });
    return summarizeSubplots(
      scenes.map((scene) => scene.fields),
      SCENE_STATUSES,
      collator.compare,
    );
  }, [scenes, locale]);
  const format = (n: number) => n.toLocaleString(INTL_LOCALE[locale]);

  return (
    <details className="rounded-card border-quiet border-divider bg-surface">
      <summary className="ink-focus flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-card px-4 py-2 type-body-strong text-primary">
        <span>{copy.subplots.title}</span>
        {rows.length > 0 ? <span className="type-caption text-secondary tabular-nums">{format(rows.length)}</span> : null}
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <p className="type-caption text-secondary">{copy.subplots.intro}</p>
        {rows.length === 0 ? (
          <p className="type-body-sm text-secondary">{copy.subplots.none}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-divider p-0">
            {rows.map((row) => (
              <li key={row.name.toLowerCase()} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
                <div className="min-w-0">
                  <p className="type-body-strong break-words text-primary">{row.name}</p>
                  <p className="type-caption text-secondary">{copy.subplots.scenes(row.total, format(row.total))}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {SCENE_STATUSES.filter((status) => row.byStatus[status] > 0).map((status) => (
                      <InkChip key={status} tone={STATUS_TONE[status]}>{`${copy.status[status]} ${format(row.byStatus[status])}`}</InkChip>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={copy.subplots.showScenes(row.name)}
                  onClick={() => onShow(row.name)}
                  className="ink-focus ink-dim inline-flex min-h-11 items-center rounded-control px-2 type-button-sm text-[14px] text-blue"
                >
                  {copy.subplots.show}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

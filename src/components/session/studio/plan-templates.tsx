'use client';

import { useId, useRef, useState } from 'react';

import { cx } from '@/components/ink/cx';
import { InkButton } from '@/components/ink/ink-button';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { emptyFields } from '@/lib/session/studio/models';
import { studioAnalytics } from '@/lib/session/studio/studio-analytics';
import { type TemplateId } from '@/lib/session/studio/studio-plan-copy';
import { newClientId } from '@/lib/session/works';

import { SCENE_CAP, usePlanCopy } from './plan-common';
import { useStudio } from './studio-context';
import { StudioSheet } from './studio-ui';

// Templates (PRD §8.5) are suggestions, not judgments: applying one only ADDS
// idea cards at the end of the plan, never touches the ones that exist, and
// lists exactly what it will create before it does. Ids are minted once per
// confirmation and kept across retries, and cards are created one after the
// other, so a failure half way never duplicates anything on the next try.

const ORDER: readonly TemplateId[] = ['free', 'three_acts', 'short_story'];

type Attempt = { ids: string[]; done: Set<string> };

export function TemplatesSheet({ open, total, onClose }: { open: boolean; total: number; onClose: () => void }) {
  const plan = usePlanCopy();
  const copy = plan.templates;
  const { store, workId, toast } = useStudio();
  const groupId = useId();
  const [choice, setChoice] = useState<TemplateId>('three_acts');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One attempt per template: a retry reuses its ids and skips what exists.
  const attempts = useRef(new Map<TemplateId, Attempt>());

  const template = copy.items[choice];
  const count = template.cards.length;

  const close = () => {
    if (!busy) onClose();
  };

  const apply = async () => {
    if (busy) return;
    if (count === 0) {
      onClose();
      return;
    }
    if (total + count > SCENE_CAP) {
      setError(copy.cap(String(SCENE_CAP)));
      return;
    }
    let attempt = attempts.current.get(choice);
    if (!attempt) {
      attempt = { ids: template.cards.map(() => newClientId()), done: new Set() };
      attempts.current.set(choice, attempt);
    }
    setBusy(true);
    setError(null);
    try {
      for (let i = 0; i < template.cards.length; i += 1) {
        const id = attempt.ids[i];
        if (attempt.done.has(id)) continue;
        const card = template.cards[i];
        await store.create('scenes', { ...emptyFields('scenes'), title: card.title, synopsis: card.synopsis, status: 'idea' }, id);
        attempt.done.add(id);
        studioAnalytics.sceneCreated(workId);
      }
      attempts.current.delete(choice);
      toast(copy.done(count, String(count)));
      onClose();
    } catch {
      setError(copy.partial(String(attempt.done.size), String(count)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <StudioSheet open={open} onClose={close} title={copy.title} description={copy.description} closeLabel={plan.sheet.close} footer={
      <>
        <InkButton variant="secondary" fullWidth={false} disabled={busy} onClick={close}>
          {plan.sheet.cancel}
        </InkButton>
        <InkButton fullWidth={false} busy={busy} busyLabel={copy.adding} onClick={() => void apply()}>
          {count === 0 ? copy.keepFree : copy.add(String(count))}
        </InkButton>
      </>
    }>
      <div className="flex flex-col gap-5">
        {error ? <InkInlineBanner title={error} /> : null}
        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
          <legend className="mb-1 font-ui text-[12.5px] font-extrabold text-primary">{copy.choose}</legend>
          {ORDER.map((id) => {
            const item = copy.items[id];
            const selected = choice === id;
            return (
              <label
                key={id}
                className={cx(
                  'flex min-h-11 cursor-pointer items-start gap-3 rounded-card border-quiet p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue',
                  selected ? 'border-outline bg-tint-yellow' : 'border-divider bg-surface hover:border-outline',
                )}
              >
                <input
                  type="radio"
                  name={groupId}
                  value={id}
                  checked={selected}
                  disabled={busy}
                  onChange={() => {
                    setChoice(id);
                    setError(null);
                  }}
                  className="mt-1 size-5 shrink-0 accent-[var(--ink-brand-ink)]"
                />
                <span className="min-w-0">
                  <span className="block type-body-strong text-primary">{item.name}</span>
                  <span className="block type-body-sm text-secondary">{item.description}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <section aria-labelledby={`${groupId}-preview`} className="flex flex-col gap-2">
          <h3 id={`${groupId}-preview`} className="type-label text-secondary">
            {copy.previewTitle}
          </h3>
          {count === 0 ? (
            <p className="type-body-sm text-secondary">{copy.previewNone}</p>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {template.cards.map((card) => (
                <li key={card.title} className="rounded-control border-quiet border-divider bg-surface px-3 py-2">
                  <span className="block type-body-strong break-words text-primary">{card.title}</span>
                  <span className="block type-caption break-words text-secondary">{card.synopsis}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </StudioSheet>
  );
}

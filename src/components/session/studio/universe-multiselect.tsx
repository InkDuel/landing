'use client';

import { useId, useMemo, useState } from 'react';

import { cx } from '@/components/ink/cx';

import { fold, MAX_LINK_IDS, useUniverseCopy } from './universe-common';

// Link several entries by id (lore notes and scenes). A filterable checklist:
// every row is a native checkbox, so keyboard and screen readers just work.
// Ids that no longer resolve (trashed entries) are kept as they are.

export type LinkOption = { id: string; label: string };

export function UniverseLinkPicker({
  label,
  options,
  value,
  onChange,
  searchLabel,
  emptyLabel,
  selectedLabel,
}: {
  label: string;
  options: readonly LinkOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  searchLabel: string;
  emptyLabel: string;
  selectedLabel: (count: number, formatted: string) => string;
}) {
  const copy = useUniverseCopy().common;
  const searchId = useId();
  const [query, setQuery] = useState('');
  const known = useMemo(() => new Set(options.map((option) => option.id)), [options]);
  const selectedCount = value.filter((id) => known.has(id)).length;
  const q = fold(query.trim());
  const shown = q ? options.filter((option) => fold(option.label).includes(q)) : options;
  const atLimit = value.length >= MAX_LINK_IDS;

  const toggle = (id: string, on: boolean) => {
    if (on) onChange(value.includes(id) ? value : [...value, id]);
    else onChange(value.filter((v) => v !== id));
  };

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="mb-0.5 flex w-full items-baseline justify-between gap-3 p-0">
        <span className="font-ui text-[12.5px] font-extrabold text-primary">{label}</span>
        {selectedCount > 0 ? (
          <span className="type-caption text-tertiary">{selectedLabel(selectedCount, String(selectedCount))}</span>
        ) : null}
      </legend>
      {options.length === 0 ? (
        <p className="type-body-sm text-secondary">{emptyLabel}</p>
      ) : (
        <>
          {options.length > 6 ? (
            <div className="flex flex-col gap-1">
              <label htmlFor={searchId} className="sr-only">
                {searchLabel}
              </label>
              <input
                id={searchId}
                type="search"
                value={query}
                placeholder={searchLabel}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-11 w-full rounded-control border-quiet border-control bg-surface px-3 type-body-sm text-content outline-none placeholder:text-placeholder focus:border-outline"
              />
            </div>
          ) : null}
          <ul className="m-0 max-h-56 list-none divide-y divide-divider overflow-y-auto rounded-control border-quiet border-divider p-0">
            {shown.map((option) => {
              const checked = value.includes(option.id);
              const disabled = !checked && atLimit;
              return (
                <li key={option.id}>
                  <label
                    className={cx(
                      'flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 type-body-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-blue',
                      disabled && 'cursor-not-allowed text-disabled',
                      checked && 'bg-tint-yellow',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={(event) => toggle(option.id, event.target.checked)}
                      className="size-5 shrink-0 accent-[var(--ink-brand-ink)]"
                    />
                    <span className="min-w-0 break-words">{option.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {atLimit ? <p className="type-caption text-secondary">{copy.linkLimit(String(MAX_LINK_IDS))}</p> : null}
        </>
      )}
    </fieldset>
  );
}

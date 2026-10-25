'use client';

import { type ReactNode, type RefObject, useEffect, useId, useMemo, useRef, useState } from 'react';

import { cx } from '@/components/ink/cx';
import { ArrowDownIcon, ArrowUpIcon, CloseIcon, MoreIcon } from '@/components/ink/icons';
import { type ChapterEditorState, isDirty } from '@/lib/session/chapter-autosave';
import { diffLines } from '@/lib/session/studio/diff';
import { type EditorPrefs, PREF_FONT_SIZE, PREF_LINE_HEIGHT, PREF_WIDTH } from '@/lib/session/studio/preferences';
import type { StudioCopy } from '@/lib/session/studio/studio-copy';

import { StudioIconButton, StudioSegmented, StudioSheet, StudioToggle } from './studio-ui';

// Pieces of the Studio editor: honest save status, in-chapter find, writing
// settings, a line comparison and a small actions menu.

export type SaveView = { text: string; tone: 'quiet' | 'ok' | 'warn' | 'danger'; announce: boolean };

/**
 * The PRD states (clean · dirty · saving · saved · retrying · failed ·
 * conflict · offlineLocal). «Guardado en este dispositivo» only when the local
 * copy of exactly this text was written.
 */
export function saveView(state: ChapterEditorState, localCopied: boolean, copy: StudioCopy['save']): SaveView {
  const dirty = isDirty(state);
  switch (state.status) {
    case 'invalid':
      return { text: copy.invalid, tone: 'danger', announce: true };
    case 'conflict':
      return { text: copy.conflict, tone: 'danger', announce: true };
    case 'saving':
      return { text: copy.saving, tone: 'quiet', announce: false };
    case 'retrying':
      return localCopied ? { text: copy.local, tone: 'warn', announce: true } : { text: copy.retrying, tone: 'warn', announce: true };
    case 'failed':
      return localCopied ? { text: copy.local, tone: 'warn', announce: true } : { text: copy.failed, tone: 'danger', announce: true };
    case 'saved':
      return dirty ? { text: copy.dirty, tone: 'quiet', announce: false } : { text: copy.saved, tone: 'ok', announce: false };
    default:
      return { text: dirty ? copy.dirty : copy.clean, tone: 'quiet', announce: false };
  }
}

export function SaveStatus({ view, className }: { view: SaveView; className?: string }) {
  // Visible always; read aloud only when it matters (failures, local copy,
  // conflicts), so an autosave every 20 s never chatters.
  const [spoken, setSpoken] = useState('');
  const hadProblem = useRef(false);
  useEffect(() => {
    if (view.announce) {
      hadProblem.current = true;
      setSpoken(view.text);
    } else if (hadProblem.current && view.tone === 'ok') {
      // Say once that it is synced again, then stay quiet.
      hadProblem.current = false;
      setSpoken(view.text);
    } else if (!hadProblem.current) {
      setSpoken('');
    }
  }, [view.announce, view.text, view.tone]);
  return (
    <>
      <span
        className={cx(
          'inline-flex items-center gap-1.5 type-caption whitespace-nowrap',
          view.tone === 'danger' ? 'text-danger' : view.tone === 'warn' ? 'text-warning' : view.tone === 'ok' ? 'text-success' : 'text-tertiary',
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            'size-2 rounded-full',
            view.tone === 'danger' ? 'bg-[var(--ink-danger)]' : view.tone === 'warn' ? 'bg-[var(--ink-warning)]' : view.tone === 'ok' ? 'bg-[var(--ink-success)]' : 'bg-[var(--ink-border-default)]',
          )}
        />
        {view.text}
      </span>
      <span className="sr-only" role="status" aria-live="polite">
        {spoken}
      </span>
    </>
  );
}

/** All case-insensitive occurrences of [needle] (UTF-16 offsets). */
export function findMatches(text: string, needle: string): number[] {
  if (!needle) return [];
  const hay = text.toLowerCase();
  const n = needle.toLowerCase();
  if (n.length !== needle.length || hay.length !== text.length) {
    // Case mapping changed lengths (rare scripts): search case-sensitively.
    const out: number[] = [];
    for (let i = text.indexOf(needle); i >= 0 && out.length < 2000; i = text.indexOf(needle, i + needle.length)) out.push(i);
    return out;
  }
  const out: number[] = [];
  for (let i = hay.indexOf(n); i >= 0 && out.length < 2000; i = hay.indexOf(n, i + n.length)) out.push(i);
  return out;
}

/** Vertical offset of character [index] inside a textarea (mirror technique). */
function caretTop(textarea: HTMLTextAreaElement, index: number): number {
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');
  for (const prop of [
    'boxSizing',
    'width',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'borderTopWidth',
    'borderLeftWidth',
    'borderRightWidth',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
  ] as const) {
    mirror.style[prop] = style[prop];
  }
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.overflowWrap = 'break-word';
  mirror.style.top = '0';
  mirror.style.left = '-9999px';
  mirror.textContent = textarea.value.slice(0, index);
  const marker = document.createElement('span');
  marker.textContent = '​';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const top = marker.offsetTop;
  mirror.remove();
  return top;
}

/** Selects a range and scrolls it into view (page or textarea scroll). */
export function revealRange(textarea: HTMLTextAreaElement, start: number, end: number) {
  textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(start, end);
  const top = caretTop(textarea, start);
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (textarea.scrollHeight > textarea.clientHeight + 4) {
    textarea.scrollTop = Math.max(0, top - textarea.clientHeight / 3);
  } else {
    const y = textarea.getBoundingClientRect().top + window.scrollY + top - window.innerHeight / 3;
    window.scrollTo({ top: Math.max(0, y), behavior: reduced ? 'auto' : 'smooth' });
  }
}

export function FindBar({
  textareaRef,
  text,
  copy,
  onClose,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  text: string;
  copy: StudioCopy['editor'];
  onClose: () => void;
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => findMatches(text, query), [text, query]);
  useEffect(() => inputRef.current?.focus(), []);
  const go = (requested: number) => {
    if (matches.length === 0 || !textareaRef.current) return;
    const next = started ? requested : 0;
    setStarted(true);
    const i = ((next % matches.length) + matches.length) % matches.length;
    setIndex(i);
    revealRange(textareaRef.current, matches[i], matches[i] + query.length);
    inputRef.current?.focus({ preventScroll: true });
  };
  const status = query ? (matches.length ? copy.findCount(String(Math.min(index, matches.length - 1) + 1), String(matches.length)) : copy.findNone) : '';
  return (
    <div role="search" className="flex flex-wrap items-center gap-1 rounded-control border-quiet border-control bg-surface p-1">
      <label htmlFor={id} className="sr-only">
        {copy.findLabel}
      </label>
      <input
        ref={inputRef}
        id={id}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIndex(0);
          setStarted(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            go(event.shiftKey ? index - 1 : index + 1);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
        }}
        placeholder={copy.find}
        className="min-h-10 min-w-0 flex-1 bg-transparent px-2 type-body outline-none placeholder:text-placeholder"
      />
      <span className="px-1 type-caption tabular-nums text-secondary" aria-live="polite">
        {status}
      </span>
      <StudioIconButton label={copy.findPrev} onClick={() => go(index - 1)} disabled={matches.length === 0}>
        <ArrowUpIcon size={20} />
      </StudioIconButton>
      <StudioIconButton label={copy.findNext} onClick={() => go(index + 1)} disabled={matches.length === 0}>
        <ArrowDownIcon size={20} />
      </StudioIconButton>
      <StudioIconButton label={copy.findClose} onClick={onClose}>
        <CloseIcon size={20} />
      </StudioIconButton>
    </div>
  );
}

/**
 * «Aa»: how the page looks while writing, a click away and live — like the
 * reading/writing apps people already know (Apple Books, Kindle, iA Writer).
 * It never changes the text that is saved or published.
 */
export function AppearancePopover({
  prefs,
  onChange,
  copy,
  onMore,
}: {
  prefs: EditorPrefs;
  onChange: (patch: Partial<EditorPrefs>) => void;
  copy: StudioCopy;
  onMore: () => void;
}) {
  const p = copy.prefs;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const trigger = () => ref.current?.querySelector<HTMLButtonElement>('button[aria-haspopup]');
  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
        trigger()?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const idx = (values: readonly string[]) => values.map((label, i) => ({ value: String(i), label }));
  const step = (delta: -1 | 1) => onChange({ size: Math.min(3, Math.max(0, prefs.size + delta)) as EditorPrefs['size'] });
  const stepper = 'ink-focus inline-flex size-10 items-center justify-center rounded-control border-quiet border-control bg-surface font-literary text-primary disabled:text-disabled';
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={p.appearance}
        title={p.appearance}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          'ink-focus inline-flex size-11 shrink-0 items-center justify-center rounded-control font-literary text-[18px] leading-none text-primary ink-dim hover:bg-sunken',
          open && 'bg-tint-yellow',
        )}
      >
        <span aria-hidden="true">
          A<span className="text-[13px]">a</span>
        </span>
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={p.appearance}
          className={cx(
            'z-30 flex flex-col gap-4 overflow-y-auto rounded-card border-brand border-outline bg-elevated p-4 ink-shadow-lift-sm',
            // Under the button on wide screens; a bottom panel on phones.
            'fixed inset-x-4 bottom-4 max-h-[70dvh] sm:absolute sm:inset-x-auto sm:right-0 sm:bottom-auto sm:mt-1 sm:max-h-[min(560px,calc(100dvh-180px))] sm:w-[320px]',
          )}
        >
          <div className="flex flex-col gap-1.5">
            <span className="font-ui text-[12.5px] font-extrabold text-primary">{p.size}</span>
            <div className="flex items-center gap-2">
              <button type="button" data-autofocus className={cx(stepper, 'text-[14px]')} aria-label={p.smaller} disabled={prefs.size === 0} onClick={() => step(-1)}>
                A
              </button>
              <span aria-live="polite" className="min-w-0 flex-1 text-center type-body-sm text-secondary">
                {p.sizes[prefs.size]}
              </span>
              <button type="button" className={cx(stepper, 'text-[20px]')} aria-label={p.larger} disabled={prefs.size === 3} onClick={() => step(1)}>
                A
              </button>
            </div>
          </div>
          <StudioSegmented
            label={p.font}
            value={prefs.font}
            onChange={(font) => onChange({ font })}
            options={[
              { value: 'serif', label: p.serif },
              { value: 'sans', label: p.sans },
            ]}
          />
          <StudioSegmented label={p.lineHeight} value={String(prefs.line)} onChange={(v) => onChange({ line: Number(v) as EditorPrefs['line'] })} options={idx(p.lineHeights)} />
          <StudioSegmented label={p.width} value={String(prefs.width)} onChange={(v) => onChange({ width: Number(v) as EditorPrefs['width'] })} options={idx(p.widths)} />
          <StudioToggle label={p.spellcheck} checked={prefs.spellcheck} onChange={(spellcheck) => onChange({ spellcheck })} />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onMore();
            }}
            className="ink-focus -mb-1 inline-flex min-h-10 items-center self-start rounded-control type-button-sm text-[14px] text-blue ink-dim"
          >
            {p.more}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** The rarely needed settings: the emergency copy and the shortcuts. */
export function MoreSettingsSheet({
  open,
  onClose,
  copy,
  closeLabel,
  recovery,
}: {
  open: boolean;
  onClose: () => void;
  copy: StudioCopy;
  closeLabel: string;
  recovery: { enabled: boolean; available: boolean; onChange: (enabled: boolean) => void };
}) {
  return (
    <StudioSheet open={open} onClose={onClose} title={copy.prefs.moreTitle} closeLabel={closeLabel}>
      <div className="flex flex-col gap-5">
        <StudioToggle
          label={copy.recovery.settingLabel}
          help={recovery.available ? copy.recovery.settingHelp : copy.recovery.unavailable}
          checked={recovery.enabled && recovery.available}
          disabled={!recovery.available}
          onChange={recovery.onChange}
        />
        <div className="border-t border-divider pt-4">
          <p className="type-label text-secondary">{copy.editor.shortcuts}</p>
          <dl className="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 type-body-sm">
            {[
              ['⌘/Ctrl + S', copy.editor.shortcutSave],
              ['⌘/Ctrl + K', copy.editor.shortcutPalette],
              ['⌘/Ctrl + ⇧ + F', copy.editor.shortcutFind],
              ['⌘/Ctrl + ⇧ + Enter', copy.editor.shortcutFocus],
            ].map(([keys, label]) => (
              <div key={keys} className="contents">
                <dt>
                  <kbd className="rounded-chip border-quiet border-default px-1.5 font-ui text-[12px]">{keys}</kbd>
                </dt>
                <dd className="m-0 text-secondary">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </StudioSheet>
  );
}

export function editorTextStyle(prefs: EditorPrefs) {
  return {
    fontSize: `${PREF_FONT_SIZE[prefs.size]}px`,
    lineHeight: String(PREF_LINE_HEIGHT[prefs.line]),
    maxWidth: `${PREF_WIDTH[prefs.width]}px`,
  } as const;
}

/** Side-by-side (stacked on phones) line comparison of two texts. */
export function CompareView({ before, after, beforeLabel, afterLabel }: { before: string; after: string; beforeLabel: string; afterLabel: string }) {
  const lines = useMemo(() => diffLines(before, after), [before, after]);
  return (
    <div className="flex flex-col gap-2">
      <p className="flex flex-wrap gap-x-4 gap-y-1 type-caption text-secondary">
        <span>
          <span aria-hidden="true" className="mr-1 inline-block size-3 rounded-sm bg-tint-danger align-middle" />− {beforeLabel}
        </span>
        <span>
          <span aria-hidden="true" className="mr-1 inline-block size-3 rounded-sm bg-tint-success align-middle" />+ {afterLabel}
        </span>
      </p>
      <ol className="m-0 list-none rounded-control border-quiet border-divider bg-surface p-0 font-literary text-[15px] leading-[1.6]">
        {lines.map((line, i) => (
          <li
            key={i}
            className={cx(
              'flex gap-2 px-3 py-0.5 whitespace-pre-wrap break-words',
              line.kind === 'added' && 'bg-tint-success',
              line.kind === 'removed' && 'bg-tint-danger',
            )}
          >
            <span aria-hidden="true" className="w-3 shrink-0 font-ui text-tertiary select-none">
              {line.kind === 'added' ? '+' : line.kind === 'removed' ? '−' : ''}
            </span>
            <span className="sr-only">{line.kind === 'added' ? `${afterLabel}: ` : line.kind === 'removed' ? `${beforeLabel}: ` : ''}</span>
            <span className="min-w-0">{line.text || ' '}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A disclosure menu of real actions (closes on Escape and outside clicks). */
export function StudioMenu({ label, items }: { label: string; items: { key: string; label: string; onSelect: () => void; danger?: boolean; hidden?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  // Closing from the keyboard or by choosing returns focus to the trigger.
  const close = (restore: boolean) => {
    setOpen(false);
    if (restore) ref.current?.querySelector<HTMLButtonElement>('button[aria-haspopup]')?.focus();
  };
  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        ref.current?.querySelector<HTMLButtonElement>('button[aria-haspopup]')?.focus();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
        const at = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = items[(at + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
        if (next) {
          event.preventDefault();
          next.focus();
        }
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const visible = items.filter((i) => !i.hidden);
  if (visible.length === 0) return null;
  return (
    <div ref={ref} className="relative">
      <StudioIconButton label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen((v) => !v)}>
        <MoreIcon size={20} />
      </StudioIconButton>
      {open ? (
        <ul
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute right-0 z-30 m-0 mt-1 min-w-[260px] list-none rounded-card border-brand border-outline bg-elevated p-1 ink-shadow-lift-sm"
        >
          {visible.map((item) => (
            <li key={item.key} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close(true);
                  item.onSelect();
                }}
                className={cx(
                  'ink-focus flex min-h-11 w-full items-center rounded-control px-3 text-left type-body-sm hover:bg-sunken',
                  item.danger ? 'text-danger' : 'text-primary',
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ToolbarDivider() {
  return <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-[var(--ink-c-divider)] sm:block" />;
}

export function Banner({ children }: { children: ReactNode }) {
  return <div className="studio-chrome">{children}</div>;
}

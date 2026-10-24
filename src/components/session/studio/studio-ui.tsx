'use client';

import {
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import { cx } from '@/components/ink/cx';
import { CloseIcon } from '@/components/ink/icons';
import { InkButton } from '@/components/ink/ink-button';
import { InkDialog } from '@/components/ink/ink-dialog';

// Studio building blocks on top of the Ink system: a side sheet (drawer on
// desktop, full screen on phones), labelled fields with live rune counters,
// tag input, segmented choice and icon buttons. Utility surfaces stay clear and
// functional; the literary atmosphere belongs to the manuscript itself.

/** Code points, as every backend limit counts them. */
export function runes(value: string): number {
  let n = 0;
  for (const ch of value) n += ch ? 1 : 0;
  return n;
}

/** 44×44 icon button with a visible-on-hover tooltip and an accessible name. */
export function StudioIconButton({
  label,
  onClick,
  pressed,
  disabled,
  children,
  className,
  ...rest
}: {
  label: string;
  onClick?: () => void;
  pressed?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<'button'>, 'onClick' | 'children' | 'className' | 'aria-label'>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'ink-focus inline-flex size-11 shrink-0 items-center justify-center rounded-control text-primary',
        disabled ? 'text-disabled' : 'ink-dim hover:bg-sunken',
        pressed && 'bg-tint-yellow',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * A modal side sheet built on <dialog>: focus trap, Escape and focus return
 * come from the platform. Right-anchored on wide screens, full screen on
 * phones. [onClose] may refuse (return false) to protect unsaved edits.
 */
export function StudioSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
  closeLabel,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Localized «Cerrar». */
  closeLabel: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cx(
        'm-0 h-dvh max-h-dvh w-full max-w-full bg-elevated p-0 text-primary backdrop:bg-[var(--ink-overlay-scrim)]',
        'sm:ml-auto sm:border-l-2 sm:border-outline sm:ink-shadow-lift',
        wide ? 'sm:max-w-[720px]' : 'sm:max-w-[480px]',
      )}
    >
      {open ? (
        <div className="flex h-full flex-col">
          <header className="flex items-start gap-3 border-b border-divider px-5 py-3">
            <div className="min-w-0 flex-1 pt-2">
              <h2 id={titleId} className="type-title-section text-[22px] break-words text-primary">
                {title}
              </h2>
              {description ? (
                <p id={descId} className="mt-1 type-body-sm text-secondary">
                  {description}
                </p>
              ) : null}
            </div>
            <StudioIconButton label={closeLabel} aria-keyshortcuts="Escape" onClick={onClose} className="-mr-2">
              <CloseIcon size={20} />
            </StudioIconButton>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? (
            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-divider px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
              {footer}
            </footer>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}

/** A label above a control, an optional hint and a rune counter near the limit. */
export function StudioField({
  label,
  hint,
  error,
  count,
  max,
  children,
  htmlFor,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  count?: number;
  max?: number;
  children: ReactNode;
  htmlFor: string;
  className?: string;
}) {
  const near = count !== undefined && max !== undefined && count > max * 0.8;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="font-ui text-[12.5px] font-extrabold text-primary">
          {label}
        </label>
        {near ? (
          <span className={cx('type-caption tabular-nums', count > max ? 'text-danger' : 'text-tertiary')} aria-live="polite">
            {count} / {max}
          </span>
        ) : null}
      </div>
      {children}
      {hint && !error ? <p className="type-caption text-secondary">{hint}</p> : null}
      {error ? <p className="type-caption text-danger">{error}</p> : null}
    </div>
  );
}

const controlClass =
  'w-full rounded-control border-quiet border-control bg-surface px-[14px] py-3 type-body text-content outline-none placeholder:text-placeholder focus:border-outline disabled:opacity-60';

export function StudioInput({
  label,
  hint,
  error,
  max,
  value,
  onChange,
  className,
  ...rest
}: {
  label: string;
  hint?: string;
  error?: string;
  max?: number;
  value: string;
  onChange: (value: string) => void;
  className?: string;
} & Omit<ComponentPropsWithoutRef<'input'>, 'value' | 'onChange' | 'className' | 'id'>) {
  const id = useId();
  return (
    <StudioField label={label} hint={hint} error={error} count={runes(value)} max={max} htmlFor={id} className={className}>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        className={cx(controlClass, 'min-h-12', error && 'border-danger')}
        {...rest}
      />
    </StudioField>
  );
}

export function StudioTextArea({
  label,
  hint,
  error,
  max,
  value,
  onChange,
  rows = 3,
  literary = false,
  className,
  ...rest
}: {
  label: string;
  hint?: string;
  error?: string;
  max?: number;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  literary?: boolean;
  className?: string;
} & Omit<ComponentPropsWithoutRef<'textarea'>, 'value' | 'onChange' | 'className' | 'id' | 'rows'>) {
  const id = useId();
  return (
    <StudioField label={label} hint={hint} error={error} count={runes(value)} max={max} htmlFor={id} className={className}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        className={cx(controlClass, 'resize-y [field-sizing:content]', literary && 'type-literary-body', error && 'border-danger')}
        style={{ minHeight: `${rows * 1.6 + 1.6}em` }}
        {...rest}
      />
    </StudioField>
  );
}

export function StudioSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  className,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  hint?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <StudioField label={label} hint={hint} htmlFor={id} className={className}>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value as T)} className={cx(controlClass, 'min-h-12 appearance-auto')}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </StudioField>
  );
}

/** Tags as removable chips; Enter or comma adds one. Case-insensitive dedupe. */
export function StudioTagsInput({
  label,
  value,
  onChange,
  maxTags,
  maxLength,
  addLabel,
  removeLabel,
  hint,
}: {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags: number;
  maxLength: number;
  addLabel: string;
  /** «Quitar {tag}» */
  removeLabel: (tag: string) => string;
  hint?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const add = () => {
    const tag = draft.split(/\s+/).filter(Boolean).join(' ');
    if (!tag || runes(tag) > maxLength || value.length >= maxTags) return;
    if (!value.some((t) => t.toLowerCase() === tag.toLowerCase())) onChange([...value, tag]);
    setDraft('');
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add();
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <StudioField label={label} hint={hint} htmlFor={id}>
      <div className={cx(controlClass, 'flex min-h-12 flex-wrap items-center gap-1.5 py-2')}>
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-chip bg-sunken py-0.5 pr-1 pl-2 type-caption font-extrabold text-primary">
            {tag}
            <button
              type="button"
              aria-label={removeLabel(tag)}
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="ink-focus inline-flex size-6 items-center justify-center rounded-full ink-dim"
            >
              <CloseIcon size={16} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          maxLength={maxLength}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={add}
          disabled={value.length >= maxTags}
          placeholder={value.length < maxTags ? addLabel : undefined}
          className="min-w-[8ch] flex-1 bg-transparent type-body outline-none placeholder:text-placeholder"
        />
      </div>
    </StudioField>
  );
}

/** A small radio group drawn as a segmented control. */
export function StudioSegmented<T extends string>({
  label,
  value,
  onChange,
  options,
  hideLabel = false,
  className,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string; icon?: ReactNode }[];
  hideLabel?: boolean;
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset className={cx('m-0 min-w-0 border-0 p-0', className)}>
      <legend className={hideLabel ? 'sr-only' : 'mb-1.5 font-ui text-[12.5px] font-extrabold text-primary'}>{label}</legend>
      <div className="inline-flex flex-wrap rounded-control border-quiet border-control bg-surface p-0.5">
        {options.map((option) => (
          <label
            key={option.value}
            className={cx(
              'relative inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 type-button-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue',
              value === option.value ? 'bg-inverse text-inverse' : 'text-secondary hover:text-primary',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.icon}
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Checkbox with label and optional help. */
export function StudioToggle({
  label,
  help,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby={help ? `${id}-help` : undefined}
        className="ink-focus mt-0.5 size-5 shrink-0 accent-[var(--ink-brand-ink)]"
      />
      <div className="min-w-0">
        <label htmlFor={id} className="type-body-strong text-[15px] text-primary">
          {label}
        </label>
        {help ? (
          <p id={`${id}-help`} className="type-caption text-secondary">
            {help}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** A decision dialog: the safe option first, the destructive one explicit. */
export function StudioConfirm({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <InkDialog open={open} onClose={() => !busy && onClose()} title={title} body={body}>
      <InkButton variant={destructive ? 'destructive' : 'primary'} busy={busy} onClick={onConfirm}>
        {confirmLabel}
      </InkButton>
      <InkButton variant="secondary" onClick={onClose} disabled={busy}>
        {cancelLabel}
      </InkButton>
    </InkDialog>
  );
}

/** A short-lived, polite status line (screen readers hear it once). */
export function StudioToast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDone, 4000);
    return () => clearTimeout(timer);
  }, [message, onDone]);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      {message ? (
        <p className="pointer-events-auto max-w-[520px] rounded-card border-brand border-outline bg-inverse px-4 py-3 type-body-sm text-inverse ink-shadow-lift-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}

/** A section heading used inside Studio areas. */
export function StudioSectionTitle({ children, action, id }: { children: string; action?: ReactNode; id?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="type-title-section text-primary">
        {children}
      </h2>
      {action}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { cx } from '@/components/ink/cx';
import { InkButton } from '@/components/ink/ink-button';
import { InkDialog } from '@/components/ink/ink-dialog';
import type { Locale } from '@/lib/i18n';
import { MARK_LIMITS, REPORT_REASONS, type ReportReason, isValidMarkDraft, markLength, normalizeMarkDraft } from '@/lib/session/marks';
import { MARKS_COPY, shortMarkDate } from '@/lib/session/marks-copy';
import { newClientId } from '@/lib/session/works';

// Pieces shared by the two Marcas surfaces (17 - Social): one Marca, its
// actions, the composer, and the delete / report decisions. Every text a
// person wrote is rendered as text.

/**
 * The server deduplicates on clientRequestId, so a retry of the SAME attempt
 * (same text, same parent) must reuse its id — a timeout that did succeed
 * then replays instead of creating a second Marca. Different text is a
 * different Marca and gets a new id. Cleared on success and on cancel.
 */
export function useRequestIdentity() {
  const last = useRef<{ key: string; id: string } | null>(null);
  return {
    idFor(content: string, parentId: string | null): string {
      const key = `${parentId ?? ''}\n${normalizeMarkDraft(content)}`;
      if (last.current?.key !== key) last.current = { key, id: newClientId() };
      return last.current.id;
    },
    clear() {
      last.current = null;
    },
  };
}

/** A confirmation that leaves on its own (05 - Toast: only for things done). */
export function useNotice(): [string | null, (text: string | null) => void] {
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  return [notice, setNotice];
}

export function MarkNotice({ text }: { text: string | null }) {
  return (
    <p role="status" aria-live="polite" className={cx('type-caption text-[13px] text-secondary', !text && 'sr-only')}>
      {text}
    </p>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded-pill bg-sunken px-1.5 py-px type-label text-[9.5px] tracking-[0.08em] text-secondary">{children}</span>
  );
}

/** One Marca: who, when, the text (Literata), and its actions underneath. */
export function MarkItem({
  authorName,
  authorId,
  badge,
  createdAt,
  content,
  deletedLabel,
  replyingTo,
  highlight = false,
  actions,
  locale,
}: {
  authorName: string | null;
  authorId?: string;
  badge?: string | null;
  createdAt: string;
  content: string;
  /** Set on a tombstone: replaces author and text. */
  deletedLabel?: string;
  replyingTo?: string;
  highlight?: boolean;
  actions?: ReactNode;
  locale: Locale;
}) {
  const copy = MARKS_COPY[locale];
  const name = authorName?.replace(/^@/, '') || copy.anonymous;
  const date = shortMarkDate(createdAt, locale);
  return (
    <div className={cx('flex flex-col gap-1 rounded-control', highlight && '-mx-2 bg-tint-yellow px-2 py-1')}>
      {deletedLabel ? (
        <p className="font-literary text-[16px] leading-[1.5] text-tertiary italic">{deletedLabel}</p>
      ) : (
        <>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 type-body text-[13.5px] text-secondary">
            {authorId ? (
              <Link
                href={`/profile/${encodeURIComponent(authorId)}`}
                className="ink-focus ink-dim rounded-control font-bold text-primary no-underline"
              >
                @{name}
              </Link>
            ) : (
              <span className="font-bold text-primary">@{name}</span>
            )}
            {badge ? <Badge>{badge}</Badge> : null}
            {date ? <span aria-hidden="true">·</span> : null}
            {date ? <time dateTime={createdAt}>{date}</time> : null}
          </p>
          {replyingTo ? <p className="type-caption text-[12.5px] text-tertiary">{copy.chapter.replyingTo(replyingTo)}</p> : null}
          <p className="font-literary text-[16.5px] leading-[1.55] break-words whitespace-pre-wrap text-content">{content}</p>
        </>
      )}
      {actions ? <div className="-ml-2 flex flex-wrap items-center gap-x-1">{actions}</div> : null}
    </div>
  );
}

/** A quiet text action under a Marca (Responder, Borrar, Reportar). */
export function MarkAction({
  onClick,
  disabled,
  tone = 'muted',
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  tone?: 'muted' | 'danger' | 'blue';
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'ink-focus inline-flex min-h-11 items-center rounded-control px-2 type-button-sm text-[13.5px] disabled:text-disabled',
        tone === 'danger' ? 'text-danger' : tone === 'blue' ? 'text-blue' : 'text-secondary',
        !disabled && 'ink-dim',
      )}
    >
      {children}
    </button>
  );
}

/**
 * The composer. Plain text; Publish stays disabled until the text fits
 * 3–500 characters, so an obvious rejection never costs a request.
 */
export function MarkComposer({
  hint,
  replyingTo,
  sending,
  error,
  blocked = false,
  autoFocus = false,
  onSubmit,
  onCancel,
  locale,
}: {
  hint: string;
  replyingTo?: string;
  sending: boolean;
  error: string | null;
  /** Writes are switched off: the text stays, Publish does not. */
  blocked?: boolean;
  autoFocus?: boolean;
  /** Resolves true when the Marca is in; the draft is then cleared. */
  onSubmit: (text: string) => Promise<boolean>;
  onCancel?: () => void;
  locale: Locale;
}) {
  const copy = MARKS_COPY[locale];
  const [text, setText] = useState('');
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const length = markLength(text);
  const valid = isValidMarkDraft(text);
  const format = (n: number) => n.toLocaleString();

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  async function submit() {
    if (!valid || sending || blocked) return;
    if (await onSubmit(text)) setText('');
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {replyingTo ? <p className="type-caption text-[12.5px] text-secondary">{copy.chapter.replyingTo(replyingTo)}</p> : null}
      <label htmlFor={id} className="sr-only">
        {hint}
      </label>
      <textarea
        ref={ref}
        id={id}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={hint}
        rows={3}
        maxLength={MARK_LIMITS.max * 2}
        aria-describedby={`${id}-help`}
        aria-invalid={length > MARK_LIMITS.max ? true : undefined}
        className="min-h-24 w-full resize-y rounded-control border-quiet border-control bg-surface px-3 py-2.5 font-literary text-[16px] leading-[1.5] text-content outline-none [field-sizing:content] placeholder:text-placeholder focus-visible:border-outline"
      />
      <div id={`${id}-help`} className="flex items-start justify-between gap-3">
        <p className={cx('type-caption text-[12.5px]', error ? 'text-danger' : 'text-tertiary')} aria-live="polite">
          {error ?? (text.trim() && !valid ? copy.lengthHelp(MARK_LIMITS.min, MARK_LIMITS.max) : '')}
        </p>
        <p className={cx('shrink-0 type-caption text-[12.5px] tabular-nums', length > MARK_LIMITS.max ? 'text-danger' : 'text-tertiary')}>
          {copy.counter(format(length), format(MARK_LIMITS.max))}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {onCancel ? (
          <InkButton variant="ghost" fullWidth={false} onClick={onCancel} disabled={sending}>
            {copy.cancel}
          </InkButton>
        ) : null}
        <InkButton
          type="submit"
          variant="secondary"
          fullWidth={false}
          disabled={!valid || blocked}
          busy={sending}
          busyLabel={copy.sending}
          className="min-h-11 px-5"
        >
          {copy.publish}
        </InkButton>
      </div>
    </form>
  );
}

export function DeleteMarkDialog({
  open,
  title,
  body,
  confirm,
  cancel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirm: string;
  cancel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <InkDialog open={open} onClose={onClose} title={title} body={body}>
      <InkButton variant="secondary" onClick={onClose}>
        {cancel}
      </InkButton>
      <InkButton variant="destructive" onClick={onConfirm}>
        {confirm}
      </InkButton>
    </InkDialog>
  );
}

/** The seven existing reasons; nothing is sent until one is chosen. */
export function ReportMarkDialog({
  open,
  title,
  actionLabel,
  busy,
  onReport,
  onClose,
  locale,
}: {
  open: boolean;
  title: string;
  actionLabel: string;
  busy: boolean;
  onReport: (reason: ReportReason) => void;
  onClose: () => void;
  locale: Locale;
}) {
  const copy = MARKS_COPY[locale];
  const [reason, setReason] = useState<ReportReason | null>(null);
  const name = useId();
  useEffect(() => {
    if (open) setReason(null);
  }, [open]);
  return (
    <InkDialog open={open} onClose={() => !busy && onClose()} title={title}>
      <fieldset className="m-0 flex flex-col border-0 p-0">
        <legend className="sr-only">{title}</legend>
        {REPORT_REASONS.map((value) => (
          <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-1 type-body text-primary">
            <input
              type="radio"
              name={name}
              value={value}
              checked={reason === value}
              onChange={() => setReason(value)}
              className="size-4 accent-[var(--ink-brand-blue)]"
            />
            {copy.reportReasons[value]}
          </label>
        ))}
      </fieldset>
      <InkButton variant="destructive" disabled={!reason} busy={busy} onClick={() => reason && onReport(reason)}>
        {actionLabel}
      </InkButton>
      <InkButton variant="secondary" onClick={onClose} disabled={busy}>
        {copy.cancel}
      </InkButton>
    </InkDialog>
  );
}

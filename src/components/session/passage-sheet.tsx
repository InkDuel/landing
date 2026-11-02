'use client';

import { type ReactNode, useEffect, useId, useRef } from 'react';

import { cx } from '@/components/ink/cx';

// The sheet of Marca con cita: «Marcas de este párrafo» and the quote composer.
// A native <dialog> like InkDialog (focus, Escape and the backdrop behave
// natively), but scrollable and anchored to the bottom on a phone. Its content
// is mounted only while open, so every opening starts clean.

export function PassageSheet({
  open,
  title,
  closeLabel,
  onClose,
  kicker = false,
  children,
}: {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  /** The title is a small label above the content (the composer's «Sobre este fragmento»). */
  kicker?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal focuses the first control (Cerrar); a composer wants its text box.
      dialog.querySelector<HTMLTextAreaElement>('textarea')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-0 mt-auto max-h-[85dvh] w-full max-w-none overflow-hidden rounded-t-modal border-brand border-outline bg-elevated p-0 text-primary ink-shadow-lift backdrop:bg-[var(--ink-overlay-scrim)] sm:m-auto sm:max-w-[560px] sm:rounded-modal"
    >
      {open ? (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-4 pb-2">
            {kicker ? (
              <h2 id={titleId} className="type-label text-[12px] tracking-[0.13em] text-reader-muted">
                {title}
              </h2>
            ) : (
              <h2 id={titleId} className="type-title-section text-[20px] text-primary">
                {title}
              </h2>
            )}
            <button
              type="button"
              onClick={onClose}
              className="ink-focus ink-dim min-h-11 shrink-0 rounded-control px-2 type-button-sm text-[14px] text-primary"
            >
              {closeLabel}
            </button>
          </div>
          <div className={cx('min-h-0 flex-1 overflow-y-auto px-5 pb-5')}>{children}</div>
        </div>
      ) : (
        <h2 id={titleId} className="sr-only">
          {title}
        </h2>
      )}
    </dialog>
  );
}

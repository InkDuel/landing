'use client';

import { type ReactNode, useEffect, useId, useRef } from 'react';

// Port of ink_dialog.dart: background.elevated, brand outline, shadow.lift,
// radius.modal, Bricolage 24 title, stacked actions. Only for decisions; the
// safe option is the main one. Built on <dialog> so focus, Escape and the
// backdrop behave natively.

export function InkDialog({
  open,
  onClose,
  title,
  body,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body?: string;
  /** Stacked actions. */
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100%-40px)] max-w-[400px] rounded-modal border-brand border-outline bg-elevated p-0 text-primary ink-shadow-lift backdrop:bg-[var(--ink-overlay-scrim)]"
    >
      <div className="flex flex-col gap-2 p-6">
        <h2 id={titleId} className="type-title-section text-[24px] text-primary">
          {title}
        </h2>
        {body ? <p className="type-body text-secondary">{body}</p> : null}
        <div className="mt-4 flex flex-col gap-2">{children}</div>
      </div>
    </dialog>
  );
}

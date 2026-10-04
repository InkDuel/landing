import type { ReactNode } from 'react';

import { cx } from './cx';

// Port of ink_states.dart. Lists load with a skeleton, never a full-screen
// spinner (05 - Componentes).

export function InkSkeleton({
  lines = 3,
  height = 'h-24',
  label,
  className,
}: {
  lines?: number;
  height?: string;
  /** Read by screen readers while loading. */
  label: string;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" className={cx('flex flex-col gap-3', className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={cx('block animate-pulse rounded-card bg-sunken motion-reduce:animate-none', height)}
        />
      ))}
    </div>
  );
}

/** Bricolage title + one line + the action when there is one. */
export function InkEmptyState({
  title,
  message,
  action,
  className,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex flex-col items-start gap-1 py-8', className)}>
      <h2 className="type-title-section text-primary">{title}</h2>
      {message ? <p className="type-body text-secondary">{message}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** Inline text action (banners, retries): blue, Figtree 14/800. */
export function InkTextAction({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ink-focus ink-dim inline-flex min-h-11 items-center rounded-control type-button-sm text-[14px] text-blue"
    >
      {children}
    </button>
  );
}

import { type ComponentPropsWithoutRef, useId } from 'react';

import { cx } from './cx';

// Port of ink_text_field.dart (05 - Componentes): label above (12.5/800),
// border.default 1.5 at rest, border.brand 2 on focus, radius.control.
// Error: danger border and the message below.

type Props = {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
} & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'id'>;

export function InkTextField({ label, hint, error, className, ...input }: Props) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="font-ui text-[12.5px] font-extrabold text-primary">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        className={cx(
          'min-h-12 w-full rounded-control bg-surface px-[14px] py-3 type-body text-content outline-none placeholder:text-placeholder disabled:opacity-60',
          // 1.5 at rest, 2 on focus: the padding shrinks so the text does not move.
          'border-quiet focus:border-brand focus:px-[13.5px]',
          error ? 'border-danger' : 'border-control focus:border-outline',
        )}
        {...input}
      />
      {hint ? (
        <p id={hintId} className="type-caption text-secondary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="type-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

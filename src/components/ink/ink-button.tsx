import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cx } from './cx';

// Port of inkduel_mobile/lib/core/presentation/ink/ink_button.dart.

export type InkButtonVariant = 'primary' | 'secondary' | 'inverse' | 'destructive' | 'ghost' | 'link';

const FILLED: Record<Exclude<InkButtonVariant, 'ghost' | 'link'>, string> = {
  // Yellow, the one main action per screen: Bricolage 20, shadow.button.
  primary: 'bg-yellow text-on-accent border-outline type-button ink-shadow-button ink-press',
  secondary: 'bg-surface text-primary border-outline type-button-ui ink-dim',
  inverse: 'bg-inverse text-inverse border-inverse type-button-ui ink-dim',
  destructive: 'bg-surface text-danger border-danger type-button-ui ink-dim',
};

const TEXT: Record<'ghost' | 'link', string> = {
  ghost: 'text-primary type-button-ui underline underline-offset-4 ink-dim',
  link: 'text-blue type-button-sm text-[14px] ink-dim',
};

type Common = {
  variant?: InkButtonVariant;
  /** Leading glyph (store logo, icon). */
  leading?: ReactNode;
  /** Filled buttons are full width, as in the app; false hugs the label. */
  fullWidth?: boolean;
  /** Shows [busyLabel] («Guardando…») and blocks the action. */
  busy?: boolean;
  busyLabel?: string;
  className?: string;
  children: ReactNode;
};

type AsLink = Common & {
  href: string;
  /** Opens in a new tab with rel="noopener noreferrer". */
  external?: boolean;
} & Omit<ComponentPropsWithoutRef<'a'>, 'href' | 'className' | 'children'>;

type AsButton = Common & { href?: undefined } & Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'children'>;

export type InkButtonProps = AsLink | AsButton;

export function inkButtonClasses({
  variant = 'primary',
  fullWidth = true,
  disabled = false,
  busy = false,
}: {
  variant?: InkButtonVariant;
  fullWidth?: boolean;
  disabled?: boolean;
  busy?: boolean;
}) {
  const isText = variant === 'ghost' || variant === 'link';
  if (isText) {
    return cx(
      'ink-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-control p-2 text-center',
      disabled ? 'text-disabled pointer-events-none no-underline' : TEXT[variant],
      busy && 'opacity-75 pointer-events-none',
    );
  }
  return cx(
    'ink-focus inline-flex min-h-[52px] items-center justify-center gap-2 rounded-button border-brand px-4 py-3 text-center no-underline',
    fullWidth ? 'w-full' : 'w-auto',
    disabled
      ? cx('bg-sunken text-disabled border-default pointer-events-none', variant === 'primary' ? 'type-button' : 'type-button-ui')
      : FILLED[variant],
    busy && 'opacity-75 pointer-events-none',
  );
}

export function InkButton(props: InkButtonProps) {
  const { variant = 'primary', leading, fullWidth = true, busy = false, busyLabel, className, children, ...rest } = props;
  const content = (
    <>
      {leading}
      <span>{busy && busyLabel ? busyLabel : children}</span>
    </>
  );

  if (rest.href !== undefined) {
    const { href, external, ...anchor } = rest as Omit<AsLink, keyof Common>;
    const classes = cx(inkButtonClasses({ variant, fullWidth, busy }), className);
    if (external || !href.startsWith('/')) {
      return (
        <a
          href={href}
          className={classes}
          aria-busy={busy || undefined}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          {...anchor}
        >
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} aria-busy={busy || undefined} {...anchor}>
        {content}
      </Link>
    );
  }

  const { disabled, type, ...button } = rest as Omit<AsButton, keyof Common>;
  return (
    <button
      type={type ?? 'button'}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cx(inkButtonClasses({ variant, fullWidth, disabled, busy }), className)}
      {...button}
    >
      {content}
    </button>
  );
}

export type InkSmallButtonTone = 'primary' | 'secondary' | 'rival';

const SMALL_TONE: Record<InkSmallButtonTone, string> = {
  primary: 'bg-yellow text-on-accent ink-shadow-press ink-press',
  rival: 'bg-pink text-on-accent ink-shadow-press ink-press',
  // Secondary has no shadow (PR 2A decision).
  secondary: 'bg-surface text-primary ink-dim',
};

/** Small button / pill for actions inside cards (Figtree 15). */
export function InkSmallButton({
  href,
  tone = 'primary',
  shape = 'control',
  external,
  className,
  children,
}: {
  href: string;
  tone?: InkSmallButtonTone;
  shape?: 'control' | 'pill';
  external?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const classes = cx(
    'ink-focus inline-flex min-h-11 items-center justify-center gap-2 border-brand border-outline px-4 py-2 type-button-sm no-underline',
    shape === 'pill' ? 'rounded-pill' : 'rounded-control',
    SMALL_TONE[tone],
    className,
  );
  if (external || !href.startsWith('/')) {
    return (
      <a href={href} className={classes} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

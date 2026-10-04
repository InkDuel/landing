import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

import { cx } from './cx';

// Port of ink_card.dart: radius.card, 16 padding.
// - brand: border.brand + shadow.lift, only what must stand out.
// - outlined: border.brand without shadow (confirmations, notices).
// - quiet: border.quiet in the divider colour, the default.
export type InkCardTone = 'brand' | 'outlined' | 'quiet';

const TONE: Record<InkCardTone, string> = {
  brand: 'border-brand border-outline ink-shadow-lift',
  outlined: 'border-brand border-outline',
  quiet: 'border-quiet border-divider',
};

type Props<T extends ElementType> = {
  as?: T;
  tone?: InkCardTone;
  /** Background override, e.g. `bg-league-tint` for the league card. */
  fill?: string;
  /** Padding override; defaults to 16. */
  padding?: string;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

export function InkCard<T extends ElementType = 'div'>({
  as,
  tone = 'quiet',
  fill,
  padding = 'p-4',
  className,
  children,
  ...rest
}: Props<T>) {
  const Component: ElementType = as ?? 'div';
  return (
    <Component className={cx('rounded-card', fill ?? 'bg-surface', TONE[tone], padding, className)} {...rest}>
      {children}
    </Component>
  );
}

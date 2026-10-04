import type { ReactNode } from 'react';

import { cx } from '@/components/ink/cx';

// The three visual contexts of 02 - Design System, plus the navy brand
// moment. A page picks one; components below follow its surface tokens.
export type VisualContext = 'arena' | 'product' | 'reading' | 'brand';

export function InkPage({
  context,
  className,
  children,
}: {
  context: VisualContext;
  className?: string;
  children: ReactNode;
}) {
  return <div className={cx('ink-page flex flex-col', `ctx-${context}`, className)}>{children}</div>;
}

/**
 * Centred column. Desktop widths are a web decision (no mockups): reading
 * keeps the text at most 680 px, product forms ~560 px, the landing ~1120 px.
 */
export function PageColumn({
  width = 'product',
  className,
  children,
}: {
  width?: 'reading' | 'product' | 'wide';
  className?: string;
  children: ReactNode;
}) {
  const max = { reading: 'max-w-[720px]', product: 'max-w-[600px]', wide: 'max-w-[1160px]' }[width];
  return <div className={cx('mx-auto w-full px-5', max, className)}>{children}</div>;
}

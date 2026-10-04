import Image from 'next/image';

import { cx } from './cx';

// Port of ink_brand.dart. The app icon does not change in the redesign.

/** App icon with the iOS corner (22.37 %). Sizes: 36, 44, 56, 108. */
export function InkAppIcon({ size = 56, className }: { size?: 36 | 44 | 56 | 108; className?: string }) {
  const radius = { 36: 'rounded-[8px]', 44: 'rounded-[10px]', 56: 'rounded-[12.5px]', 108: 'rounded-[24px]' }[size];
  return (
    <Image
      src="/app-icon.png"
      alt=""
      width={size}
      height={size}
      className={cx('shrink-0', radius, className)}
      priority={size >= 56}
    />
  );
}

/**
 * «InkDuel» wordmark in Bricolage. On paper, «Duel» carries the yellow band;
 * on brand.ink it is painted yellow instead.
 */
export function InkWordmark({
  size = 'md',
  onBrand = false,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  onBrand?: boolean;
  className?: string;
}) {
  const text = { sm: 'text-[20px]', md: 'text-[26px]', lg: 'text-[52px]' }[size];
  return (
    <span
      className={cx(
        'inline-flex items-baseline font-brand font-extrabold leading-none tracking-[-0.02em]',
        onBrand ? 'text-on-brand-ink' : 'text-primary',
        text,
        className,
      )}
    >
      Ink
      <span className={onBrand ? 'text-yellow' : 'ink-highlight [--band-start:58%]'}>Duel</span>
    </span>
  );
}

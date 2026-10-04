import { leagueFromRankTier } from '@/lib/league';

import { cx } from './cx';

// Port of ink_player_identity.dart (02 - Design System): the initial in a
// surface circle. With a known league, the circle sits inside a band of the
// league colour outlined in border.strong; without one, a single neutral
// outline. Always 1:1. Prepared for a future avatar.

export type IdentitySize = 24 | 32 | 44 | 56 | 96 | 112;

/** Band per size (2 at 24, 3 at 32, 4 at 44–56, 6 at 96, 7 at 112). */
const BAND: Record<IdentitySize, string> = {
  24: 'p-[2px]',
  32: 'p-[3px]',
  44: 'p-1',
  56: 'p-1',
  96: 'p-[6px]',
  112: 'p-[7px]',
};

const DIAMETER: Record<IdentitySize, string> = {
  24: 'size-6',
  32: 'size-8',
  44: 'size-11',
  56: 'size-14',
  96: 'size-24',
  112: 'size-28',
};

/** The initial scales with the diameter (0.36: 19/52, 34/96, 40/112). */
const INITIAL: Record<IdentitySize, string> = {
  24: 'text-[9px]',
  32: 'text-[11.5px]',
  44: 'text-[16px]',
  56: 'text-[20px]',
  96: 'text-[34.5px]',
  112: 'text-[40px]',
};

/** First letter of the name, uppercased; «?» when empty. */
export function initialOf(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toLocaleUpperCase() : '?';
}

type Props = {
  name: string;
  /** As the backend sends it; null when the league is not known. */
  rankTier?: string | null;
  size?: IdentitySize;
  emphasis?: 'primary' | 'secondary';
  /** Read instead of the initial. Leave empty when the name is next to it. */
  label?: string;
  className?: string;
};

export function PlayerIdentity({ name, rankTier, size = 44, emphasis = 'secondary', label, className }: Props) {
  const league = leagueFromRankTier(rankTier);
  const large = size >= 44;
  const outer = large ? 'border-brand' : 'border-quiet';
  const initial = (
    <span
      aria-hidden="true"
      className={cx(
        'font-ui font-extrabold leading-none select-none',
        INITIAL[size],
        emphasis === 'primary' ? 'text-primary' : 'text-secondary',
      )}
    >
      {initialOf(name)}
    </span>
  );

  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };

  if (!league) {
    return (
      <span
        {...a11y}
        className={cx(
          'inline-flex shrink-0 aspect-square items-center justify-center rounded-full bg-surface border-outline',
          DIAMETER[size],
          outer,
          className,
        )}
      >
        {initial}
      </span>
    );
  }

  return (
    <span
      {...a11y}
      data-league={league}
      className={cx(
        'inline-flex shrink-0 aspect-square rounded-full bg-league border-outline',
        DIAMETER[size],
        BAND[size],
        outer,
        className,
      )}
    >
      <span
        className={cx(
          'flex size-full items-center justify-center rounded-full bg-surface border-outline',
          large ? 'border-quiet' : 'border-hairline',
        )}
      >
        {initial}
      </span>
    </span>
  );
}

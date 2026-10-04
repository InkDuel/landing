import { cx } from './cx';

// Port of ink_pencil_track.dart: a fixed-size pencil (48×12, tilted 21°)
// that advances over a dotted line, leaving a solid stroke behind. The
// stroke always reaches the tip: at the start of a division the pencil
// rests at its own length.

const PENCIL = 48;

export function PencilTrack({
  progress,
  baseline = 'muted',
  stroke = 'inverse',
  goalLabel,
  label,
  className,
}: {
  /** 0 to 1. */
  progress: number;
  /** muted: text.secondary dots (Home, Perfil); arena: arena.dot (result). */
  baseline?: 'muted' | 'arena';
  /** inverse (Home) or the league's strong colour (Perfil, inside data-league). */
  stroke?: 'inverse' | 'league';
  /** Next step («II»). */
  goalLabel?: string;
  /** What the track means («20 LP · faltan 80 para Aprendiz II»). */
  label?: string;
  className?: string;
}) {
  const clamped = Math.min(1, Math.max(0, progress));
  const tip = `max(${(clamped * 100).toFixed(2)}%, ${PENCIL}px)`;

  return (
    <div
      className={cx('flex items-end gap-2', className)}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {/* The tip position is the only dynamic value. */}
      <div className="relative h-6 flex-1" style={{ ['--tip' as string]: tip }}>
        {/* Dotted line still to draw: 2 px dots every 4 px. */}
        <span
          className={cx(
            'absolute inset-x-0 bottom-[2px] h-[2px] bg-[length:4px_2px]',
            baseline === 'arena'
              ? 'bg-[radial-gradient(circle_at_1px_1px,var(--ink-arena-dot)_1px,transparent_1.1px)]'
              : 'bg-[radial-gradient(circle_at_1px_1px,var(--ink-text-secondary)_1px,transparent_1.1px)]',
          )}
        />
        {/* Line already drawn, under the pencil up to its tip. */}
        <span
          className={cx('absolute bottom-px left-0 h-1 w-[var(--tip)] rounded-pill', stroke === 'league' ? 'bg-league' : 'bg-inverse')}
        />
        {/* The pencil, tip at the end of the line, tilted around the tip. */}
        <svg
          className="absolute top-[15px] left-[calc(var(--tip)-48px)] origin-[48px_6px] rotate-[21deg]"
          width="48"
          height="12"
          viewBox="0 0 48 12"
          aria-hidden="true"
        >
          <path d="M3 0H8V12H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3Z" fill="var(--ink-brand-pink)" />
          <rect x="8" y="0" width="5" height="12" fill="var(--ink-pencil-metal)" />
          <rect x="13" y="0" width="23" height="7.44" fill="var(--ink-brand-yellow)" />
          <rect x="13" y="7.44" width="23" height="4.56" fill="var(--ink-pencil-yellow-deep)" />
          <path d="M36 0L43.44 4.65V7.35L36 12Z" fill="var(--ink-pencil-wood)" />
          <path d="M43.44 4.65L48 6L43.44 7.35Z" fill="var(--ink-surface-inverse)" />
        </svg>
      </div>
      {goalLabel ? <span className="type-button text-[15px] leading-none text-secondary">{goalLabel}</span> : null}
    </div>
  );
}

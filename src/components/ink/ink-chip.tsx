import { cx } from './cx';

// Port of ink_chip.dart: Figtree 13/800, radius.chip, padding 4×9. The
// status is always written; colour only accompanies the text.
export type InkChipTone =
  | 'neutral'
  | 'muted'
  | 'victory'
  | 'draw'
  | 'practice'
  | 'done'
  | 'success'
  | 'danger'
  | 'outline';

const TONE: Record<InkChipTone, string> = {
  neutral: 'bg-sunken text-primary border-transparent',
  muted: 'bg-sunken text-secondary border-transparent',
  victory: 'bg-yellow text-on-accent border-transparent',
  draw: 'bg-tint-yellow text-primary border-transparent',
  practice: 'bg-tint-pink text-primary border-transparent',
  done: 'bg-tint-blue text-primary border-transparent',
  success: 'bg-tint-success text-success border-transparent',
  danger: 'bg-tint-danger text-danger border-danger',
  outline: 'bg-transparent text-secondary border-default',
};

export function InkChip({ tone, children, className }: { tone: InkChipTone; children: string; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-chip border-quiet px-[9px] py-1 type-caption font-extrabold leading-[1.15] whitespace-nowrap',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

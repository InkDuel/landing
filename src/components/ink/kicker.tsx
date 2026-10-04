import { cx } from './cx';

/** Uppercase label (label style): kickers and group headers. */
export function Kicker({ children, className, as: Component = 'p' }: { children: string; className?: string; as?: 'p' | 'span' | 'h2' | 'h3' }) {
  return <Component className={cx('type-label text-secondary', className)}>{children}</Component>;
}

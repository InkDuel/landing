import { cx } from './cx';

/** Dashed separator of Arena lists (6 on, 4 off, 2 px), ink_dashed_line.dart. */
export function DashedLine({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'block h-[2px] w-full bg-[linear-gradient(to_right,var(--line,var(--ink-c-divider))_6px,transparent_6px)] bg-[length:10px_2px]',
        className,
      )}
    />
  );
}

/**
 * Numbered rule (A1 rules), ink_numbered_rule.dart: ink-outlined number,
 * Bricolage title, one muted line. Dashed separators start after the number.
 */
export function NumberedRule({
  number,
  title,
  body,
  divider = false,
}: {
  number: number;
  title: string;
  body: string;
  divider?: boolean;
}) {
  return (
    <li className="list-none">
      {divider ? <DashedLine className="ml-[58px] [--line:var(--ink-arena-dot)]" /> : null}
      <div className="flex items-start gap-[14px] py-4">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-control border-brand border-outline bg-surface type-title-section text-primary"
        >
          {number}
        </span>
        <div className="min-w-0">
          <h3 className="type-title-section text-primary">{title}</h3>
          <p className="mt-[3px] type-body text-[14.5px] text-secondary">{body}</p>
        </div>
      </div>
    </li>
  );
}

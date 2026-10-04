import type { ReactNode } from 'react';

import { cx } from './cx';
import { CheckIcon, InfoIcon, WarningIcon } from './icons';

// Port of ink_inline_banner.dart: icon · title · detail · optional action.
// Errors are shown in context with their own name, never as a toast.
export type InkBannerTone = 'error' | 'info' | 'notice' | 'success';

const TONE: Record<InkBannerTone, string> = {
  error: 'bg-tint-danger border-brand border-danger',
  info: 'bg-surface border-quiet border-divider',
  notice: 'bg-surface border-brand border-outline',
  success: 'bg-surface border-brand border-outline',
};

type Props = {
  tone?: InkBannerTone;
  title: string;
  detail?: ReactNode;
  /** A link or button, rendered under the detail. */
  action?: ReactNode;
  className?: string;
};

export function InkInlineBanner({ tone = 'error', title, detail, action, className }: Props) {
  let leading: ReactNode;
  if (tone === 'success') {
    leading = (
      <span className="flex size-[34px] shrink-0 items-center justify-center rounded-control border-quiet border-outline bg-yellow text-on-accent">
        <CheckIcon size={20} />
      </span>
    );
  } else {
    const Icon = tone === 'error' ? WarningIcon : InfoIcon;
    leading = (
      <span className={cx('mt-px shrink-0', tone === 'error' ? 'text-danger' : 'text-primary')}>
        <Icon size={20} />
      </span>
    );
  }

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx('flex w-full items-start gap-3 rounded-card p-[14px]', TONE[tone], className)}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <p className="type-body-strong text-[15px] font-extrabold text-primary">{title}</p>
        {detail ? <div className="type-body-sm text-secondary">{detail}</div> : null}
        {action ? <div className="mt-1">{action}</div> : null}
      </div>
    </div>
  );
}

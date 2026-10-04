'use client';

import { cx } from '@/components/ink/cx';
import { ChevronDownIcon } from '@/components/ink/icons';
import { LOCALE_LABELS, LOCALES, type Locale, isLocale } from '@/lib/i18n';

/** Native select styled as a quiet control: accessible and keyboard-friendly. */
export function LanguageSwitcher({
  locale,
  onChange,
  label,
  className,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
  label: string;
  className?: string;
}) {
  return (
    <label className={cx('relative inline-flex items-center', className)}>
      <span className="sr-only">{label}</span>
      <select
        value={locale}
        onChange={(event) => {
          if (isLocale(event.target.value)) onChange(event.target.value);
        }}
        className="ink-focus min-h-11 cursor-pointer appearance-none rounded-pill border-quiet border-control bg-surface py-2 pr-9 pl-4 type-button-sm text-[14px] text-primary"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
      <ChevronDownIcon size={16} className="pointer-events-none absolute right-3 text-secondary" />
    </label>
  );
}

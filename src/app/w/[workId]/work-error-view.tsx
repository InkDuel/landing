'use client';

import { InkHeadline } from '@/components/ink/ink-headline';
import { InkButton } from '@/components/ink/ink-button';
import { LocalizedShell } from '@/components/shell/localized-shell';
import { type Locale, withLang } from '@/lib/i18n';

import { WORK_COPY } from './work-copy';

/** The backend could not answer (not "this work does not exist"): an error, with a way to retry. */
export function WorkErrorView({ onRetry, initialLocale = 'en' }: { onRetry: () => void; initialLocale?: Locale }) {
  return (
    <LocalizedShell initialLocale={initialLocale} resolveOnClient context="reading" width="reading">
      {(locale) => {
        const copy = WORK_COPY[locale];
        return (
          <div role="alert" className="flex flex-col items-start gap-4 py-16">
            <InkHeadline text={copy.errorTitle} size="title-page" />
            <p className="type-body text-secondary">{copy.errorBody}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <InkButton onClick={onRetry} fullWidth={false} className="px-6">
                {copy.retry}
              </InkButton>
              <InkButton href={withLang('/', locale)} variant="secondary" fullWidth={false} className="px-6">
                {copy.goHome}
              </InkButton>
            </div>
          </div>
        );
      }}
    </LocalizedShell>
  );
}

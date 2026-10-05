'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { cx } from '@/components/ink/cx';
import { ChevronRightIcon, PlusIcon } from '@/components/ink/icons';
import type { Locale } from '@/lib/i18n';
import { ApiError } from '@/lib/session/api';
import { worksApi } from '@/lib/session/works';
import { WORKS_COPY } from '@/lib/session/works-copy';

import { chapterEditHref, workManageHref } from './works-parts';

// «Haz crecer esta historia» (continue_story_cta_button.dart): turns one of
// your own duel stories into a work, or opens the one it already is. The app
// offers it on the duel result, which the web does not have; the web offers
// it where it shows your own relato (founder, phase 4). A new work opens its
// chapter 1 in the editor, an existing one its page — as in the app.

export function GrowStoryCta({ duelId, storyId, locale }: { duelId: string; storyId: string; locale: Locale }) {
  const copy = WORKS_COPY[locale];
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  /** The backend switched works off (503): not offered again here. */
  const [unavailable, setUnavailable] = useState(false);

  async function grow() {
    if (busy || unavailable) return;
    setBusy(true);
    setFailed(false);
    try {
      const { created, work } = await worksApi.fromDuelStory(duelId, storyId, { locale });
      const first = [...work.chapters].sort((a, b) => a.orderIndex - b.orderIndex)[0];
      router.push(created && first ? chapterEditHref(work.id, first.id) : workManageHref(work.id));
    } catch (error) {
      setFailed(true);
      setUnavailable(error instanceof ApiError && error.status === 503);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => void grow()}
        disabled={busy || unavailable}
        aria-busy={busy || undefined}
        className={cx(
          'ink-focus flex w-full items-center gap-3 rounded-control border-quiet border-outline bg-surface py-3 pr-3 pl-3.5 text-left',
          busy || unavailable ? 'opacity-60' : 'ink-dim',
        )}
      >
        <span aria-hidden="true" className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-tint-blue text-blue">
          <PlusIcon size={20} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="type-body-strong text-[15px] text-primary">{copy.growCta}</span>
          <span className="type-body text-[13.5px] text-secondary">{copy.growSubtitle}</span>
        </span>
        <ChevronRightIcon size={20} className="shrink-0 text-secondary" />
      </button>
      <p role="status" aria-live="polite" className={cx('type-caption text-danger', !failed && 'sr-only')}>
        {failed ? copy.growError : ''}
      </p>
    </div>
  );
}

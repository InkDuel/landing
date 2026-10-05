'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { cx } from '@/components/ink/cx';
import { CheckIcon } from '@/components/ink/icons';
import { PlayerIdentity } from '@/components/ink/player-identity';
import type { Locale } from '@/lib/i18n';
import { followsApi } from '@/lib/session/follows';
import { WORKS_COPY } from '@/lib/session/works-copy';

// «Seguir historia» in the Reader (public_reader_cubit.dart): the backend's
// canFollow decides whether it shows (never to the author). The change shows
// at once and rolls back if the request fails; the state then is the
// server's. A failed state read just renders nothing: reading never waits.

type Origin = 'header' | 'end';
type Follow = { following: boolean; canFollow: boolean; busy: boolean; failedAt: Origin | null };

export function useWorkFollow(workId: string, locale: Locale) {
  const [state, setState] = useState<Follow>({ following: false, canFollow: false, busy: false, failedAt: null });
  const localeRef = useRef(locale);
  localeRef.current = locale;

  useEffect(() => {
    const controller = new AbortController();
    setState({ following: false, canFollow: false, busy: false, failedAt: null });
    followsApi
      .state(workId, { locale: localeRef.current, signal: controller.signal })
      .then((next) => !controller.signal.aborted && setState((s) => ({ ...s, ...next })))
      .catch(() => undefined);
    return () => controller.abort();
  }, [workId]);

  /** [origin]: where the toggle was, so a failure is said right there. */
  const toggle = useCallback(async (origin: Origin) => {
    if (state.busy || !state.canFollow) return;
    const was = state.following;
    setState((s) => ({ ...s, following: !was, busy: true, failedAt: null }));
    try {
      const ctx = { locale: localeRef.current };
      const following = was ? await followsApi.unfollow(workId, ctx) : await followsApi.follow(workId, ctx);
      setState((s) => ({ ...s, following, busy: false }));
    } catch {
      setState((s) => ({ ...s, following: was, busy: false, failedAt: origin }));
    }
  }, [state.busy, state.canFollow, state.following, workId]);

  return { ...state, toggle };
}

export type WorkFollow = ReturnType<typeof useWorkFollow>;

/** «Seguir historia» / «Siguiendo» beside the byline. */
export function FollowCompact({ follow, locale }: { follow: WorkFollow; locale: Locale }) {
  if (!follow.canFollow) return null;
  return <FollowPill follow={follow} origin="header" locale={locale} />;
}

/**
 * The follow pill, beside the byline and at the end: outlined while you can
 * follow, quiet with a check once you do.
 */
function FollowPill({ follow, origin, locale }: { follow: WorkFollow; origin: Origin; locale: Locale }) {
  const copy = WORKS_COPY[locale];
  return (
    <button
      type="button"
      onClick={() => void follow.toggle(origin)}
      disabled={follow.busy}
      aria-pressed={follow.following}
      className={cx(
        'ink-focus ink-dim relative z-10 inline-flex min-h-9 shrink-0 items-center gap-1 rounded-pill bg-surface px-3.5 type-button-sm text-[13.5px]',
        follow.following ? 'border-quiet border-default text-secondary' : 'border-brand border-outline text-primary',
      )}
    >
      {follow.following ? <CheckIcon size={16} /> : null}
      {follow.following ? copy.following : copy.followStory}
    </button>
  );
}

/** The failed-toggle message, next to the toggle that failed. */
export function FollowError({ follow, at, locale }: { follow: WorkFollow; at: Origin; locale: Locale }) {
  const failed = follow.failedAt === at;
  return (
    <p role="status" aria-live="polite" className={cx('type-caption text-danger', !failed && 'sr-only')}>
      {failed ? WORKS_COPY[locale].followError : ''}
    </p>
  );
}

/** The author at the end of the chapter, the promise and the pill. */
export function FollowEndRow({ follow, authorName, locale }: { follow: WorkFollow; authorName: string; locale: Locale }) {
  if (!follow.canFollow) return null;
  const copy = WORKS_COPY[locale];
  const name = authorName.replace(/^@/, '');
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <PlayerIdentity name={name} size={32} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate type-body-strong text-[15px] text-content">@{name}</span>
          <span className="type-caption text-reader-muted">{copy.followSupport}</span>
        </div>
        <FollowPill follow={follow} origin="end" locale={locale} />
      </div>
      <FollowError follow={follow} at="end" locale={locale} />
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Consigna } from '@/components/ink/consigna';
import { InkButton } from '@/components/ink/ink-button';
import { InkCard } from '@/components/ink/ink-card';
import { InkChip } from '@/components/ink/ink-chip';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkEmptyState, InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { Kicker } from '@/components/ink/kicker';
import { type Locale, INTL_LOCALE, withLang } from '@/lib/i18n';
import { useSession } from '@/lib/session/auth-context';
import { DUELS_COPY } from '@/lib/session/duels-copy';
import { type DuelSummary, duelsApi } from '@/lib/session/duels';
import { useInfiniteSentinel, usePagedList } from '@/lib/session/use-paged-list';

export function DuelHistoryRow({
  duel,
  ownerId,
  privateDetail,
  own,
  locale,
}: {
  duel: DuelSummary;
  ownerId: string;
  privateDetail: boolean;
  own: boolean;
  locale: Locale;
}) {
  const copy = DUELS_COPY[locale];
  const ownerB = duel.userB?.id === ownerId;
  const owner = ownerB ? duel.userB : duel.userA;
  const rival = ownerB ? duel.userA : duel.userB;
  const outcome = duel.outcome || (duel.status === 'inprogress' ? 'in_progress' : duel.status);
  const complete = ['won', 'lost', 'draw', 'completed'].includes(outcome);
  const label =
    outcome === 'won'
      ? copy.won
      : outcome === 'lost'
        ? copy.lost
        : outcome === 'draw'
          ? copy.draw
          : outcome === 'abandoned'
            ? copy.abandoned
            : outcome === 'completed'
              ? copy.completed
              : copy.in_progress;
  const mode =
    duel.kind === 'ranked_async'
      ? copy.asyncRanked
      : duel.isRanked
        ? copy.ranked
        : duel.kind === 'solo_sprint'
          ? copy.sprint
          : duel.kind === 'ai_sparring'
            ? copy.practice
            : copy.challenge;
  const date = duel.createdAt
    ? new Date(duel.createdAt).toLocaleDateString(INTL_LOCALE[locale], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    : '';
  const [expanded, setExpanded] = useState(false);
  return (
    <InkCard tone="outlined" padding="p-0">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        disabled={privateDetail}
        aria-expanded={privateDetail ? undefined : expanded}
        className="ink-focus flex w-full flex-wrap items-center gap-3 rounded-card p-4 text-left"
      >
        <InkChip tone={outcome === 'won' ? 'victory' : outcome === 'draw' ? 'draw' : 'neutral'}>{label}</InkChip>
        <div className="min-w-0 flex-1">
          <p className="type-label text-primary break-words">
            {owner?.username || '—'}
            {duel.kind !== 'solo_sprint' ? ` · ${rival?.username || copy.rival}` : ''}
          </p>
          <p className="type-caption text-secondary">
            {mode}
            {date ? ` · ${date}` : ''}
          </p>
        </div>
        {duel.isRanked && duel.rankPointsDelta !== null ? (
          <span className="type-label text-primary">
            {duel.rankPointsDelta >= 0 ? '+' : '−'}
            {Math.abs(duel.rankPointsDelta)} LP
          </span>
        ) : duel.writerXpDelta !== null && duel.writerXpDelta > 0 ? (
          <span className="type-label text-primary">+{duel.writerXpDelta} XP</span>
        ) : null}
        {privateDetail ? (
          <span className="type-caption text-secondary">{copy.private}</span>
        ) : (
          <span aria-hidden="true" className="text-secondary">
            {expanded ? '−' : '+'}
          </span>
        )}
      </button>
      {expanded && !privateDetail ? (
        <div className="flex flex-col gap-3 border-t border-divider p-4">
          {duel.prompt ? <Consigna label={copy.prompt} text={duel.prompt} /> : null}
          {duel.scoreMine !== null ? (
            <p className="type-label text-primary">
              {copy.score}: {duel.scoreMine.toLocaleString(INTL_LOCALE[locale])}
              {duel.scoreOther !== null ? ` · ${duel.scoreOther.toLocaleString(INTL_LOCALE[locale])}` : ''}
            </p>
          ) : null}
          {complete ? (
            <InkButton href={withLang(`/duels/${encodeURIComponent(duel.id)}`, locale)} variant="secondary">
              {copy.detail}
            </InkButton>
          ) : own && outcome === 'in_progress' && duel.isRanked ? (
            <InkButton href="/ranked" variant="secondary">
              {copy.another}
            </InkButton>
          ) : null}
        </div>
      ) : null}
    </InkCard>
  );
}
export function DuelHistory({ ownerId, privateDetail = false, locale }: { ownerId: string; privateDetail?: boolean; locale: Locale }) {
  const { user } = useSession();
  const copy = DUELS_COPY[locale];
  const fetchPage = useCallback(
    (cursor: string | null, signal: AbortSignal) => duelsApi.history(ownerId, locale, cursor, signal),
    [ownerId, locale],
  );
  const history = usePagedList(fetchPage);
  const sentinel = useInfiniteSentinel(history.loadMore, history.status === 'ready' && history.hasMore && !history.loadMoreFailed);
  return (
    <section className="flex flex-col gap-3" aria-label={copy.history}>
      <Kicker as="h2">{copy.history}</Kicker>
      {history.status === 'loading' ? (
        <InkSkeleton label={copy.loading} />
      ) : history.status === 'error' ? (
        <InkInlineBanner title={copy.historyError} action={<InkTextAction onClick={history.retry}>{copy.retry}</InkTextAction>} />
      ) : history.items.length === 0 ? (
        <InkEmptyState title={copy.empty} message={copy.emptyBody} />
      ) : (
        history.items.map((duel) => (
          <DuelHistoryRow
            key={duel.id}
            duel={duel}
            ownerId={ownerId}
            privateDetail={privateDetail}
            own={user?.id === ownerId}
            locale={locale}
          />
        ))
      )}
      <div ref={sentinel} />
      {history.hasMore ? (
        <InkButton variant="ghost" busy={history.loadingMore} onClick={history.loadMore}>
          {history.loadMoreFailed ? copy.retry : copy.more}
        </InkButton>
      ) : null}
      {history.loadMoreFailed ? (
        <p role="status" className="type-caption text-danger">
          {copy.historyError}
        </p>
      ) : null}
    </section>
  );
}

/** Owner-only queue: drafts stay in recovery; submitted async stories are not
 * materialized duels until a rival matches, so they are shown separately. */
export function RankedQueue({ locale }: { locale: Locale }) {
  const copy = DUELS_COPY[locale];
  const [state, setState] = useState<{ items: Awaited<ReturnType<typeof duelsApi.queued>>; error: boolean }>({ items: [], error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const items = await duelsApi.queued(locale);
        if (active) setState({ items, error: false });
      } catch {
        if (active) setState((previous) => ({ ...previous, error: true }));
      } finally {
        loading = false;
      }
    };
    void load();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 15_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [locale, attempt]);
  if (!state.items.length && !state.error) return null;
  return (
    <section className="flex flex-col gap-3" aria-label={copy.queueList}>
      <Kicker as="h2">{copy.queueList}</Kicker>
      {state.error ? (
        <InkInlineBanner
          title={copy.historyError}
          action={<InkTextAction onClick={() => setAttempt((value) => value + 1)}>{copy.retry}</InkTextAction>}
        />
      ) : null}
      {state.items.map((item) => (
        <InkCard key={item.id} tone="outlined">
          <p className="type-label text-primary">{item.status === 'matched' ? copy.matched : copy.queued}</p>
          {item.expiresAt ? (
            <p className="mt-1 type-caption text-secondary">
              {copy.expires}: {new Date(item.expiresAt).toLocaleString(INTL_LOCALE[locale])}
            </p>
          ) : null}
          <p className="mt-2 type-body text-secondary">{copy.queuedBody}</p>
        </InkCard>
      ))}
    </section>
  );
}

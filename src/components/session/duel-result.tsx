'use client';

import { useEffect, useState } from 'react';
import { Consigna } from '@/components/ink/consigna';
import { InkButton } from '@/components/ink/ink-button';
import { InkCard } from '@/components/ink/ink-card';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { Kicker } from '@/components/ink/kicker';
import { PlayerIdentity } from '@/components/ink/player-identity';
import { type Locale, INTL_LOCALE, withLang } from '@/lib/i18n';
import { ApiError } from '@/lib/session/api';
import { DUELS_COPY } from '@/lib/session/duels-copy';
import { type DuelDetail, duelsApi } from '@/lib/session/duels';
import { useRanked } from './ranked-runtime';
import { useSessionLocale } from './session-root';

export function DuelResultView({ duel, locale, onRanked }: { duel: DuelDetail; locale: Locale; onRanked?: () => void }) {
  const copy = DUELS_COPY[locale];
  const winner = duel.userA.id === duel.winnerId ? duel.userA : duel.userB?.id === duel.winnerId ? duel.userB : null;
  const stories = [
    { player: duel.userA, text: duel.storyA, score: duel.scoreA },
    ...(duel.userB ? [{ player: duel.userB, text: duel.storyB, score: duel.scoreB }] : []),
  ];
  return (
    <div className="flex flex-col gap-5 pt-4 lg:pt-8">
      <header>
        <Kicker>{copy.result}</Kicker>
        <h1 className="mt-2 type-title-page text-primary">
          {winner ? `${copy.winner}: ${winner.username}` : duel.userB ? copy.draw : copy.completed}
        </h1>
      </header>
      {duel.prompt ? <Consigna label={copy.prompt} text={duel.prompt} /> : null}
      {duel.reason ? (
        <InkCard fill="bg-tint-yellow">
          <Kicker as="h2">{copy.verdict}</Kicker>
          <p className="mt-2 whitespace-pre-line type-body text-content">{duel.reason}</p>
        </InkCard>
      ) : null}
      {duel.rankPointsDelta !== null || duel.writerXpDelta !== null ? (
        <p className="type-label text-primary">
          {[
            duel.rankPointsDelta !== null ? `${duel.rankPointsDelta >= 0 ? '+' : '−'}${Math.abs(duel.rankPointsDelta)} LP` : '',
            duel.writerXpDelta !== null ? `${duel.writerXpDelta >= 0 ? '+' : '−'}${Math.abs(duel.writerXpDelta)} XP` : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}
      {duel.feedback ? (
        <InkCard>
          <Kicker as="h2">{copy.feedback}</Kicker>
          <p className="mt-2 whitespace-pre-line type-body text-content">{duel.feedback}</p>
        </InkCard>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-2">
        {stories.map(({ player, text, score }) => (
          <InkCard key={player.id} className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <InkButton href={withLang(`/profile/${encodeURIComponent(player.id)}`, locale)} variant="link" fullWidth={false}>
                <span className="inline-flex items-center gap-2">
                  <PlayerIdentity name={player.username} rankTier={player.rankTier} size={32} />
                  <span className="break-words">{player.username}</span>
                </span>
              </InkButton>
              {score !== null ? (
                <span aria-label={copy.score} className="shrink-0 type-numeric text-[24px] text-primary">
                  {score.toLocaleString(INTL_LOCALE[locale])}
                </span>
              ) : null}
            </div>
            {text ? <p className="mt-5 whitespace-pre-wrap break-words type-literary-small leading-relaxed text-content">{text}</p> : null}
          </InkCard>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <InkButton href="/ranked" onClick={onRanked}>
          {copy.another}
        </InkButton>
        <InkButton href="/me" variant="secondary">
          {copy.profile}
        </InkButton>
      </div>
    </div>
  );
}
export function DuelResult({ duelId }: { duelId: string }) {
  const { locale } = useSessionLocale();
  const { runtime } = useRanked();
  const copy = DUELS_COPY[locale];
  const [duel, setDuel] = useState<DuelDetail | null>(null);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const reset = setTimeout(() => {
      setDuel(null);
      setError(false);
      setPending(false);
    }, 0);
    const load = async () => {
      try {
        const next = await duelsApi.detail(duelId, locale, controller.signal);
        if (!controller.signal.aborted) {
          setDuel(next);
          setError(false);
          setPending(false);
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        // /status is participant-only. A spectator's denied detail must never
        // become an endless result wait. Participants may resume pending results.
        if (e instanceof ApiError && e.status === 403) {
          try {
            const status = await duelsApi.status(duelId, locale);
            if (controller.signal.aborted) return;
            if (status.state === 'writing' || status.state === 'evaluating') {
              setPending(true);
              timer = setTimeout(() => void load(), 5000);
              return;
            }
          } catch {
            /* access remains denied */
          }
        }
        setError(true);
        setPending(false);
      }
    };
    const firstLoad = setTimeout(() => void load(), 0);
    return () => {
      controller.abort();
      clearTimeout(timer);
      clearTimeout(reset);
      clearTimeout(firstLoad);
    };
  }, [duelId, locale, attempt]);
  if (duel) return <DuelResultView duel={duel} locale={locale} onRanked={runtime.reset} />;
  if (error)
    return (
      <div className="flex flex-col gap-4 pt-6">
        <InkInlineBanner
          title={copy.detailError}
          action={<InkTextAction onClick={() => setAttempt((value) => value + 1)}>{copy.retry}</InkTextAction>}
        />
        <InkButton href="/me" variant="secondary">
          {copy.profile}
        </InkButton>
      </div>
    );
  if (pending)
    return (
      <div className="flex flex-col gap-4 pt-6">
        <h1 role="status" className="type-title-page text-primary">
          {copy.pending}
        </h1>
        <p className="type-body text-secondary">{copy.pendingBody}</p>
        <InkButton href="/me" variant="secondary">
          {copy.profile}
        </InkButton>
      </div>
    );
  return <InkSkeleton className="mt-6" label={copy.loading} />;
}

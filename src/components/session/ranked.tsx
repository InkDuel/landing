'use client';

import { reload, sendEmailVerification } from '@firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import { Consigna } from '@/components/ink/consigna';
import { InkButton } from '@/components/ink/ink-button';
import { InkCard } from '@/components/ink/ink-card';
import { InkDialog } from '@/components/ink/ink-dialog';
import { InkHeadline } from '@/components/ink/ink-headline';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkEmptyState, InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { Kicker } from '@/components/ink/kicker';
import { NumberedRule } from '@/components/ink/numbered-rule';
import { PlayerIdentity } from '@/components/ink/player-identity';
import { type Locale, INTL_LOCALE, withLang } from '@/lib/i18n';
import { apiGet } from '@/lib/session/api';
import { DUELS_COPY, duelErrorMessage } from '@/lib/session/duels-copy';
import { secondsLeft, storyLength, validStory } from '@/lib/session/duels';
import { getFirebaseAuth } from '@/lib/session/firebase';
import { type RankedState, RankedSession } from '@/lib/session/ranked-session';
import { useRanked } from './ranked-runtime';
import { useSessionLocale } from './session-root';

type InkStatus = { energy: number; maxEnergy: number; cost: number; nextEnergyAt: string };
export function RankedEditor({ state, runtime, locale }: { state: RankedState; runtime: RankedSession; locale: Locale }) {
  const copy = DUELS_COPY[locale];
  const active = state.draft || state.duel;
  const [now, setNow] = useState(Date.now);
  const [forfeiting, setForfeiting] = useState(false);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  if (!active) return null;
  const seconds = secondsLeft(active.writingEndsAt, now);
  const async = !!state.draft || state.duel?.kind === 'ranked_async';
  const length = storyLength(state.story, async);
  const valid = validStory(state.story, async);
  const opponent = state.duel?.userA?.id === runtime.userId ? state.duel.userB : state.duel?.userA;
  return (
    <div className="flex flex-col gap-4 pt-4 lg:pt-8">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-card border-quiet border-divider bg-surface p-3">
        <div className="min-w-0">
          <Kicker>{state.draft ? copy.asyncRanked : copy.ranked}</Kicker>
          {opponent ? (
            <div className="mt-1 flex items-center gap-2">
              <PlayerIdentity name={opponent.username} rankTier={opponent.rankTier} size={32} />
              <span className="truncate type-label text-primary">{opponent.username || copy.rival}</span>
            </div>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="type-caption text-secondary">{copy.remaining}</p>
          <p
            role="timer"
            aria-label={copy.remaining}
            className={`type-numeric text-[32px] ${seconds <= 30 ? 'text-danger' : 'text-primary'}`}
          >
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </p>
        </div>
      </header>
      <Consigna label={copy.prompt} text={active.prompt} />
      <InkCard padding="p-0" className="overflow-hidden">
        <label htmlFor="ranked-story" className="block px-4 pt-4 type-label text-secondary">
          {copy.editor}
        </label>
        <textarea
          id="ranked-story"
          autoFocus
          value={state.story}
          onChange={(event) => runtime.setStory(event.target.value)}
          readOnly={!!state.editorBlocked || seconds === 0 || state.busy || state.submissionAttempted || !active.writingEndsAt}
          aria-describedby="ranked-story-limit"
          placeholder={copy.placeholder}
          spellCheck
          className="ink-focus block min-h-[45svh] w-full resize-y rounded-control bg-surface p-4 type-literary-small text-[19px] leading-relaxed text-content sm:min-h-[420px]"
        />
        <div
          id="ranked-story-limit"
          className="flex flex-wrap items-center justify-between gap-2 border-t border-divider bg-reader p-4 type-caption text-secondary"
        >
          <span>{copy.minimum}</span>
          <span className={length > 5000 ? 'text-danger' : undefined}>
            {copy.limits}: {length.toLocaleString(INTL_LOCALE[locale])} / 5000 {async ? copy.characters : copy.bytes}
          </span>
        </div>
      </InkCard>
      <p className="type-caption text-secondary" role={state.editorBlocked ? 'status' : undefined}>
        {state.editorBlocked === 'unsupported'
          ? copy.editorUnsupported
          : state.editorBlocked
            ? copy.editorElsewhere
            : state.submissionAttempted
              ? copy.frozen
              : copy.saved}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
        <InkButton
          className="sm:max-w-xs"
          disabled={!valid || !!state.editorBlocked}
          busy={state.busy}
          busyLabel={copy.submitting}
          onClick={() => void runtime.submit()}
        >
          {copy.submit}
        </InkButton>
        {state.draft ? (
          <InkButton href="/me" variant="ghost">
            {copy.profile}
          </InkButton>
        ) : (
          <InkButton
            variant="ghost"
            disabled={!!state.editorBlocked || state.busy || state.submissionAttempted}
            onClick={() => setForfeiting(true)}
          >
            {copy.forfeit}
          </InkButton>
        )}
      </div>
      <InkDialog open={forfeiting} onClose={() => setForfeiting(false)} title={copy.forfeitTitle} body={copy.forfeitBody}>
        <InkButton onClick={() => setForfeiting(false)}>{copy.keepWriting}</InkButton>
        <InkButton
          variant="destructive"
          busy={state.busy}
          onClick={() => {
            setForfeiting(false);
            void runtime.forfeit();
          }}
        >
          {copy.forfeit}
        </InkButton>
      </InkDialog>
    </div>
  );
}

export function Ranked() {
  const { locale } = useSessionLocale();
  const { runtime, state } = useRanked();
  const copy = DUELS_COPY[locale];
  const [ink, setInk] = useState<InkStatus | null>(null);
  const [accountError, setAccountError] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const refresh = useCallback(async () => {
    const firebaseUser = getFirebaseAuth()?.currentUser;
    if (!firebaseUser) return;
    try {
      await reload(firebaseUser);
      await firebaseUser.getIdToken(true);
      setNeedsVerification(firebaseUser.providerData.some((provider) => provider.providerId === 'password') && !firebaseUser.emailVerified);
      const data = (await apiGet('/api/me', { locale })) as Record<string, unknown>;
      if (typeof data.energy !== 'number' || typeof data.maxEnergy !== 'number' || typeof data.energyCostPerDuel !== 'number')
        throw new Error('invalid account');
      setInk({
        energy: data.energy,
        maxEnergy: data.maxEnergy,
        cost: data.energyCostPerDuel,
        nextEnergyAt: typeof data.nextEnergyAt === 'string' ? data.nextEnergyAt : '',
      });
      setAccountError(false);
      return firebaseUser;
    } catch {
      setAccountError(true);
      return null;
    }
  }, [locale]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 30_000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [refresh, state.phase]);
  async function begin() {
    if (checking) return;
    setChecking(true);
    const firebaseUser = await refresh();
    if (firebaseUser && !(firebaseUser.providerData.some((provider) => provider.providerId === 'password') && !firebaseUser.emailVerified))
      await runtime.begin();
    setChecking(false);
  }
  async function verify() {
    const firebaseUser = getFirebaseAuth()?.currentUser;
    if (!firebaseUser || checking) return;
    setChecking(true);
    try {
      await sendEmailVerification(firebaseUser);
      setVerificationSent(true);
    } catch {
      setAccountError(true);
    } finally {
      setChecking(false);
    }
  }
  if (state.phase === 'loading' && !state.error) return <InkSkeleton className="mt-6" label={copy.loading} />;
  const readyToStart = ['idle', 'loading'].includes(state.phase);
  return (
    <>
      {state.error ? (
        <InkInlineBanner
          className="mt-4"
          title={duelErrorMessage(state.error, locale)}
          action={
            <InkTextAction onClick={() => void (state.submissionAttempted ? runtime.submit() : runtime.recover())}>
              {copy.retry}
            </InkTextAction>
          }
        />
      ) : null}
      {state.editorBlocked === 'unsupported' && state.phase !== 'writing' ? (
        <InkInlineBanner className="mt-4" title={copy.editorUnsupported} />
      ) : null}
      {state.storageFailed ? <InkInlineBanner className="mt-4" title={copy.saveFailed} /> : null}
      {readyToStart ? (
        <div className="mx-auto flex max-w-[600px] flex-col gap-5 pt-6 lg:pt-10">
          <header>
            <Kicker>{copy.ranked}</Kicker>
            <InkHeadline text={copy.title} className="mt-2" />
            <p className="mt-3 type-body text-secondary">{copy.intro}</p>
          </header>
          <ol>
            <NumberedRule number={1} title={copy.rulePrompt} body={copy.rulePromptBody} />
            <NumberedRule number={2} title={copy.ruleTime} body={copy.ruleTimeBody} divider />
            <NumberedRule number={3} title={copy.ruleResult} body={copy.ruleResultBody} divider />
          </ol>
          {ink ? (
            <InkCard tone="outlined">
              <p className="type-label text-primary">
                {copy.energy}: {ink.energy} / {ink.maxEnergy}
              </p>
              <p className="mt-1 type-caption text-secondary">
                {copy.cost}: {ink.cost}
              </p>
              {ink.nextEnergyAt && Number.isFinite(Date.parse(ink.nextEnergyAt)) ? (
                <p className="type-caption text-secondary">
                  {copy.refill}:{' '}
                  {new Date(ink.nextEnergyAt).toLocaleTimeString(INTL_LOCALE[locale], { hour: '2-digit', minute: '2-digit' })}
                </p>
              ) : null}
            </InkCard>
          ) : null}
          {accountError ? (
            <InkInlineBanner
              title={duelErrorMessage('generic', locale)}
              action={<InkTextAction onClick={() => void refresh()}>{copy.retry}</InkTextAction>}
            />
          ) : null}
          {needsVerification ? (
            <InkInlineBanner
              title={verificationSent ? copy.verificationSent : copy.verification}
              action={<InkTextAction onClick={() => void verify()}>{copy.sendVerification}</InkTextAction>}
            />
          ) : null}
          {ink && ink.energy < ink.cost ? <p className="type-body text-secondary">{copy.noEnergy}</p> : null}
          <InkButton
            busy={checking || state.busy}
            disabled={
              state.editorBlocked === 'unsupported' || !ink || ink.energy < ink.cost || (!!state.error && state.phase === 'loading')
            }
            onClick={() => void begin()}
          >
            {copy.start}
          </InkButton>
        </div>
      ) : null}
      {state.phase === 'waiting' ? (
        <div className="mx-auto flex max-w-[600px] flex-col gap-5 py-10">
          <Kicker>{copy.ranked}</Kicker>
          <h1 className="type-title-page text-primary" role="status">
            {copy.waiting}
          </h1>
          <p className="type-body text-secondary">{copy.waitingBody}</p>
          <InkSkeleton lines={1} label={copy.waiting} />
          {state.lowActivity ? (
            <InkCard fill="bg-tint-yellow">
              <h2 className="type-title-section text-primary">{copy.lowActivity}</h2>
              {state.asyncOffer ? (
                <>
                  <p className="mt-2 type-body text-secondary">{copy.lowActivityBody}</p>
                  <InkButton className="mt-4" busy={state.busy} onClick={() => void runtime.prepare()}>
                    {copy.async}
                  </InkButton>
                </>
              ) : null}
            </InkCard>
          ) : null}
          <InkButton variant="ghost" busy={state.busy} onClick={() => void runtime.cancel()}>
            {copy.cancel}
          </InkButton>
        </div>
      ) : null}
      {state.phase === 'writing' ? <RankedEditor state={state} runtime={runtime} locale={locale} /> : null}
      {['pending', 'queued', 'finished', 'cancelled', 'expired', 'unavailable', 'otherMode'].includes(state.phase) ? (
        <div className="mx-auto max-w-[650px] py-8">
          <InkEmptyState
            title={
              state.phase === 'pending'
                ? copy.pending
                : state.phase === 'queued'
                  ? copy.queued
                  : state.phase === 'finished'
                    ? copy.finished
                    : state.phase === 'cancelled'
                      ? copy.cancelled
                      : state.phase === 'otherMode'
                        ? copy.otherMode
                        : state.phase === 'unavailable'
                          ? copy.unavailable
                          : copy.expired
            }
            message={
              state.phase === 'pending'
                ? copy.pendingBody
                : state.phase === 'queued'
                  ? copy.queuedBody
                  : state.phase === 'expired'
                    ? copy.expiredBody
                    : state.phase === 'otherMode'
                      ? copy.otherModeBody
                      : state.phase === 'unavailable'
                        ? copy.unavailableBody
                        : undefined
            }
          />
          {['expired', 'unavailable'].includes(state.phase) && state.story ? (
            <textarea
              aria-label={copy.editor}
              value={state.story}
              readOnly
              className="ink-focus mb-4 min-h-64 w-full rounded-card border-quiet border-divider bg-surface p-4 type-literary-small text-content"
            />
          ) : null}
          <div className="flex flex-col gap-3">
            {state.phase === 'finished' && state.duel ? (
              <InkButton href={withLang(`/duels/${encodeURIComponent(state.duel.id)}`, locale)}>{copy.viewResult}</InkButton>
            ) : null}
            <InkButton href="/me" variant="secondary">
              {copy.profile}
            </InkButton>
            {['finished', 'cancelled', 'expired', 'unavailable', 'queued'].includes(state.phase) ? (
              <InkButton variant="ghost" onClick={runtime.reset}>
                {copy.another}
              </InkButton>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Profile affordance for recovering games after navigating away. */
export function RankedActiveNotice({ locale }: { locale: Locale }) {
  const { state } = useRanked();
  const copy = DUELS_COPY[locale];
  if (!['waiting', 'writing', 'pending'].includes(state.phase)) return null;
  return (
    <InkButton href="/ranked" variant="secondary">
      {state.phase === 'pending' ? copy.pending : copy.another}
    </InkButton>
  );
}

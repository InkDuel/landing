'use client';

import { useCallback, useEffect, useState } from 'react';

import { InkButton } from '@/components/ink/ink-button';
import { InkChip } from '@/components/ink/ink-chip';
import { InkHeadline } from '@/components/ink/ink-headline';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkEmptyState, InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { INTL_LOCALE } from '@/lib/i18n';
import { ApiError } from '@/lib/session/api';
import { COVER_REJECT_REASONS, type CoverQueueItem, type CoverRejectReason, coversOpsApi } from '@/lib/session/covers-ops';
import { COVERS_OPS_COPY, type CoversOpsCopy } from '@/lib/session/covers-ops-copy';

import { useSessionLocale } from './session-root';

// «Portadas en revisión»: the founder's queue of covers the automatic pass
// left undecided. Reached from the Discord notice; linked from nowhere. The
// backend decides who may see it (404 otherwise, same as a missing page).
// Decisions leave the list at once and come back if the backend refuses.

type Load = { state: 'loading' } | { state: 'ready'; items: CoverQueueItem[] } | { state: 'notFound' } | { state: 'error' };

export function CoverReviewQueue() {
  const { locale } = useSessionLocale();
  const copy = COVERS_OPS_COPY[locale];
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  // Decisions the backend refused: the card came back and says so.
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());

  const fetchQueue = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoad({ state: 'ready', items: await coversOpsApi.queue({ locale, signal }) });
      } catch (error) {
        if (signal?.aborted) return;
        setLoad(error instanceof ApiError && (error.status === 404 || error.status === 403) ? { state: 'notFound' } : { state: 'error' });
      }
    },
    [locale],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchQueue(controller.signal);
    return () => controller.abort();
  }, [fetchQueue]);

  const reload = () => {
    setLoad({ state: 'loading' });
    void fetchQueue();
  };

  const remove = (reviewId: string) =>
    setLoad((current) => (current.state === 'ready' ? { state: 'ready', items: current.items.filter((i) => i.reviewId !== reviewId) } : current));
  const decide = async (item: CoverQueueItem, index: number, action: () => Promise<void>) => {
    remove(item.reviewId);
    setFailed((current) => {
      const next = new Set(current);
      next.delete(item.reviewId);
      return next;
    });
    try {
      await action();
    } catch (error) {
      // 409: already settled (another tab, or a newer upload superseded it).
      if (error instanceof ApiError && error.status === 409) return;
      restore(item, index);
      setFailed((current) => new Set(current).add(item.reviewId));
    }
  };
  const restore = (item: CoverQueueItem, index: number) =>
    setLoad((current) => {
      if (current.state !== 'ready' || current.items.some((i) => i.reviewId === item.reviewId)) return current;
      const items = [...current.items];
      items.splice(Math.min(index, items.length), 0, item);
      return { state: 'ready', items };
    });

  if (load.state === 'notFound') {
    return <InkEmptyState className="mt-6" title={copy.notFoundTitle} message={copy.notFoundBody} />;
  }

  return (
    <section className="flex flex-col gap-6 pt-6">
      <header className="flex flex-col gap-2">
        <InkHeadline text={copy.title} as="h1" size="title-page" />
        <p className="type-body text-secondary">{copy.lead}</p>
      </header>
      {load.state === 'loading' ? <InkSkeleton lines={2} height="h-64" label={copy.loading} /> : null}
      {load.state === 'error' ? (
        <InkInlineBanner title={copy.error} action={<InkTextAction onClick={reload}>{copy.retry}</InkTextAction>} />
      ) : null}
      {load.state === 'ready' && load.items.length === 0 ? (
        <InkEmptyState
          title={copy.emptyTitle}
          message={copy.emptyBody}
          action={<InkTextAction onClick={reload}>{copy.reload}</InkTextAction>}
        />
      ) : null}
      {load.state === 'ready' && load.items.length > 0 ? (
        <>
          <div>
            <InkTextAction onClick={reload}>{copy.reload}</InkTextAction>
          </div>
          <ul className="flex flex-col gap-6">
            {load.items.map((item, index) => (
              <CoverReviewCard
                key={item.reviewId}
                item={item}
                copy={copy}
                dateLocale={INTL_LOCALE[locale]}
                failed={failed.has(item.reviewId)}
                onApprove={() => decide(item, index, () => coversOpsApi.approve(item.reviewId, { locale }))}
                onReject={(reason) => decide(item, index, () => coversOpsApi.reject(item.reviewId, reason, { locale }))}
              />
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function CoverReviewCard({
  item,
  copy,
  dateLocale,
  failed,
  onApprove,
  onReject,
}: {
  item: CoverQueueItem;
  copy: CoversOpsCopy;
  dateLocale: string;
  failed: boolean;
  onApprove: () => Promise<void>;
  onReject: (reason: CoverRejectReason) => Promise<void>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<CoverRejectReason | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // The card leaves the list as soon as a decision starts; if the backend
  // refuses, the queue puts a fresh card back with [failed].
  function run(action: () => Promise<void>) {
    setBusy(true);
    void action();
  }

  const submitted = item.submittedAt ? new Date(item.submittedAt) : null;
  const signals = Object.entries(item.moderation).filter(([, likelihood]) => likelihood && likelihood !== 'VERY_UNLIKELY');

  return (
    <li className="flex flex-col gap-4 rounded-card border-brand border-outline bg-surface p-4 sm:flex-row">
      <div className="relative h-[270px] w-[180px] shrink-0 overflow-hidden rounded-[6px] border-2 border-outline bg-sunken">
        {item.imageUrl && !imageFailed ? (
          // Signed URL from the bucket; never cached past its 5 minutes.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
        ) : (
          <p className="p-3 type-caption text-secondary">{copy.imageExpired}</p>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-literary text-[20px] font-bold leading-tight text-content">{item.workTitle}</h2>
          <p className="type-caption text-secondary">{item.authorName}</p>
          {submitted && !Number.isNaN(submitted.getTime()) ? (
            <p className="type-caption text-tertiary">
              {copy.submitted(submitted.toLocaleString(dateLocale, { dateStyle: 'medium', timeStyle: 'short' }))}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <InkChip tone="outline">{item.replacesCover ? copy.replaces : copy.firstCover}</InkChip>
          {signals.map(([signal, likelihood]) => (
            <InkChip key={signal} tone={likelihood.includes('LIKELY') && !likelihood.includes('UNLIKELY') ? 'danger' : 'muted'}>
              {`${signal}: ${likelihood.toLowerCase().replace('_', ' ')}`}
            </InkChip>
          ))}
        </div>
        {item.moderationNote ? (
          <p className="type-caption text-secondary">
            {copy.autoNote}: {item.moderationNote}
          </p>
        ) : null}
        {failed ? <InkInlineBanner title={copy.actionError} /> : null}
        {rejecting ? (
          <fieldset className="flex flex-col gap-3" disabled={busy}>
            <legend className="mb-2 type-caption font-extrabold text-primary">{copy.rejectAs}</legend>
            <div className="flex flex-wrap gap-2">
              {COVER_REJECT_REASONS.map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={reason === code}
                  onClick={() => setReason(code)}
                  className={
                    reason === code
                      ? 'ink-focus rounded-pill border-quiet border-inverse bg-inverse px-[14px] py-2 type-caption font-bold text-inverse'
                      : 'ink-focus rounded-pill border-quiet border-default bg-surface px-[14px] py-2 type-caption font-bold text-secondary'
                  }
                >
                  {copy.reasons[code]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <InkButton
                variant="destructive"
                fullWidth={false}
                disabled={!reason}
                busy={busy}
                busyLabel={copy.working}
                onClick={() => reason && run(() => onReject(reason))}
              >
                {copy.confirmReject}
              </InkButton>
              <InkButton variant="ghost" fullWidth={false} onClick={() => setRejecting(false)}>
                {copy.cancel}
              </InkButton>
            </div>
          </fieldset>
        ) : (
          <div className="flex flex-wrap gap-3">
            <InkButton fullWidth={false} busy={busy} busyLabel={copy.working} onClick={() => run(onApprove)}>
              {copy.approve}
            </InkButton>
            <InkButton variant="secondary" fullWidth={false} disabled={busy} onClick={() => setRejecting(true)}>
              {copy.reject}
            </InkButton>
          </div>
        )}
      </div>
    </li>
  );
}

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useCallback, useRef, useState } from 'react';

import { PlusIcon } from '@/components/ink/icons';
import { InkButton } from '@/components/ink/ink-button';
import { InkDialog } from '@/components/ink/ink-dialog';
import { InkHeadline } from '@/components/ink/ink-headline';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkEmptyState, InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { InkTextField } from '@/components/ink/ink-text-field';
import { BackLink } from '@/components/legal/legal-page';
import { HistoriasIndex, ListFooter } from './historias';
import { useSessionLocale } from './session-root';
import { MyWorkRow, PillFilters, chapterEditHref } from './works-parts';
import { SESSION_COPY } from '@/lib/session/copy';
import { useInfiniteSentinel, usePagedList } from '@/lib/session/use-paged-list';
import { type MyWorksFilter, WORK_LIMITS, newClientId, worksApi } from '@/lib/session/works';
import { WORKS_COPY } from '@/lib/session/works-copy';

// Tus obras (16): Producto, pill filters, «Nueva obra» as the one yellow
// action. Creating a work asks only for its title, then opens the editor of
// chapter 1, as the app does. Converting a duel story is not on the web yet.

function NewWorkDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale } = useSessionLocale();
  const copy = WORKS_COPY[locale];
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // One id per dialog: a retry after an ambiguous failure opens the same work
  // instead of creating a second one (the backend is idempotent per id).
  const requestId = useRef<string | null>(null);

  const trimmed = title.trim();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmed || busy) return;
    setBusy(true);
    setFailed(false);
    requestId.current ??= newClientId();
    try {
      const work = await worksApi.createOriginal(trimmed, requestId.current, { locale });
      router.push(chapterEditHref(work.id, 'new'));
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  function close() {
    if (busy) return;
    setTitle('');
    setFailed(false);
    requestId.current = null;
    onClose();
  }

  return (
    <InkDialog open={open} onClose={close} title={copy.newWorkTitle} body={copy.newWorkLead}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <InkTextField
          label={copy.workTitleHint}
          value={title}
          maxLength={WORK_LIMITS.workTitle}
          onChange={(event) => {
            setTitle(event.target.value);
            // A different title is a different request.
            requestId.current = null;
          }}
          autoFocus
          disabled={busy}
        />
        {failed ? <InkInlineBanner title={copy.createError} /> : null}
        <InkButton type="submit" disabled={!trimmed} busy={busy} busyLabel={copy.starting}>
          {copy.startWriting}
        </InkButton>
        <InkButton variant="ghost" fullWidth={false} className="self-center" onClick={close}>
          {copy.cancel}
        </InkButton>
      </form>
    </InkDialog>
  );
}

export function MyWorksView() {
  const { locale } = useSessionLocale();
  const copy = WORKS_COPY[locale];
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('filter');
  const filter: MyWorksFilter = raw === 'drafts' || raw === 'published' ? raw : 'all';
  const [creating, setCreating] = useState(false);

  const fetchPage = useCallback(
    (cursor: string | null, signal: AbortSignal) => worksApi.listMine(filter, cursor, { locale, signal }),
    [filter, locale],
  );
  const works = usePagedList(fetchPage);
  const sentinel = useInfiniteSentinel(works.loadMore, works.status === 'ready' && works.hasMore);

  const empty =
    filter === 'all' ? (
      <InkEmptyState
        title={copy.emptyAllTitle}
        message={copy.emptyAllBody}
        action={
          <InkButton fullWidth={false} className="px-6" onClick={() => setCreating(true)}>
            {copy.emptyAllCta}
          </InkButton>
        }
      />
    ) : (
      <InkEmptyState title={filter === 'drafts' ? copy.emptyDrafts : copy.emptyPublished} />
    );

  return (
    <div className="flex flex-col gap-5 pt-2">
      <BackLink href="/me" label={SESSION_COPY[locale].nav.profile} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <InkHeadline text={copy.headline} size="title-page" />
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="ink-focus ink-press inline-flex min-h-11 items-center gap-1.5 rounded-pill border-brand border-outline bg-yellow px-4 py-2 type-button-sm text-[14px] text-on-accent ink-shadow-press"
        >
          <PlusIcon size={16} />
          {copy.newWork}
        </button>
      </div>
      <PillFilters
        value={filter}
        locale={locale}
        onChange={(next) => router.replace(next === 'all' ? '/me/works' : `/me/works?filter=${next}`, { scroll: false })}
      />

      {works.status === 'loading' ? <InkSkeleton lines={4} height="h-16" label={SESSION_COPY[locale].common.loading} /> : null}
      {works.status === 'error' ? (
        <InkInlineBanner
          title={copy.listError}
          detail={copy.listErrorDetail}
          action={<InkTextAction onClick={works.retry}>{copy.retry}</InkTextAction>}
        />
      ) : null}
      {works.status === 'ready' && works.items.length === 0 ? empty : null}
      {works.status === 'ready' && works.items.length > 0 ? (
        <HistoriasIndex items={works.items.map((work) => ({ key: work.id, node: <MyWorkRow work={work} locale={locale} /> }))} />
      ) : null}
      <ListFooter
        sentinel={sentinel}
        loadingMore={works.loadingMore}
        failed={works.loadMoreFailed}
        onRetry={works.loadMore}
        locale={locale}
      />

      <NewWorkDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

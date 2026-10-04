'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { cx } from '@/components/ink/cx';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { DashedLine } from '@/components/ink/numbered-rule';
import { PlayerIdentity } from '@/components/ink/player-identity';
import { formatDate, type Locale } from '@/lib/i18n';
import type { GalleryStory, GalleryWork } from '@/lib/session/models';
import { SESSION_COPY } from '@/lib/session/copy';

// Pieces of Historias (09), ported from features/gallery/presentation/
// widgets/historias_items.dart and gallery_work_card.dart: a 24 px anchor
// column (pink «» for a relato, a spine for an obra), Literata for what
// people wrote, dashed separators from the text column.

const SPINES = ['bg-[var(--ink-spine-1)]', 'bg-[var(--ink-spine-2)]', 'bg-[var(--ink-spine-3)]', 'bg-[var(--ink-spine-4)]', 'bg-[var(--ink-spine-5)]'];

/** Stable spine colour per work id (same hash as the app). */
function spineClass(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0x7fffffff;
  }
  return SPINES[hash % SPINES.length];
}

export function QuoteMark() {
  return (
    <span aria-hidden="true" className="w-6 shrink-0 font-literary text-[37px] leading-[27px] font-bold italic text-pink">
      «
    </span>
  );
}

export function Spine({ workId, tall = false }: { workId: string; tall?: boolean }) {
  return (
    <span aria-hidden="true" className="flex w-6 shrink-0">
      <span
        className={cx(
          'flex w-3.5 justify-center rounded-[3px] border-brand border-outline pt-[5px]',
          tall ? 'h-10' : 'h-8',
          spineClass(workId),
        )}
      >
        <span className="h-0.5 w-full bg-[var(--ink-c-outline)]" />
      </span>
    </span>
  );
}

/** «(T) @name · extra»: neutral initial, the name in ink, the rest muted. */
export function ByLine({
  name,
  authorId,
  extra,
  size = 'sm',
  trailing,
}: {
  name: string;
  authorId?: string;
  extra?: string | null;
  size?: 'sm' | 'md';
  trailing?: ReactNode;
}) {
  const clean = name.replace(/^@/, '');
  const who = (
    <>
      <PlayerIdentity name={clean} size={24} />
      <span className={cx('min-w-0 truncate text-secondary', size === 'md' ? 'type-body text-[14.5px]' : 'type-body text-[13.5px]')}>
        <span className="font-bold text-primary">@{clean}</span>
        {extra ? ` · ${extra}` : null}
      </span>
    </>
  );
  return (
    <div className="flex items-center gap-2">
      {authorId ? (
        <Link
          href={`/profile/${encodeURIComponent(authorId)}`}
          className="ink-focus ink-dim relative z-10 flex min-w-0 flex-1 items-center gap-[7px] rounded-control"
        >
          {who}
        </Link>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-[7px]">{who}</span>
      )}
      {trailing}
    </div>
  );
}

/** «**Consigna.** text», 13.5 muted. */
export function PromptLine({ label, prompt, lines = 2 }: { label: string; prompt: string; lines?: 1 | 2 }) {
  return (
    <p className={cx('type-body text-[13.5px] leading-[1.4] text-secondary', lines === 1 ? 'line-clamp-1' : 'line-clamp-2')}>
      <span className="font-bold text-primary">{label}</span> {prompt}
    </p>
  );
}

export function HistoriasDivider() {
  return <DashedLine className="ml-[34px] [--line:var(--ink-arena-dot)]" />;
}

/**
 * «Lo último»: the only card of the list and the editorial lead. On desktop
 * its own pieces sit side by side: what was written on the left, the
 * context (consigna, reason, author) on the right.
 */
export function LeadCard({ kicker, main, aside }: { kicker: string; main: ReactNode; aside: ReactNode }) {
  return (
    <article className="relative flex flex-col gap-2.5 rounded-[18px] border-brand border-outline bg-surface px-[18px] py-4 ink-shadow-lift lg:px-7 lg:py-6">
      <p className="type-label text-[11px] tracking-[0.09em] text-secondary">{kicker}</p>
      <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-end lg:gap-x-12">
        <div className="min-w-0">{main}</div>
        <div className="flex min-w-0 flex-col gap-2.5">{aside}</div>
      </div>
    </article>
  );
}

/**
 * The index under «Lo último»: one column on mobile, an editorial grid of
 * two from desktop. Dashed separators start at the text column, between
 * rows only.
 */
export function HistoriasIndex({ items }: { items: { key: string; node: ReactNode }[] }) {
  return (
    <div className="grid lg:grid-cols-2 lg:gap-x-12">
      {items.map((item, index) => (
        <div key={item.key} className="min-w-0">
          {index === 0 ? null : (
            <div className={index === 1 ? 'lg:hidden' : undefined}>
              <HistoriasDivider />
            </div>
          )}
          {item.node}
        </div>
      ))}
    </div>
  );
}

/** Infinite scroll anchor, the next page loading and its retry. */
export function ListFooter({
  sentinel,
  loadingMore,
  failed,
  onRetry,
  locale,
}: {
  sentinel: React.Ref<HTMLDivElement>;
  loadingMore: boolean;
  failed: boolean;
  onRetry: () => void;
  locale: Locale;
}) {
  return (
    <>
      <div ref={sentinel} aria-hidden="true" />
      {loadingMore ? <InkSkeleton className="mt-3" lines={1} label={SESSION_COPY[locale].common.loading} /> : null}
      {failed ? (
        <div className="mt-3">
          <InkTextAction onClick={onRetry}>{SESSION_COPY[locale].common.retry}</InkTextAction>
        </div>
      ) : null}
    </>
  );
}

/** Small yellow «Leer» of the lead card. */
export function ReadPill({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="ink-focus relative z-10 shrink-0 rounded-control border-brand border-outline bg-yellow px-4 py-[7px] type-button-sm text-on-accent active:bg-[var(--ink-pencil-yellow-deep)]"
    >
      {label}
    </Link>
  );
}

/** «Ganó por consigna y creatividad»: lowercased strengths joined in prose. */
export function winReason(story: GalleryStory, locale: Locale): string | null {
  const copy = SESSION_COPY[locale].stories;
  const parts = story.strengths.map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (parts.length === 0) return null;
  const joined = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')}${copy.and}${parts[parts.length - 1]}`;
  return copy.winReason(joined);
}

/** The relato quoted in its own words, closed with «»». */
function RelatoQuote({ text, lead }: { text: string; lead: boolean }) {
  const trimmed = text.trim();
  return (
    <p
      className={cx(
        'font-literary italic text-content',
        lead ? 'text-[20px] leading-[1.38] line-clamp-6' : 'text-[18px] leading-[1.42] line-clamp-3',
      )}
    >
      {trimmed.endsWith('»') ? trimmed : `${trimmed}»`}
    </p>
  );
}

export function storyHref(story: GalleryStory): string {
  return `/stories?relato=${encodeURIComponent(story.key)}`;
}

/** A relato in the index; the whole row opens it, the author opens the profile. */
export function RelatoItem({ story, locale, lead = false }: { story: GalleryStory; locale: Locale; lead?: boolean }) {
  const copy = SESSION_COPY[locale].stories;
  const reason = winReason(story, locale);
  const href = storyHref(story);
  const prompt = story.prompt.trim();

  if (lead) {
    return (
      <LeadCard
        kicker={copy.latest}
        main={
          <div className="flex items-start gap-2.5">
            <QuoteMark />
            <Link href={href} className="ink-focus min-w-0 flex-1 rounded-control after:absolute after:inset-0 after:content-['']">
              <RelatoQuote text={story.storyPreview} lead />
            </Link>
          </div>
        }
        aside={
          <>
            {prompt ? <PromptLine label={copy.promptLead} prompt={prompt} /> : null}
            {reason ? <p className="type-caption text-[13.5px] text-secondary">{reason}</p> : null}
            <ByLine
              name={story.authorDisplayName}
              authorId={story.authorId || undefined}
              size="md"
              trailing={<ReadPill href={href} label={copy.read} />}
            />
          </>
        }
      />
    );
  }

  return (
    <article className="relative flex items-start gap-2.5 pt-5 pb-[19px]">
      <QuoteMark />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Link href={href} className="ink-focus rounded-control after:absolute after:inset-0 after:content-['']">
          <RelatoQuote text={story.storyPreview} lead={false} />
        </Link>
        {prompt ? <PromptLine label={copy.promptLead} prompt={prompt} lines={1} /> : null}
        <ByLine name={story.authorDisplayName} authorId={story.authorId || undefined} extra={reason} />
      </div>
    </article>
  );
}

export function workHref(work: { id: string }): string {
  return `/work/${encodeURIComponent(work.id)}`;
}

/** An obra in the index: its title as a title page in Literata, on a spine. */
export function WorkItem({ work, locale, lead = false }: { work: GalleryWork; locale: Locale; lead?: boolean }) {
  const storiesCopy = SESSION_COPY[locale].stories;
  const title = work.title || SESSION_COPY[locale].common.untitled;
  const chapters = storiesCopy.chapterCount(work.publishedChapterCount);
  const href = workHref(work);
  const titleEl = (
    <Link href={href} className="ink-focus min-w-0 flex-1 rounded-control after:absolute after:inset-0 after:content-['']">
      <h3
        className={cx(
          'font-literary font-semibold text-primary break-words',
          lead ? 'text-[33px] leading-[1.08] tracking-[-0.01em]' : 'text-[25px] leading-[1.15]',
        )}
      >
        {title}
      </h3>
    </Link>
  );

  if (lead) {
    const date = work.firstPublishedAt ? formatDate(work.firstPublishedAt, locale) : '';
    return (
      <LeadCard
        kicker={date ? storiesCopy.latestDated(date) : storiesCopy.latest}
        main={
          <div className="flex items-start gap-2.5">
            <Spine workId={work.id} tall />
            {titleEl}
          </div>
        }
        aside={
          <ByLine
            name={work.authorDisplayName}
            authorId={work.authorId || undefined}
            extra={chapters}
            size="md"
            trailing={<ReadPill href={href} label={storiesCopy.read} />}
          />
        }
      />
    );
  }

  return (
    <article className="relative flex items-start gap-2.5 py-5">
      <Spine workId={work.id} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {titleEl}
        <ByLine name={work.authorDisplayName} authorId={work.authorId || undefined} extra={chapters} />
      </div>
    </article>
  );
}

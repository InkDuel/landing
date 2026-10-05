'use client';

import Link from 'next/link';

import { cx } from '@/components/ink/cx';
import { ChevronRightIcon } from '@/components/ink/icons';
import { InkChip, type InkChipTone } from '@/components/ink/ink-chip';
import { formatDate, type Locale } from '@/lib/i18n';
import type { MyWork, MyWorksFilter } from '@/lib/session/works';
import { WORKS_COPY } from '@/lib/session/works-copy';

import { Spine } from './historias';

// Pieces of Obras (16), ported from features/continue_stories/presentation:
// Producto context, spines with the app's stable colour, Literata titles,
// written status chips, pill filters (the pattern Obras keeps).

export function myWorksHref(): string {
  return '/me/works';
}

export function workManageHref(workId: string): string {
  return `/me/works/${encodeURIComponent(workId)}`;
}

export function chapterEditHref(workId: string, chapterId: string | 'new'): string {
  return `/me/works/${encodeURIComponent(workId)}/chapter/${chapterId === 'new' ? 'new' : encodeURIComponent(chapterId)}`;
}

/** «Tu espacio» row of the own profile (Perfil mockup .p-rows). */
export function SpaceRow({ href, title, subtitle, glyph }: { href: string; title: string; subtitle: string; glyph: string }) {
  return (
    <Link
      href={href}
      className="ink-focus ink-dim flex items-center gap-3 rounded-card border-quiet border-divider bg-surface px-4 py-[15px] no-underline"
    >
      <Spine workId={glyph} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="type-body-strong leading-[1.2] text-primary">{title}</span>
        <span className="type-body text-[14px] text-secondary">{subtitle}</span>
      </span>
      <ChevronRightIcon size={20} className="shrink-0 text-secondary" />
    </Link>
  );
}

/** Pill filters of Tus obras: the active one inverted (05, InkPillFilters). */
export function PillFilters({
  value,
  onChange,
  locale,
}: {
  value: MyWorksFilter;
  onChange: (value: MyWorksFilter) => void;
  locale: Locale;
}) {
  const copy = WORKS_COPY[locale];
  const options: [MyWorksFilter, string][] = [
    ['all', copy.filterAll],
    ['drafts', copy.filterDrafts],
    ['published', copy.filterPublished],
  ];
  return (
    <div role="radiogroup" aria-label={copy.filtersLabel} className="flex flex-wrap gap-2">
      {options.map(([option, label]) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={cx(
              'ink-focus min-h-11 rounded-pill border-quiet px-4 type-caption font-bold leading-[1.2]',
              selected ? 'border-inverse bg-inverse text-inverse' : 'border-control bg-surface text-primary ink-dim',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Status chip of a work in Tus obras (my_works_page.dart). */
export function workStatus(work: MyWork, locale: Locale): [string, InkChipTone] {
  const copy = WORKS_COPY[locale];
  if (work.published) return work.isGalleryEligible ? [copy.chipPublished, 'success'] : [copy.chipNotVisible, 'danger'];
  if (work.chapterCount === 0) return [copy.chipEmpty, 'outline'];
  if (!work.title.trim()) return [copy.untitled, 'outline'];
  return [copy.chipDraft, 'muted'];
}

function workLine(work: MyWork, locale: Locale): string {
  const copy = WORKS_COPY[locale];
  if (work.published && work.publishedChapterCount === 0) return copy.publishedNoChapters;
  let line = copy.chapterCount(work.chapterCount);
  if (work.chapterCount > 0 && work.publishedChapterCount > 0) line += copy.publishedChapters(work.publishedChapterCount);
  if (work.published && work.followerCount > 0) line += copy.followers(work.followerCount);
  else if (!work.published && work.updatedAt) {
    const date = formatDate(work.updatedAt, locale);
    if (date) line += copy.updatedOn(date);
  }
  return line;
}

export function MyWorkRow({ work, locale }: { work: MyWork; locale: Locale }) {
  const copy = WORKS_COPY[locale];
  const [label, tone] = workStatus(work, locale);
  const title = work.title.trim() || (work.published ? copy.untitled : copy.untitledDraft);
  return (
    <Link
      href={workManageHref(work.id)}
      className="ink-focus ink-dim flex items-start gap-2.5 rounded-control py-4 no-underline"
    >
      <Spine workId={work.id} />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0 font-literary text-[22px] leading-[1.15] font-semibold break-words text-primary">{title}</span>
          <InkChip tone={tone} className="mt-1 shrink-0">
            {label}
          </InkChip>
        </span>
        <span className="type-caption text-secondary">{workLine(work, locale)}</span>
      </span>
    </Link>
  );
}

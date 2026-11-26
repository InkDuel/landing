'use client';

import { ReadingNotFound } from '@/components/reading/story-parts';
import { WorkCover } from '@/components/reading/work-cover';
import { LocalizedShell } from '@/components/shell/localized-shell';
import { type Locale, withLang } from '@/lib/i18n';
import type { PublicWork, PublicWorkChapter } from '@/lib/public-api';

import { WORK_COPY } from '../../work-copy';
import { AccountGate } from '../../work-public-view';

export function LockedChapterView({
  work,
  chapter,
  initialLocale,
  resolveOnClient,
}: {
  work: PublicWork | null;
  chapter: PublicWorkChapter | null;
  initialLocale: Locale;
  resolveOnClient: boolean;
}) {
  return (
    <LocalizedShell initialLocale={initialLocale} resolveOnClient={resolveOnClient} context="reading" width="reading">
      {(locale) => {
        const copy = WORK_COPY[locale];
        if (!work || !chapter) {
          return <ReadingNotFound title={copy.notFoundTitle} body={copy.notFoundBody} homeHref={withLang('/', locale)} homeLabel={copy.goHome} />;
        }
        return (
          <article className="pt-6">
            <a href={withLang(`/w/${encodeURIComponent(work.id)}`, locale)} className="ink-focus flex items-center gap-4 no-underline">
              <WorkCover workId={work.id} title={work.title} author={work.authorDisplayName} width={72} />
              <span className="flex flex-col gap-1">
                <span className="font-literary text-[20px] font-bold leading-tight text-content">{work.title}</span>
                <span className="type-caption text-secondary">{work.authorDisplayName}</span>
              </span>
            </a>
            <p className="mt-10 type-label text-tertiary">{copy.chapterN(chapter.position)}</p>
            <h1 className="mt-2 type-literary-title text-content">{chapter.title || copy.chapterN(chapter.position)}</h1>
            <AccountGate workId={work.id} chapterId={chapter.id} kicker={copy.lockedTitle} copy={copy} locale={locale} />
          </article>
        );
      }}
    </LocalizedShell>
  );
}

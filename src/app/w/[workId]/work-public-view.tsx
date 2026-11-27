'use client';

import { InkButton } from '@/components/ink/ink-button';
import { InkCard } from '@/components/ink/ink-card';
import { InkChip } from '@/components/ink/ink-chip';
import { Kicker } from '@/components/ink/kicker';
import { PlayerIdentity } from '@/components/ink/player-identity';
import { ReadingNotFound, StoryText } from '@/components/reading/story-parts';
import { WorkCover } from '@/components/reading/work-cover';
import { LocalizedShell } from '@/components/shell/localized-shell';
import { StoreButtons } from '@/components/shell/store-buttons';
import { type Locale, withLang } from '@/lib/i18n';
import type { PublicWork, PublicWorkChapter } from '@/lib/public-api';

import { WORK_COPY, type WorkCopy } from './work-copy';

/** Where «Entrar» sends someone with an account: the signed-in reader, at the chapter. */
export function loginToChapterHref(workId: string, chapterId: string): string {
  return `/login?next=${encodeURIComponent(`/work/${workId}/chapter/${chapterId}`)}`;
}

export function AccountGate({ workId, chapterId, kicker, copy, locale }: { workId: string; chapterId: string; kicker: string; copy: WorkCopy; locale: Locale }) {
  return (
    <InkCard tone="brand" className="mt-8 flex flex-col gap-3" padding="p-5">
      <Kicker>{kicker}</Kicker>
      <h2 className="type-title-section text-primary">{copy.gateTitle}</h2>
      <p className="type-body text-secondary">{copy.gateBody}</p>
      <InkButton href={loginToChapterHref(workId, chapterId)} className="mt-1">
        {copy.gateLogin}
      </InkButton>
      <p className="mt-2 type-caption text-secondary">{copy.gateNoAccount}</p>
      <StoreButtons locale={locale} />
      <p className="type-caption text-tertiary">{copy.gateAfterInstall}</p>
    </InkCard>
  );
}

export function WorkPublicView({
  work,
  freeChapter,
  initialLocale,
  resolveOnClient,
}: {
  work: PublicWork | null;
  freeChapter: PublicWorkChapter | null;
  initialLocale: Locale;
  resolveOnClient: boolean;
}) {
  return (
    <LocalizedShell initialLocale={initialLocale} resolveOnClient={resolveOnClient} context="reading" width="reading">
      {(locale) => {
        const copy = WORK_COPY[locale];
        if (!work) {
          return <ReadingNotFound title={copy.notFoundTitle} body={copy.notFoundBody} homeHref={withLang('/', locale)} homeLabel={copy.goHome} />;
        }
        const genre = work.genres[0] ? copy.genres[work.genres[0]] : undefined;
        const status = work.completionStatus ? copy.status[work.completionStatus] : undefined;
        const next = work.chapters[1];
        const author = work.authorDisplayName;
        return (
          <article className="pt-6">
            <header className="flex flex-col gap-6 sm:flex-row sm:items-end">
              <WorkCover workId={work.id} title={work.title} author={author} width={148} coverUrl={work.coverUrl} />
              <div className="flex flex-col gap-3">
                <h1 className="type-literary-title text-content sm:type-literary-title-lg">{work.title}</h1>
                <a href={withLang(`/u/${encodeURIComponent(work.authorId)}`, locale)} className="ink-focus flex items-center gap-2 type-caption font-extrabold text-primary no-underline">
                  <PlayerIdentity name={author.replace(/^@/, '')} size={24} />
                  {author}
                </a>
                <div className="flex flex-wrap gap-2">
                  {genre ? <InkChip tone="muted">{genre}</InkChip> : null}
                  {status ? <InkChip tone={work.completionStatus === 'complete' ? 'success' : 'done'}>{status}</InkChip> : null}
                  <InkChip tone="muted">{copy.chapters(work.publishedChapterCount)}</InkChip>
                </div>
              </div>
            </header>

            {work.synopsis ? (
              <section className="mt-8">
                <Kicker as="h2">{copy.synopsis}</Kicker>
                <p className="mt-2 whitespace-pre-line type-literary-small text-content">{work.synopsis}</p>
              </section>
            ) : null}

            <section className="mt-8">
              <Kicker as="h2">{copy.index}</Kicker>
              <ol className="mt-2 list-none p-0">
                {work.chapters.map((chapter, i) => {
                  const label = chapter.title || copy.chapterN(i + 1);
                  const open = i === 0;
                  return (
                    <li key={chapter.id} className="border-b border-divider">
                      <a
                        href={open ? '#capitulo-1' : withLang(`/w/${encodeURIComponent(work.id)}/c/${encodeURIComponent(chapter.id)}`, locale)}
                        className="ink-focus flex min-h-[52px] items-center gap-3 py-3 no-underline"
                      >
                        <span className="w-6 type-caption font-extrabold text-tertiary">{i + 1}</span>
                        <span className="flex-1 font-literary font-bold text-content">{label}</span>
                        <span className="type-caption text-secondary">{open ? copy.open : copy.withAccount}</span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </section>

            {freeChapter && !freeChapter.locked ? (
              <section id="capitulo-1" className="mt-12 scroll-mt-24">
                <Kicker>{copy.chapterN(1)}</Kicker>
                <h2 className="mt-2 type-literary-title text-content">{freeChapter.title || copy.chapterN(1)}</h2>
                <div className="mt-6">
                  <StoryText text={freeChapter.content} />
                </div>
                <p className="mt-10 text-center type-label text-tertiary">{copy.endOfChapter(1)}</p>
              </section>
            ) : null}

            {next ? (
              <AccountGate workId={work.id} chapterId={next.id} kicker={next.title || copy.chapterN(2)} copy={copy} locale={locale} />
            ) : null}

            <div className="mt-10 border-t border-divider pt-6">
              <InkButton href={withLang('/', locale)} variant="ghost" fullWidth={false}>
                {copy.writeFirst}
              </InkButton>
            </div>
          </article>
        );
      }}
    </LocalizedShell>
  );
}

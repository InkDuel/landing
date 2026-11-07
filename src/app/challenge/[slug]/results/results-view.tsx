'use client';

import { InkButton } from '@/components/ink/ink-button';
import { InkCard } from '@/components/ink/ink-card';
import { InkChip } from '@/components/ink/ink-chip';
import { InkHeadline } from '@/components/ink/ink-headline';
import { Kicker } from '@/components/ink/kicker';
import { PlayerIdentity } from '@/components/ink/player-identity';
import { ReadingNotFound } from '@/components/reading/story-parts';
import { LocalizedShell } from '@/components/shell/localized-shell';
import { formatDate, type Locale, withLang } from '@/lib/i18n';
import type { PublicResults, ResultsAuthor, ResultsEntry } from '@/lib/challenges/results';
import { RESULTS_COPY, type ResultsCopy } from '@/lib/challenges/results-copy';

export type ResultsViewState =
  | { kind: 'ok'; results: PublicResults }
  | { kind: 'not_published' }
  | { kind: 'not_found' };

/** Public page of a story: its duel when we have one, its Historias story otherwise. */
export function entryHref(entry: ResultsEntry): string | null {
  if (entry.duelId) return `/duel/${encodeURIComponent(entry.duelId)}/story/${encodeURIComponent(entry.author.userId)}`;
  if (entry.storyId) return `/story/${encodeURIComponent(entry.storyId)}`;
  return null;
}

const profileHref = (author: ResultsAuthor) => `/u/${encodeURIComponent(author.userId)}`;

function AuthorLink({ author, locale, copy }: { author: ResultsAuthor; locale: Locale; copy: ResultsCopy }) {
  return (
    <a
      href={withLang(profileHref(author), locale)}
      aria-label={copy.viewProfile(author.displayName)}
      className="inline-flex items-center gap-2 type-caption font-extrabold text-primary underline-offset-4 hover:underline"
    >
      <PlayerIdentity name={author.displayName} size={24} />
      {author.displayName}
    </a>
  );
}

function EntryCard({ entry, locale, copy, featured = false }: { entry: ResultsEntry; locale: Locale; copy: ResultsCopy; featured?: boolean }) {
  const href = entryHref(entry);
  return (
    <InkCard tone={featured ? 'brand' : 'quiet'} className="flex flex-col gap-3">
      {entry.firstLine ? (
        <blockquote className={featured ? 'type-literary-body text-content' : 'type-literary-small text-[17px] text-content'}>
          {entry.firstLine}
        </blockquote>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <AuthorLink author={entry.author} locale={locale} copy={copy} />
        {href ? (
          <a href={withLang(href, locale)} className="type-caption font-extrabold text-primary underline underline-offset-4">
            {copy.readStory}
          </a>
        ) : null}
      </div>
    </InkCard>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 pt-10">
      <Kicker as="h2">{title}</Kicker>
      {children}
    </section>
  );
}

function ResultsBody({ results, locale, copy }: { results: PublicResults; locale: Locale; copy: ResultsCopy }) {
  const { jury, favorites, plumaGuia, mentions, next } = results;
  const published = formatDate(results.publishedAt, locale);
  const opens = next ? formatDate(next.opensAt, locale) : '';
  return (
    <article className="mx-auto w-full max-w-[720px] pt-6">
      <header className="flex flex-col gap-3">
        <Kicker>
          {copy.kicker}
          {results.season ? ` · ${copy.seasonLine(results.season.edition, results.season.editionsInSeason)}` : ''}
        </Kicker>
        <InkHeadline text={results.title} size="title-page-lg" />
        {published ? <p className="type-caption text-secondary">{copy.publishedOn(published)}</p> : null}
      </header>

      <Section title={copy.juryTitle}>
        {jury ? (
          <>
            <EntryCard entry={jury.entry} locale={locale} copy={copy} featured />
            {jury.inheritedLine ? (
              <p className="type-caption text-secondary">
                {copy.juryInherited}:{' '}
                <mark className="ink-highlight font-extrabold text-primary">{jury.inheritedLine}</mark>
              </p>
            ) : null}
          </>
        ) : (
          <p className="type-body text-secondary">{copy.juryDeserted}</p>
        )}
      </Section>

      <Section title={copy.favoritesTitle}>
        {favorites.length > 0 ? (
          <>
            <div>
              <InkChip tone="done">{copy.favoritesBadge}</InkChip>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {favorites.map((entry) => (
                <li key={entry.entryId} className="list-none">
                  <EntryCard entry={entry} locale={locale} copy={copy} />
                </li>
              ))}
            </ul>
            <p className="type-caption text-secondary">{copy.favoritesNote}</p>
          </>
        ) : (
          <p className="type-body text-secondary">{copy.favoritesNone}</p>
        )}
      </Section>

      {plumaGuia ? (
        <Section title={copy.plumaTitle}>
          <InkCard className="flex flex-col gap-2">
            <AuthorLink author={plumaGuia} locale={locale} copy={copy} />
            <p className="type-caption text-secondary">{copy.plumaBody}</p>
          </InkCard>
        </Section>
      ) : null}

      {mentions.length > 0 ? (
        <Section title={copy.mentionsTitle}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {mentions.map((entry) => (
              <li key={entry.entryId} className="list-none">
                <EntryCard entry={entry} locale={locale} copy={copy} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {next?.openingLine ? (
        <Section title={copy.nextTitle}>
          <InkCard tone="outlined" className="flex flex-col gap-2">
            <p className="type-literary-body text-content">
              {copy.nextLead}{' '}
              <mark className="ink-highlight">{`“${next.openingLine.text}”`}</mark>
            </p>
            <p className="type-caption text-secondary">
              {next.openingLine.kind === 'inherited' ? copy.nextInherited(next.openingLine.authorDisplayName) : copy.nextHouse}
              {opens ? ` · ${copy.nextOpens(opens)}` : ''}
            </p>
          </InkCard>
        </Section>
      ) : null}

      <div className="mt-10 border-t border-divider pt-8">
        <InkButton href={withLang('/', locale)} className="sm:w-auto sm:min-w-[260px]">
          {copy.cta}
        </InkButton>
      </div>
    </article>
  );
}

export function ResultsView({
  state,
  initialLocale,
  resolveOnClient,
}: {
  state: ResultsViewState;
  initialLocale: Locale;
  resolveOnClient: boolean;
}) {
  return (
    <LocalizedShell initialLocale={initialLocale} resolveOnClient={resolveOnClient} context="product" width="wide">
      {(locale) => {
        const copy = RESULTS_COPY[locale];
        if (state.kind === 'ok') return <ResultsBody results={state.results} locale={locale} copy={copy} />;
        const waiting = state.kind === 'not_published';
        return (
          <div className="mx-auto w-full max-w-[720px]">
            <ReadingNotFound
              title={waiting ? copy.waitingTitle : copy.notFoundTitle}
              body={waiting ? copy.waitingBody : copy.notFoundBody}
              homeHref={withLang('/', locale)}
              homeLabel={copy.goHome}
            />
          </div>
        );
      }}
    </LocalizedShell>
  );
}

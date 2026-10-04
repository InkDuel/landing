'use client';

import { InkButton } from '@/components/ink/ink-button';
import { InkCard } from '@/components/ink/ink-card';
import { Kicker } from '@/components/ink/kicker';
import { PlayerIdentity } from '@/components/ink/player-identity';
import { ReadingNotFound } from '@/components/reading/story-parts';
import { LocalizedShell } from '@/components/shell/localized-shell';
import { type Locale, withLang } from '@/lib/i18n';
import { leagueFromRankTier, leagueLabel } from '@/lib/league';

import { PROFILE_COPY } from './profile-copy';

export type ProfileViewData = {
  username: string;
  description: string;
  rankTier: string;
  rankDivision: number;
  wins: number;
  losses: number;
  bestStreak: number;
  writerLevel: number;
};

export function ProfileView({
  user,
  userId,
  initialLocale,
  resolveOnClient,
}: {
  user: ProfileViewData | null;
  userId: string;
  initialLocale: Locale;
  resolveOnClient: boolean;
}) {
  return (
    <LocalizedShell initialLocale={initialLocale} resolveOnClient={resolveOnClient} context="arena" width="product">
      {(locale) => {
        const copy = PROFILE_COPY[locale];
        if (!user) {
          return (
            <ReadingNotFound
              title={copy.notFoundTitle}
              body={copy.notFoundBody}
              homeHref={withLang('/', locale)}
              homeLabel={copy.goHome}
            />
          );
        }

        const league = leagueFromRankTier(user.rankTier);
        const leagueName = league ? leagueLabel(league, user.rankDivision, locale) : null;
        const played = user.wins + user.losses;
        const winRate = played > 0 ? Math.round((user.wins / played) * 100) : 0;
        const stats = [
          { label: copy.wins, value: String(user.wins) },
          { label: copy.winRate, value: `${winRate}%` },
          { label: copy.bestStreak, value: String(user.bestStreak) },
          { label: copy.writerLevel, value: String(user.writerLevel) },
        ];

        return (
          <div className="flex flex-col gap-6 pt-4">
            {/* Identity */}
            <header className="flex flex-col items-center gap-4 text-center">
              <PlayerIdentity name={user.username} rankTier={user.rankTier} size={96} emphasis="primary" />
              <h1 className="type-title-page break-all text-primary">{user.username}</h1>
              {user.description ? (
                <p className="max-w-[46ch] type-literary-small italic text-content whitespace-pre-line break-words">
                  <span className="sr-only">{copy.bio}: </span>
                  {user.description}
                </p>
              ) : null}
            </header>

            {/* Compact rank, no pencil (perfil ajeno). */}
            {league && leagueName ? (
              <div data-league={league}>
                <InkCard tone="outlined" fill="bg-league-tint" className="flex items-center gap-3">
                  <span aria-hidden="true" className="size-3 shrink-0 rounded-full border-quiet border-outline bg-league" />
                  <div className="min-w-0">
                    <Kicker>{copy.league}</Kicker>
                    <p className="type-title-section text-primary">{leagueName}</p>
                  </div>
                </InkCard>
              </div>
            ) : null}

            {/* Stats */}
            <section aria-label={copy.stats}>
              <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map((stat) => (
                  <InkCard key={stat.label} padding="p-3" className="flex flex-col-reverse gap-1">
                    <dt className="type-caption text-secondary">{stat.label}</dt>
                    <dd className="m-0 type-numeric text-[24px] text-primary">{stat.value}</dd>
                  </InkCard>
                ))}
              </dl>
            </section>

            {/* Actions */}
            <div className="flex flex-col items-stretch gap-2 pt-2">
              <InkButton href={`inkduel://profile/${encodeURIComponent(userId)}`}>{copy.openInApp}</InkButton>
              <InkButton href={withLang('/', locale)} variant="ghost" fullWidth={false} className="self-center">
                {copy.join}
              </InkButton>
            </div>
          </div>
        );
      }}
    </LocalizedShell>
  );
}

'use client';

import { cx } from '@/components/ink/cx';
import { PencilTrack } from '@/components/ink/pencil-track';
import { PlayerIdentity } from '@/components/ink/player-identity';
import type { Locale } from '@/lib/i18n';
import { LEAGUE_ORDER, leagueFromRankTier, leagueLabel } from '@/lib/league';
import type { ProfileUser } from '@/lib/session/models';
import { SESSION_COPY } from '@/lib/session/copy';
import { SOCIAL_LABELS, type SocialPlatform, socialProfileUrl } from '@/lib/social';

// Pieces of Perfil (11), ported from features/profile/presentation/pages/
// profile_page.dart: identity, rank card, level, stats and social links.

function SocialGlyph({ platform }: { platform: SocialPlatform }) {
  if (platform === 'x') return <span className="font-ui text-[15px] font-black leading-none">X</span>;
  if (platform === 'instagram') {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 3c.5 3 2.5 4.5 5 4.5" />
    </svg>
  );
}

function SocialLinks({ user, label }: { user: ProfileUser; label: string }) {
  const links = (
    [
      ['instagram', user.instagramHandle],
      ['x', user.xHandle],
      ['tiktok', user.tiktokHandle],
    ] as const
  )
    .map(([platform, handle]) => ({ platform, url: handle ? socialProfileUrl(platform, handle) : null }))
    .filter((link): link is { platform: SocialPlatform; url: string } => link.url !== null);
  if (links.length === 0) return null;
  return (
    <ul aria-label={label} className="m-0 mt-2 flex list-none gap-2 p-0">
      {links.map((link) => (
        <li key={link.platform}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={SOCIAL_LABELS[link.platform]}
            title={SOCIAL_LABELS[link.platform]}
            className="ink-focus ink-dim flex size-11 items-center justify-center rounded-full border-brand border-outline bg-surface text-primary"
          >
            <SocialGlyph platform={link.platform} />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ProfileIdentity({ user, locale }: { user: ProfileUser; locale: Locale }) {
  const username = user.username || '—';
  const description = user.description.trim();
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <PlayerIdentity name={username} rankTier={user.rankTier} size={96} emphasis="primary" />
        <div className="min-w-0 flex-1">
          <h1 className="font-ui text-[27px] font-extrabold leading-[1.1] tracking-[-0.01em] break-all text-primary">
            {username}
          </h1>
          <SocialLinks user={user} label={SESSION_COPY[locale].profile.socialLabel} />
        </div>
      </div>
      {description ? (
        <p className="type-literary-body text-[17px] leading-[1.45] italic text-content whitespace-pre-line break-words">
          {description}
        </p>
      ) : null}
    </section>
  );
}

/** The app's division math (ranking_card / profile_page): 100 LP a division. */
function rankProgress(user: ProfileUser, locale: Locale) {
  const league = leagueFromRankTier(user.rankTier) ?? 'aprendiz';
  const division = user.rankDivision || 1;
  const isMax = league === 'leyenda' && division === 3;
  const inDivision = Math.min(Math.max(user.rankPoints, 0), 1799) % 100;
  let nextLabel: string | null = null;
  let nextRoman: string | null = null;
  if (!isMax) {
    if (division < 3) {
      nextLabel = leagueLabel(league, division + 1, locale);
      nextRoman = ['I', 'II', 'III'][division];
    } else {
      const index = LEAGUE_ORDER.indexOf(league);
      if (index >= 0 && index < LEAGUE_ORDER.length - 1) {
        nextLabel = leagueLabel(LEAGUE_ORDER[index + 1], 1, locale);
        nextRoman = 'I';
      }
    }
  }
  return {
    league,
    title: leagueLabel(league, division, locale),
    isMax,
    progress: isMax ? 1 : inDivision / 100,
    needed: isMax ? 0 : 100 - inDivision,
    nextLabel,
    nextRoman,
  };
}

/** Rank card: league tint, brand outline and lift; the pencil only on your own profile. */
export function RankCard({ user, locale, own }: { user: ProfileUser; locale: Locale; own: boolean }) {
  const copy = SESSION_COPY[locale].profile;
  const rank = rankProgress(user, locale);
  const caption = rank.isMax || !rank.nextLabel ? copy.maxRank : copy.toNext(rank.needed, rank.nextLabel);
  return (
    <section
      data-league={rank.league}
      className={cx(
        'rounded-[18px] border-brand border-outline bg-league-tint ink-shadow-lift',
        own ? 'px-[18px] py-[15px]' : 'px-[18px] pt-[13px] pb-[14px]',
      )}
    >
      <p className="type-label text-[11px] text-secondary">{copy.rankKicker}</p>
      <div className="mt-1 flex items-baseline gap-3">
        <h2 className="flex-1 type-title-page text-[29px] leading-[1.05] text-primary">{rank.title}</h2>
        <span className="type-title-section text-[20px] text-primary">{copy.lp(user.rankPoints)}</span>
      </div>
      {own ? (
        <>
          <PencilTrack
            className="mt-2"
            progress={rank.progress}
            stroke="league"
            goalLabel={rank.nextRoman ?? undefined}
            label={`${copy.lp(user.rankPoints)} · ${caption}`}
          />
          <p className="mt-2 type-caption text-secondary">{caption}</p>
        </>
      ) : null}
    </section>
  );
}

/** Writer level with the XP bar (own profile). */
export function LevelBar({ user, locale }: { user: ProfileUser; locale: Locale }) {
  const copy = SESSION_COPY[locale].profile;
  const total = user.writerXpForNextLevel;
  const progress = total > 0 ? Math.min(1, user.writerXpInLevel / total) : 0;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline gap-3">
        <h2 className="flex-1 font-ui text-[15px] font-extrabold text-primary">{copy.writerLevel(user.writerLevel)}</h2>
        <span className="type-caption tabular-nums text-secondary">{copy.xp(user.writerXpInLevel, total)}</span>
      </div>
      <progress
        className="sr-only"
        value={user.writerXpInLevel}
        max={Math.max(total, 1)}
        aria-label={copy.writerLevel(user.writerLevel)}
      />
      <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-[3px] bg-[var(--ink-arena-dot)]">
        <span className="block h-full bg-[var(--ink-brand-blue)]" style={{ width: `${(progress * 100).toFixed(1)}%` }} />
      </span>
    </section>
  );
}

export function ProfileStats({ user, locale, own }: { user: ProfileUser; locale: Locale; own: boolean }) {
  const copy = SESSION_COPY[locale].profile;
  const total = user.wins + user.losses;
  const winRate = total > 0 ? Math.round((user.wins / total) * 100) : 0;
  const stats = [
    { value: String(total), label: copy.duels },
    { value: String(user.wins), label: copy.won },
    { value: String(user.losses), label: copy.lost },
    { value: copy.winRateValue(winRate), label: copy.winRate },
  ];
  const line = [
    ...(own ? [] : [[copy.writerLevelLabel, user.writerLevel] as const]),
    [copy.currentStreak, user.currentStreak] as const,
    [copy.bestStreak, user.bestStreak] as const,
  ];
  return (
    <section className="flex flex-col gap-3">
      <dl className="m-0 grid grid-cols-4 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="flex min-w-0 flex-col-reverse gap-[5px]">
            <dt className="truncate type-caption text-secondary">{stat.label}</dt>
            <dd className="m-0 type-title-page text-[27px] leading-none tabular-nums text-primary">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <p className="type-body text-[13.5px] text-secondary">
        {line.map(([label, value], index) => (
          <span key={label}>
            {index > 0 ? ' · ' : ''}
            {label} <span className="font-extrabold text-primary">{value}</span>
          </span>
        ))}
      </p>
    </section>
  );
}

/**
 * Perfil composition. Mobile is a single column (own: identity → rank →
 * level → stats; other: identity → rank → stats → Obras). From desktop the
 * same pieces split in two: identity, bio and links on the left; rank,
 * progress, level and stats on the right; Obras and the footer below, full
 * width.
 *
 * Web-specific (founder decision, 2026-10-04): on another writer's profile
 * the stats come before Obras, unlike the app. Rank and stats are the
 * finite summary of the person; Obras is an infinite feed and goes last,
 * so its pages never push the stats down.
 */
const LAYOUT = {
  own: cx(
    "grid [grid-template-areas:'identity'_'rank'_'level'_'stats'_'footer']",
    'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_auto_1fr_auto] lg:gap-x-14',
    "lg:[grid-template-areas:'identity_rank'_'identity_level'_'identity_stats'_'footer_footer']",
  ),
  other: cx(
    "grid [grid-template-areas:'identity'_'rank'_'stats'_'works']",
    'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr_auto] lg:gap-x-14',
    "lg:[grid-template-areas:'identity_rank'_'identity_stats'_'works_works']",
  ),
};

function Slot({ area, children }: { area: string; children: React.ReactNode }) {
  if (!children) return null;
  // Spacing lives on the slots (24 px under each), so an absent area adds no gap.
  return <div className={cx('min-w-0 self-start pb-6', area)}>{children}</div>;
}

export function ProfileLayout({
  variant,
  identity,
  rank,
  level,
  works,
  stats,
  footer,
}: {
  variant: 'own' | 'other';
  identity: React.ReactNode;
  rank: React.ReactNode;
  level?: React.ReactNode;
  works?: React.ReactNode;
  stats: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className={cx(LAYOUT[variant], 'pt-4 lg:pt-8')}>
      <Slot area="[grid-area:identity]">{identity}</Slot>
      <Slot area="[grid-area:rank]">{rank}</Slot>
      {variant === 'own' ? <Slot area="[grid-area:level]">{level}</Slot> : null}
      {variant === 'other' ? <Slot area="[grid-area:works] lg:pt-6">{works}</Slot> : null}
      <Slot area="[grid-area:stats]">{stats}</Slot>
      {variant === 'own' ? <Slot area="[grid-area:footer]">{footer}</Slot> : null}
    </div>
  );
}

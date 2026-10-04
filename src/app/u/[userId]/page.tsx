import type { Metadata } from 'next';

import { leagueFromRankTier, leagueLabel } from '@/lib/league';
import { fetchPublicUser } from '@/lib/public-api';
import { resolveRequestLocale } from '@/lib/request-locale';

import { PROFILE_COPY } from './profile-copy';
import { ProfileView } from './profile-view';

type Props = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ userId }, { lang }] = await Promise.all([params, searchParams]);
  const [user, { locale }] = await Promise.all([fetchPublicUser(userId), resolveRequestLocale(lang)]);
  const copy = PROFILE_COPY[locale];
  if (!user) {
    return { title: copy.metaNotFound };
  }
  const league = leagueFromRankTier(user.rankTier);
  const leagueName = league ? leagueLabel(league, user.rankDivision, locale) : user.rankTier;
  return {
    title: copy.metaTitle(user.username),
    description: copy.metaDescription(leagueName),
    openGraph: {
      title: copy.metaTitle(user.username),
      description: copy.ogDescription(leagueName, user.wins, user.writerLevel),
      type: 'profile',
      url: `https://inkduel.com/u/${encodeURIComponent(userId)}`,
    },
  };
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const [{ userId }, { lang }] = await Promise.all([params, searchParams]);
  const [user, { locale, explicit }] = await Promise.all([fetchPublicUser(userId), resolveRequestLocale(lang)]);

  return (
    <ProfileView
      userId={userId}
      initialLocale={locale}
      resolveOnClient={!explicit}
      user={
        user
          ? {
              username: user.username,
              description: user.description,
              rankTier: user.rankTier,
              rankDivision: user.rankDivision,
              wins: user.wins,
              losses: user.losses,
              bestStreak: user.bestStreak,
              writerLevel: user.writerLevel,
            }
          : null
      }
    />
  );
}

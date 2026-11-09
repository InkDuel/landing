import type { Metadata } from 'next';

import { fetchPublicChallengeResults } from '@/lib/challenges/results-api';
import { RESULTS_COPY } from '@/lib/challenges/results-copy';
import { resolveRequestLocale } from '@/lib/request-locale';

import { ResultsView } from './results-view';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

// Metadata never names an author, before or after publication.
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, { lang }] = await Promise.all([params, searchParams]);
  const { locale } = await resolveRequestLocale(lang);
  const outcome = await fetchPublicChallengeResults(slug, locale);
  const copy = RESULTS_COPY[locale];
  if (outcome.kind === 'not_found') return { title: copy.metaNotFound, robots: { index: false } };
  if (outcome.kind === 'not_published') return { title: copy.metaWaitingTitle, robots: { index: false } };
  const title = copy.metaTitle(outcome.results.title);
  return {
    title,
    description: copy.metaDescription,
    openGraph: {
      title,
      description: copy.metaDescription,
      type: 'website',
      url: `https://inkduel.com/challenge/${encodeURIComponent(slug)}/results`,
    },
  };
}

export default async function ChallengeResultsPage({ params, searchParams }: Props) {
  const [{ slug }, { lang }] = await Promise.all([params, searchParams]);
  const { locale, explicit } = await resolveRequestLocale(lang);
  const outcome = await fetchPublicChallengeResults(slug, locale);
  return <ResultsView state={outcome} initialLocale={locale} resolveOnClient={!explicit} />;
}

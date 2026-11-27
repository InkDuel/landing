import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { fetchPublicWork, fetchPublicWorkChapter, PublicApiUnavailableError } from '@/lib/public-api';
import { resolveRequestLocale } from '@/lib/request-locale';

import { WORK_COPY } from './work-copy';
import { WorkPublicView } from './work-public-view';

type Props = {
  params: Promise<{ workId: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

const workUrl = (workId: string) => `https://inkduel.com/w/${encodeURIComponent(workId)}`;

function unavailableAsNull(error: unknown): null {
  if (error instanceof PublicApiUnavailableError) return null;
  throw error;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ workId }, { lang }] = await Promise.all([params, searchParams]);
  const [work, { locale }] = await Promise.all([fetchPublicWork(workId).catch(unavailableAsNull), resolveRequestLocale(lang)]);
  const copy = WORK_COPY[locale];
  if (!work) {
    // Unavailable backend (the page itself will raise the error) or a missing work: neither is indexed.
    return { title: copy.metaNotFound, robots: { index: false, follow: false } };
  }
  const description = work.synopsis ? work.synopsis.slice(0, 200) : copy.ogDescription(work.authorDisplayName);
  const title = `${work.title} — ${work.authorDisplayName} · InkDuel`;
  return {
    title,
    description,
    alternates: { canonical: workUrl(workId) },
    // Founder decision F3 (2026-11-26): public works are indexed.
    robots: { index: true, follow: true },
    openGraph: { title, description, type: 'book', url: workUrl(workId) },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function WorkPage({ params, searchParams }: Props) {
  const [{ workId }, { lang }] = await Promise.all([params, searchParams]);
  // Missing work: a real 404. Backend unavailable: fetchPublicWork throws and Next serves error.tsx with a 500.
  const [work, { locale, explicit }] = await Promise.all([fetchPublicWork(workId), resolveRequestLocale(lang)]);
  if (!work) notFound();
  const freeChapter = work.freeChapterId ? await fetchPublicWorkChapter(workId, work.freeChapterId) : null;
  return <WorkPublicView work={work} freeChapter={freeChapter} initialLocale={locale} resolveOnClient={!explicit} />;
}

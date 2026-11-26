import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { fetchPublicWork, fetchPublicWorkChapter } from '@/lib/public-api';
import { resolveRequestLocale } from '@/lib/request-locale';

import { WORK_COPY } from '../../work-copy';
import { LockedChapterView } from './locked-chapter-view';

type Props = {
  params: Promise<{ workId: string; chapterId: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

// A locked chapter page only asks for an account: Google would see no text, so
// it is never indexed. The free chapter lives on the ficha itself.
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ workId }, { lang }] = await Promise.all([params, searchParams]);
  const [work, { locale }] = await Promise.all([fetchPublicWork(workId), resolveRequestLocale(lang)]);
  const copy = WORK_COPY[locale];
  return {
    title: work ? `${work.title} — InkDuel` : copy.metaNotFound,
    robots: { index: false, follow: true },
    alternates: work ? { canonical: `https://inkduel.com/w/${encodeURIComponent(workId)}` } : undefined,
  };
}

export default async function WorkChapterPage({ params, searchParams }: Props) {
  const [{ workId, chapterId }, { lang }] = await Promise.all([params, searchParams]);
  const [work, chapter, { locale, explicit }] = await Promise.all([
    fetchPublicWork(workId),
    fetchPublicWorkChapter(workId, chapterId),
    resolveRequestLocale(lang),
  ]);
  if (work && chapter && !chapter.locked) {
    redirect(`/w/${encodeURIComponent(workId)}#capitulo-1`);
  }
  return <LockedChapterView work={work} chapter={chapter} initialLocale={locale} resolveOnClient={!explicit} />;
}

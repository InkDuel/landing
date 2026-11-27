import { resolveRequestLocale } from '@/lib/request-locale';

import { WorkPublicView } from './work-public-view';

// notFound() from the work and chapter pages: a real HTTP 404.
export default async function WorkNotFound() {
  const { locale, explicit } = await resolveRequestLocale(undefined);
  return <WorkPublicView work={null} freeChapter={null} initialLocale={locale} resolveOnClient={!explicit} />;
}

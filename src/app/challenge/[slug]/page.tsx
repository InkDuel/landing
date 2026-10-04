import { resolveRequestLocale } from '@/lib/request-locale';

import ChallengeTermsClient from './challenge-terms-client';

// Featured challenge terms («Bases y condiciones», featured-challenges-v1).
// Every challenge's termsUrl points here; the slug does not change the text.
type ChallengeTermsPageProps = {
  searchParams: Promise<{ lang?: string | string[] }>;
};

export default async function ChallengeTermsPage({ searchParams }: ChallengeTermsPageProps) {
  const { lang } = await searchParams;
  const { locale, explicit } = await resolveRequestLocale(lang);

  return <ChallengeTermsClient initialLocale={locale} resolveLocaleOnClient={!explicit} />;
}

import ChallengeTermsClient, { type Locale } from './challenge-terms-client';

type ChallengeTermsPageProps = {
  searchParams?: Promise<{
    lang?: string | string[];
  }>;
};

const getQueryLocale = (value: string | string[] | undefined): Locale | null => {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === 'es' || candidate === 'en' || candidate === 'pt') {
    return candidate;
  }

  return null;
};

export default async function ChallengeTermsPage({ searchParams }: ChallengeTermsPageProps) {
  const resolvedSearchParams = await searchParams;
  const queryLocale = getQueryLocale(resolvedSearchParams?.lang);

  return (
    <ChallengeTermsClient
      initialLocale={queryLocale ?? 'en'}
      resolveLocaleOnClient={queryLocale === null}
    />
  );
}

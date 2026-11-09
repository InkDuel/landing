import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import fixture from './__fixtures__/public_results.json';
import { fetchPublicChallengeResults, publicResultsUrl } from './results-api';

afterEach(() => vi.unstubAllGlobals());

describe('fetchPublicChallengeResults', () => {
  it('sends the locale in the URL, so es and en use different cache entries', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await fetchPublicChallengeResults('consigna-t1-e3', 'es');
    await fetchPublicChallengeResults('consigna-t1-e3', 'en');
    const urls = fetchMock.mock.calls.map((call) => String((call as unknown[])[0]));
    expect(urls[0]).toMatch(/\/public\/challenges\/consigna-t1-e3\/results\?lang=es$/);
    expect(urls[1]).toMatch(/\?lang=en$/);
    expect(urls[0]).not.toBe(urls[1]);
    expect((fetchMock.mock.calls[0] as unknown[])[1]).toMatchObject({ next: { revalidate: 60 } });
  });

  it('encodes the slug', () => {
    expect(publicResultsUrl('a/b', 'pt')).toContain('/challenges/a%2Fb/results?lang=pt');
  });
});

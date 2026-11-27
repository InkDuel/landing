import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchPublicWork, fetchPublicWorkChapter, PublicApiUnavailableError, bucketed } from './public-api';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const GOOD = { id: 'w1', title: 'T', chapters: [], coverUrl: 'https://storage.googleapis.com/inkduel-4540e.firebasestorage.app/covers/public/w1/c.jpg' };

afterEach(() => vi.unstubAllGlobals());

describe('public works API: missing vs unavailable', () => {
  it('a 404 or 410 is "does not exist" (null)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({}, 404)).mockResolvedValueOnce(json({}, 410)));
    expect(await fetchPublicWork('w1')).toBeNull();
    expect(await fetchPublicWorkChapter('w1', 'c1')).toBeNull();
  });

  it.each([500, 502, 503, 429])('status %i is unavailable, never "missing"', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, status)));
    await expect(fetchPublicWork('w1')).rejects.toBeInstanceOf(PublicApiUnavailableError);
    await expect(fetchPublicWorkChapter('w1', 'c1')).rejects.toBeInstanceOf(PublicApiUnavailableError);
  });

  it('network failures and unreadable bodies are unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(new Response('<html>', { status: 200 })));
    await expect(fetchPublicWork('w1')).rejects.toBeInstanceOf(PublicApiUnavailableError);
    await expect(fetchPublicWork('w1')).rejects.toBeInstanceOf(PublicApiUnavailableError);
  });

  it('a 200 with a foreign cover keeps the work and drops the cover', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ...GOOD, coverUrl: 'https://storage.googleapis.com/other/covers/public/x.jpg', coverThumbUrl: GOOD.coverUrl })));
    const work = await fetchPublicWork('w1');
    expect(work?.coverUrl).toBe('');
    expect(work?.coverThumbUrl).toBe(GOOD.coverUrl);
  });

  it('puts the time bucket in the cache key so a stale 200 cannot outlive its window', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(GOOD));
    vi.stubGlobal('fetch', fetchMock);
    await fetchPublicWork('w1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/public\/works\/w1\?cb=\d+$/);
    expect(init).toEqual({ next: { revalidate: 300 } });
    expect(bucketed('/p', 300, 299_000)).toBe('/p?cb=0');
    expect(bucketed('/p', 300, 300_000)).toBe('/p?cb=1');
    expect(bucketed('/p?x=1', 300, 300_000)).toBe('/p?x=1&cb=1');
  });
});

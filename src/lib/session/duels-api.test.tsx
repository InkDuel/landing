import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './api';
import { duelsApi, duelErrorCode } from './duels';
vi.mock('./firebase', () => ({ getFirebaseAuth: () => ({ currentUser: { getIdToken: async () => 'test-user-token' } }) }));
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('Existing HTTP contracts', () => {
  it('uses the existing authenticated API client, locales and encoded IDs for story submission', async () => {
    fetchMock.mockResolvedValue(response({ state: 'evaluating' }));
    await duelsApi.submit('duel #1', 'Mi relato', 'es');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://inkduel-backend-production.up.railway.app/api/duel/duel%20%231/story');
    expect(options?.method).toBe('POST');
    expect(options?.credentials).toBe('omit');
    expect(options?.headers).toMatchObject({ Authorization: 'Bearer test-user-token', 'Accept-Language': 'es' });
    expect(JSON.parse(options?.body as string)).toEqual({ story: 'Mi relato' });
  });
  it('maps only a pending 404 to no game; errors remain errors', async () => {
    fetchMock.mockResolvedValueOnce(response({}, 404)).mockResolvedValueOnce(response({}, 503));
    expect(await duelsApi.pending('es')).toBeNull();
    await expect(duelsApi.pending('es')).rejects.toMatchObject({ status: 503 });
  });
  it('uses the Flutter prepare payload and nested prompt contract', async () => {
    fetchMock.mockResolvedValue(
      response({
        draft: { draftId: 's', prompt: { text: 'Idea' }, writingStartedAt: '2026-10-10T12:00:00Z', writingEndsAt: '2026-10-10T12:05:00Z' },
      }),
    );
    const result = await duelsApi.prepare('request-1', 'es');
    expect(result.draft?.prompt).toBe('Idea');
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ clientRequestId: 'request-1' });
  });
  it('sends the server cursor for another profile and parses the actual response keys', async () => {
    fetchMock.mockResolvedValue(response({ duels: [{ id: 'd' }], cursor: 'next' }));
    const page = await duelsApi.history('writer #1', 'pt', 'cursor #2');
    expect(fetchMock.mock.calls[0][0]).toContain('/api/duel/user/writer%20%231?cursor=cursor+%232');
    expect(page.nextCursor).toBe('next');
  });
  it('surfaces known Ranked machine codes without exposing arbitrary backend messages', async () => {
    fetchMock
      .mockResolvedValueOnce(response({ error: 'ranked_async_disabled' }, 403))
      .mockResolvedValueOnce(response({ error: 'sensitive unexpected text' }, 403));
    try {
      await duelsApi.drain('es');
    } catch (e) {
      expect(duelErrorCode(e)).toBe('ranked_async_disabled');
    }
    try {
      await duelsApi.drain('es');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect(duelErrorCode(e)).toBe('');
    }
  });
  it('preserves existing chapter conflict snapshots', async () => {
    const conflict = { revision: 3, content: 'El texto propio' };
    fetchMock.mockResolvedValue(response(conflict, 409));
    await expect(apiRequest('PATCH', '/api/works/w/chapters/c', { locale: 'es' })).rejects.toMatchObject({ data: conflict });
  });
  it('never substitutes a local draft for a malformed server payload', async () => {
    fetchMock.mockResolvedValue(response({ draft: { draftId: 's', prompt: { text: 'Idea' } } }));
    await expect(duelsApi.activeDraft('es')).rejects.toMatchObject({ kind: 'parse' });
  });
});

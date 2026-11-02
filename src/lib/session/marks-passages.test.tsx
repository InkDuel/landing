import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parsePublicChapter } from './models';
import { ApiError } from './api';
import { inkMarksApi, isPassageChanged, isPassagesUnavailable, parseWorkRepliesReceived } from './marks';
import { receivedMarkHref } from '@/components/session/received-marks';

vi.mock('./firebase', () => ({ getFirebaseAuth: () => ({ currentUser: { getIdToken: async () => 'test-user-token' } }) }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fetchMock = vi.fn<typeof fetch>();
const lastRequest = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return { url: new URL(url), method: init.method, body: init.body ? JSON.parse(String(init.body)) : undefined };
};

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('contract: chapter and summary', () => {
  it('reads the chapter revision, and null when the backend does not send one', () => {
    expect(parsePublicChapter({ id: 'c', content: 'x', revision: 12 })?.revision).toBe(12);
    expect(parsePublicChapter({ id: 'c', content: 'x', revision: 0 })?.revision).toBe(0);
    expect(parsePublicChapter({ id: 'c', content: 'x' })?.revision).toBeNull();
    expect(parsePublicChapter({ id: 'c', content: 'x', revision: '12' })?.revision).toBeNull();
  });

  it('parses summary.passages, and none when absent or malformed', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        markCount: 2,
        rootCount: 1,
        canMark: false,
        passages: { paragraphKeys: ['a', 'b', 'a'], markedKeys: ['b'], maxQuoteRunes: 300, chapterRevision: 12 },
      }),
    );
    expect(await inkMarksApi.summary('w1', 'c1', { locale: 'es' })).toEqual({
      markCount: 2,
      rootCount: 1,
      canMark: false,
      passages: { paragraphKeys: ['a', 'b', 'a'], markedKeys: ['b'], maxQuoteRunes: 300, chapterRevision: 12 },
    });
    fetchMock.mockResolvedValueOnce(json({ markCount: 0, rootCount: 0, canMark: true }));
    expect((await inkMarksApi.summary('w1', 'c1', { locale: 'es' })).passages).toBeNull();
    fetchMock.mockResolvedValueOnce(json({ canMark: true, passages: { paragraphKeys: ['a', 7], markedKeys: [], chapterRevision: 1 } }));
    expect((await inkMarksApi.summary('w1', 'c1', { locale: 'es' })).passages).toBeNull();
    fetchMock.mockResolvedValueOnce(json({ canMark: true, passages: { paragraphKeys: ['a'], markedKeys: [] } }));
    expect((await inkMarksApi.summary('w1', 'c1', { locale: 'es' })).passages).toBeNull();
  });
});

describe('contract: roots and the paragraph query', () => {
  it('parses a root passage and drops it from a tombstone', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        items: [
          { id: 'r1', author: { userId: 'u', displayName: 'ana' }, content: 'hola', createdAt: '2026-11-01T10:00:00Z', passage: { paragraphKey: 'k1', located: true, quote: 'una frase' } },
          { id: 'r2', author: { userId: 'u', displayName: 'ana' }, content: 'hola', createdAt: '2026-11-01T10:00:00Z', passage: { paragraphKey: 'k1', located: false } },
          { id: 'r3', isDeleted: true, replyCount: 2, createdAt: '2026-11-01T10:00:00Z', passage: { paragraphKey: 'k1', located: true, quote: 'x' } },
          { id: 'r4', author: { userId: 'u', displayName: 'ana' }, content: 'sin cita', createdAt: '2026-11-01T10:00:00Z' },
        ],
        markCount: 4,
        rootCount: 4,
        canMark: true,
      }),
    );
    const page = await inkMarksApi.roots('w1', 'c1', null, { locale: 'es' });
    expect(page.items.map((item) => item.passage)).toEqual([
      { paragraphKey: 'k1', located: true, quote: 'una frase' },
      { paragraphKey: 'k1', located: false, quote: null },
      null,
      null,
    ]);
  });

  it('asks the server for one paragraph with ?passage= and the cursor', async () => {
    fetchMock.mockResolvedValueOnce(json({ items: [], markCount: 0, rootCount: 0, canMark: true }));
    await inkMarksApi.roots('w1', 'c1', 'cur', { locale: 'es', passage: 'abcdef012345' });
    const { url, method } = lastRequest();
    expect(method).toBe('GET');
    expect(url.pathname).toBe('/api/gallery/works/w1/chapters/c1/ink-marks');
    expect(url.searchParams.get('passage')).toBe('abcdef012345');
    expect(url.searchParams.get('cursor')).toBe('cur');
    fetchMock.mockResolvedValueOnce(json({ items: [], markCount: 0, rootCount: 0, canMark: true }));
    await inkMarksApi.roots('w1', 'c1', null, { locale: 'es' });
    expect(lastRequest().url.searchParams.has('passage')).toBe(false);
  });
});

describe('contract: create', () => {
  const created = { created: true, root: { id: 'r1', createdAt: '2026-11-01T10:00:00Z', content: 'hola' } };

  it('sends passage with the chapter revision on a root, and nothing new without one', async () => {
    fetchMock.mockResolvedValueOnce(json(created, 201));
    await inkMarksApi.create('w1', 'c1', 'req-1', 'hola', null, { locale: 'es' }, { paragraphKey: 'k1', quote: 'una frase', chapterRevision: 0 });
    expect(lastRequest().body).toEqual({
      clientRequestId: 'req-1',
      content: 'hola',
      passage: { paragraphKey: 'k1', quote: 'una frase', chapterRevision: 0 },
    });
    fetchMock.mockResolvedValueOnce(json(created, 201));
    await inkMarksApi.create('w1', 'c1', 'req-2', 'hola', null, { locale: 'es' });
    expect(lastRequest().body).toEqual({ clientRequestId: 'req-2', content: 'hola' });
  });

  it('never sends a passage with a reply', async () => {
    fetchMock.mockResolvedValueOnce(json({ created: true, reply: { id: 'p1', createdAt: '2026-11-01T10:00:00Z', content: 'x', author: {} } }, 201));
    await inkMarksApi.create('w1', 'c1', 'req-3', 'x', 'r1', { locale: 'es' }, { paragraphKey: 'k1', quote: 'q', chapterRevision: 1 });
    expect(lastRequest().body).toEqual({ clientRequestId: 'req-3', content: 'x', parentId: 'r1' });
  });

  it('tells passage_changed (409) from the idempotency 409, and passages_unavailable (503) from any 503', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'El capítulo cambió', code: 'passage_changed' }, 409));
    const changed = await inkMarksApi
      .create('w1', 'c1', 'req-4', 'hola', null, { locale: 'es' }, { paragraphKey: 'k1', quote: 'q', chapterRevision: 1 })
      .catch((error: unknown) => error);
    expect(isPassageChanged(changed)).toBe(true);
    expect(isPassagesUnavailable(changed)).toBe(false);

    fetchMock.mockResolvedValueOnce(json({ error: 'Otro contenido' }, 409));
    const idempotency = await inkMarksApi.create('w1', 'c1', 'req-4', 'hola', null, { locale: 'es' }).catch((error: unknown) => error);
    expect(idempotency).toBeInstanceOf(ApiError);
    expect(isPassageChanged(idempotency)).toBe(false);

    fetchMock.mockResolvedValueOnce(json({ error: 'No disponible', code: 'passages_unavailable' }, 503));
    const off = await inkMarksApi
      .create('w1', 'c1', 'req-5', 'hola', null, { locale: 'es' }, { paragraphKey: 'k1', quote: 'q', chapterRevision: 1 })
      .catch((error: unknown) => error);
    expect(isPassagesUnavailable(off)).toBe(true);

    fetchMock.mockResolvedValueOnce(json({ error: 'Apagado' }, 503));
    const writesOff = await inkMarksApi.create('w1', 'c1', 'req-6', 'hola', null, { locale: 'es' }).catch((error: unknown) => error);
    expect((writesOff as ApiError).status).toBe(503);
    expect(isPassagesUnavailable(writesOff)).toBe(false);
  });
});

describe('contract: inbox', () => {
  const row = (extra: Record<string, unknown>) => ({
    id: 'w1',
    author: { userId: 'u', displayName: 'beto' },
    content: 'Respuesta',
    createdAt: '2026-10-16T09:00:00Z',
    rootId: 'm1',
    isWorkAuthor: false,
    work: { id: 'o1', title: 'La casa' },
    chapter: { id: 'ch1', orderIndex: 2, title: 'El sótano' },
    ...extra,
  });

  it('keeps the root quote of a reply row (rootPassage) only when it exists', () => {
    const page = parseWorkRepliesReceived({
      items: [row({ rootPassage: { located: true, quote: 'una frase' } }), row({ id: 'w2' }), row({ id: 'w3', rootPassage: { located: false } })],
    });
    expect(page.items.map((item) => ('passage' in item ? item.passage : undefined))).toEqual([
      { located: true, quote: 'una frase' },
      undefined,
      { located: false, quote: null },
    ]);
  });

  it('a reply link keeps mark={rootId} and adds reply={replyId}; a root link is unchanged', () => {
    const [reply] = parseWorkRepliesReceived({ items: [row({})] }).items;
    expect(receivedMarkHref(reply, 'es')).toBe('/work/o1/chapter/ch1?mark=m1&reply=w1');
    expect(
      receivedMarkHref(
        { source: 'workChapter', id: 'm1', author: { userId: 'u', displayName: 'a' }, content: 'x', createdAt: '2026-10-16T09:00:00Z', workId: 'o1', workTitle: '', chapterId: 'ch1', chapterOrderIndex: 1, chapterTitle: '', rootId: 'm1' },
        'es',
      ),
    ).toBe('/work/o1/chapter/ch1?mark=m1');
  });
});

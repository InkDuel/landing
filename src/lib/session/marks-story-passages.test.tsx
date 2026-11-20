import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api';
import {
  isBareBadRequest,
  isPassageInvalid,
  isPassagesUnavailable,
  parseStoryRepliesReceived,
  storyCommentsApi,
} from './marks';

vi.mock('./firebase', () => ({ getFirebaseAuth: () => ({ currentUser: { getIdToken: async () => 'test-user-token' } }) }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fetchMock = vi.fn<typeof fetch>();
const lastRequest = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return { url: new URL(url), method: init.method, body: init.body ? JSON.parse(String(init.body)) : undefined };
};
const ctx = { locale: 'es' } as const;

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('contract v1 of relatos: summary', () => {
  it('reads counters, permissions and passages (no revision), and ignores unknown fields', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        commentsCount: 3,
        canComment: true,
        canReply: false,
        future: { anything: 1 },
        passages: { paragraphKeys: ['a', 'b', 'a'], markedKeys: ['b'], maxQuoteRunes: 280, extra: true },
      }),
    );
    expect(await storyCommentsApi.summary('d1', 's1', ctx)).toEqual({
      commentsCount: 3,
      canComment: true,
      canReply: false,
      passages: { paragraphKeys: ['a', 'b', 'a'], markedKeys: ['b'], maxQuoteRunes: 280 },
    });
    const { url, method } = lastRequest();
    expect(method).toBe('GET');
    expect(url.pathname).toBe('/api/gallery/stories/d1/s1/comments/summary');
  });

  it('has no passages when absent or malformed, and defaults the limit to 300', async () => {
    fetchMock.mockResolvedValueOnce(json({ commentsCount: 0, canComment: true, canReply: true }));
    expect((await storyCommentsApi.summary('d1', 's1', ctx)).passages).toBeNull();
    fetchMock.mockResolvedValueOnce(json({ canComment: true, passages: { paragraphKeys: ['a', 7], markedKeys: [] } }));
    expect((await storyCommentsApi.summary('d1', 's1', ctx)).passages).toBeNull();
    fetchMock.mockResolvedValueOnce(json({ canComment: true, passages: { markedKeys: [] } }));
    expect((await storyCommentsApi.summary('d1', 's1', ctx)).passages).toBeNull();
    fetchMock.mockResolvedValueOnce(json({ canComment: true, passages: { paragraphKeys: ['a'], markedKeys: ['a'] } }));
    expect((await storyCommentsApi.summary('d1', 's1', ctx)).passages).toEqual({ paragraphKeys: ['a'], markedKeys: ['a'], maxQuoteRunes: 300 });
    fetchMock.mockResolvedValueOnce(json('nope'));
    expect(await storyCommentsApi.summary('d1', 's1', ctx)).toEqual({ commentsCount: 0, canComment: false, canReply: false, passages: null });
  });
});

describe('contract v1 of relatos: list and create', () => {
  const comment = { id: 'c1', author: { userId: 'u', displayName: 'ana' }, content: 'hola', createdAt: '2026-11-01T10:00:00Z' };

  it('lists with ?passage= only when asked, and parses the quote of a root', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        items: [
          { ...comment, passage: { paragraphKey: 'k1', located: true, quote: 'una frase', extra: 1 } },
          { ...comment, id: 'c2', passage: { paragraphKey: 'k1', located: false } },
          { ...comment, id: 'c3' },
        ],
        commentsCount: 3,
        canComment: true,
        canReply: true,
      }),
    );
    const page = await storyCommentsApi.list('d1', 's1', 'cur', { locale: 'es', passage: 'k1' });
    expect(lastRequest().url.searchParams.get('passage')).toBe('k1');
    expect(lastRequest().url.searchParams.get('cursor')).toBe('cur');
    expect(page.items.map((item) => item.passage)).toEqual([
      { paragraphKey: 'k1', located: true, quote: 'una frase' },
      { paragraphKey: 'k1', located: false, quote: null },
      undefined,
    ]);
    fetchMock.mockResolvedValueOnce(json({ items: [], commentsCount: 0, canComment: true, canReply: true }));
    await storyCommentsApi.list('d1', 's1', null, ctx);
    expect(lastRequest().url.searchParams.has('passage')).toBe(false);
  });

  it('sends passage on a root only when given, and nothing new otherwise', async () => {
    fetchMock.mockResolvedValueOnce(json({ comment, commentsCount: 1 }, 201));
    await storyCommentsApi.create('d1', 's1', 'req-1', 'hola', ctx, { paragraphKey: 'k1', quote: 'una frase' });
    expect(lastRequest().body).toEqual({ clientRequestId: 'req-1', content: 'hola', passage: { paragraphKey: 'k1', quote: 'una frase' } });
    fetchMock.mockResolvedValueOnce(json({ comment, commentsCount: 1 }, 201));
    await storyCommentsApi.create('d1', 's1', 'req-2', 'hola', ctx);
    expect(lastRequest().body).toEqual({ clientRequestId: 'req-2', content: 'hola' });
  });

  it('tells the two quote codes from a bare 400 and from any other 503', async () => {
    const quote = { paragraphKey: 'k1', quote: 'q' };
    fetchMock.mockResolvedValueOnce(json({ error: 'x', code: 'passages_unavailable' }, 503));
    const off = await storyCommentsApi.create('d1', 's1', 'r', 'hola', ctx, quote).catch((error: unknown) => error);
    expect(isPassagesUnavailable(off)).toBe(true);
    expect(isPassageInvalid(off)).toBe(false);

    fetchMock.mockResolvedValueOnce(json({ error: 'x', code: 'passage_invalid' }, 400));
    const invalid = await storyCommentsApi.create('d1', 's1', 'r', 'hola', ctx, quote).catch((error: unknown) => error);
    expect(isPassageInvalid(invalid)).toBe(true);
    expect(isBareBadRequest(invalid)).toBe(false);

    fetchMock.mockResolvedValueOnce(json({ error: 'campo desconocido' }, 400));
    const bare = await storyCommentsApi.create('d1', 's1', 'r', 'hola', ctx, quote).catch((error: unknown) => error);
    expect(isBareBadRequest(bare)).toBe(true);
    expect(isPassageInvalid(bare)).toBe(false);

    fetchMock.mockResolvedValueOnce(json({ error: 'Apagado' }, 503));
    const writesOff = await storyCommentsApi.create('d1', 's1', 'r', 'hola', ctx).catch((error: unknown) => error);
    expect((writesOff as ApiError).status).toBe(503);
    expect(isPassagesUnavailable(writesOff)).toBe(false);
  });

  it('a 409 on a quoted create is the idempotency conflict, never a quote code', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'Otro contenido' }, 409));
    const error = await storyCommentsApi.create('d1', 's1', 'r', 'hola', ctx, { paragraphKey: 'k1', quote: 'q' }).catch((e: unknown) => e);
    expect((error as ApiError).status).toBe(409);
    expect(isPassageInvalid(error)).toBe(false);
    expect(isPassagesUnavailable(error)).toBe(false);
    expect(isBareBadRequest(error)).toBe(false);
  });
});

describe('contract v1 of relatos: inboxes', () => {
  it('reads comment.passage on received Marcas', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        items: [
          {
            comment: { id: 'c1', author: { userId: 'u', displayName: 'ana' }, content: 'hola', createdAt: '2026-11-01T10:00:00Z', passage: { paragraphKey: 'k1', located: true, quote: 'una frase' } },
            story: { duelId: 'd1', storyId: 's1', prompt: 'p' },
          },
          {
            comment: { id: 'c2', author: { userId: 'u', displayName: 'ana' }, content: 'hola', createdAt: '2026-11-01T11:00:00Z' },
            story: { duelId: 'd1', storyId: 's1', prompt: 'p' },
          },
        ],
        nextCursor: null,
      }),
    );
    const page = await storyCommentsApi.received(null, 20, ctx);
    expect(page.items.map((item) => (item.source === 'duelStory' ? item.passage : 'wrong'))).toEqual([{ located: true, quote: 'una frase' }, undefined]);
  });

  it('reads rootPassage on received replies, and survives unknown fields', () => {
    const page = parseStoryRepliesReceived({
      items: [
        {
          reply: { id: 'p1', author: { userId: 'u', displayName: 'beto' }, content: 'hola', createdAt: '2026-11-01T10:00:00Z' },
          rootCommentId: 'c1',
          story: { duelId: 'd1', storyId: 's1', prompt: 'p' },
          isStoryAuthor: false,
          rootPassage: { located: true, quote: 'una frase', future: 1 },
        },
        {
          reply: { id: 'p2', author: { userId: 'u', displayName: 'beto' }, content: 'hola', createdAt: '2026-11-01T11:00:00Z' },
          rootCommentId: 'c1',
          story: { duelId: 'd1', storyId: 's1', prompt: 'p' },
          isStoryAuthor: true,
          rootPassage: { located: false },
        },
      ],
    });
    expect(page.items.map((item) => (item.source === 'duelStoryReply' ? item.passage : 'wrong'))).toEqual([
      { located: true, quote: 'una frase' },
      { located: false, quote: null },
    ]);
  });
});

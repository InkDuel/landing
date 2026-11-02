import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { track } from '@/lib/analytics';
import { ApiError } from '@/lib/session/api';
import type { InkMarkReply, InkMarkRoot, InkMarkRepliesPage, InkMarkRootsPage } from '@/lib/session/marks';
import { inkMarksApi } from '@/lib/session/marks';

import { FOCUS_PAGE_BUDGET, REPLY_FOCUS_EXTRA_PAGES, useChapterMarks } from './chapter-marks';

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('@/lib/session/marks', async (original) => {
  const actual = await original<typeof import('@/lib/session/marks')>();
  return {
    ...actual,
    inkMarksApi: { summary: vi.fn(), roots: vi.fn(), replies: vi.fn(), create: vi.fn(), remove: vi.fn(), report: vi.fn() },
  };
});

const api = vi.mocked(inkMarksApi);

const root = (id: string, over: Partial<InkMarkRoot> = {}): InkMarkRoot => ({
  id,
  author: { userId: 'u', displayName: 'ana' },
  content: `Marca ${id}`,
  createdAt: '2026-11-01T10:00:00Z',
  isAuthor: false,
  isDeleted: false,
  replyCount: 0,
  canDelete: false,
  passage: null,
  ...over,
});
const reply = (id: string): InkMarkReply => ({
  id,
  author: { userId: 'u2', displayName: 'beto' },
  content: `Respuesta ${id}`,
  createdAt: '2026-11-01T11:00:00Z',
  isAuthor: false,
  replyingTo: '',
  canDelete: false,
});

const summary = (over: Record<string, unknown> = {}) => ({
  markCount: 3,
  rootCount: 1,
  canMark: true,
  passages: { paragraphKeys: ['aaaaaaaaaaaa', 'bbbbbbbbbbbb'], markedKeys: ['bbbbbbbbbbbb'], maxQuoteRunes: 300, chapterRevision: 7 },
  ...over,
});

const rootsPage = (items: InkMarkRoot[], nextCursor: string | null = null): InkMarkRootsPage => ({
  items,
  nextCursor,
  markCount: 3,
  rootCount: 1,
  canMark: true,
});
const repliesPage = (items: InkMarkReply[], nextCursor: string | null, replyCount = 30): InkMarkRepliesPage => ({
  items,
  nextCursor,
  replyCount,
});

function arrive(query: string) {
  window.history.replaceState(null, '', `/work/w1/chapter/c1${query}`);
}

/** Replies served by cursor: pages[0] first, then pages[1] for cursor 'r2'... */
function serveReplies(pages: InkMarkReply[][]) {
  api.replies.mockImplementation(async (_w, _c, _root, cursor) => {
    const index = cursor ? Number(cursor.slice(1)) - 1 : 0;
    return repliesPage(pages[index], index + 1 < pages.length ? `r${index + 2}` : null);
  });
}

function mount(options: Parameters<typeof useChapterMarks>[4] = {}) {
  return renderHook(() => useChapterMarks('w1', 'c1', 2, 'es', options));
}

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  api.summary.mockResolvedValue(summary());
  api.roots.mockResolvedValue(rootsPage([root('r1', { replyCount: 30 })]));
});
afterEach(() => {
  cleanup();
  arrive('');
});

describe('?reply= focus (the thread opens first, then the reply is looked for)', () => {
  it('found on the first page: no more pages are loaded, the reply is highlighted', async () => {
    arrive('?mark=r1&reply=p2');
    serveReplies([[reply('p1'), reply('p2')], [reply('p3')]]);
    const { result } = mount();
    await waitFor(() => expect(result.current.state.replyHighlight).toBe('p2'));
    expect(api.replies).toHaveBeenCalledTimes(1);
    expect(result.current.state.threads.r1.expanded).toBe(true);
  });

  it('found on the third page: loads exactly two more pages', async () => {
    arrive('?mark=r1&reply=p5');
    serveReplies([[reply('p1'), reply('p2')], [reply('p3'), reply('p4')], [reply('p5')], [reply('p6')]]);
    const { result } = mount();
    await waitFor(() => expect(result.current.state.replyHighlight).toBe('p5'));
    expect(api.replies).toHaveBeenCalledTimes(1 + REPLY_FOCUS_EXTRA_PAGES);
  });

  it('not found within the budget: stops after two extra pages and leaves the thread open', async () => {
    arrive('?mark=r1&reply=p9');
    serveReplies([[reply('p1')], [reply('p2')], [reply('p3')], [reply('p4')], [reply('p9')]]);
    const { result } = mount();
    await waitFor(() => expect(api.replies).toHaveBeenCalledTimes(1 + REPLY_FOCUS_EXTRA_PAGES));
    await act(async () => undefined);
    expect(api.replies).toHaveBeenCalledTimes(1 + REPLY_FOCUS_EXTRA_PAGES);
    expect(result.current.state.replyHighlight).toBeNull();
    expect(result.current.state.threads.r1.expanded).toBe(true);
    expect(result.current.state.threads.r1.items.map((item) => item.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('not found when the thread ends first: nothing more is asked', async () => {
    arrive('?mark=r1&reply=gone');
    serveReplies([[reply('p1')]]);
    const { result } = mount();
    await waitFor(() => expect(result.current.state.threads.r1?.loaded).toBe(true));
    await act(async () => undefined);
    expect(api.replies).toHaveBeenCalledTimes(1);
    expect(result.current.state.replyHighlight).toBeNull();
  });

  it('a link without reply behaves as before: first page of replies, no highlight, no extra requests', async () => {
    arrive('?mark=r1');
    serveReplies([[reply('p1')], [reply('p2')]]);
    const { result } = mount();
    await waitFor(() => expect(result.current.state.threads.r1?.loaded).toBe(true));
    await act(async () => undefined);
    expect(api.replies).toHaveBeenCalledTimes(1);
    expect(result.current.state.replyFocusId).toBeNull();
    expect(result.current.state.replyHighlight).toBeNull();
  });

  it('a reply that is the root itself is ignored', async () => {
    arrive('?mark=r1&reply=r1');
    serveReplies([[reply('p1')], [reply('p2')]]);
    const { result } = mount();
    await waitFor(() => expect(result.current.state.threads.r1?.loaded).toBe(true));
    expect(result.current.state.replyFocusId).toBeNull();
    expect(api.replies).toHaveBeenCalledTimes(1);
  });
});

describe('?mark= search: unavailable only at the END of the listing', () => {
  const pageOf = (n: number, last: boolean) => rootsPage([root(`x${n}`)], last ? null : `c${n + 1}`);
  const serveRoots = (pages: InkMarkRootsPage[]) =>
    api.roots.mockImplementation(async (_w, _c, cursor) => pages[cursor ? Number(cursor.slice(1)) - 1 : 0]);

  it('reaching the end without the root says the thread is unavailable', async () => {
    arrive('?mark=missing');
    serveRoots([pageOf(1, false), pageOf(2, false), pageOf(3, true)]);
    const { result } = mount();
    await waitFor(() => expect(result.current.focusUnavailable).toBe(true));
    expect(api.roots).toHaveBeenCalledTimes(3);
  });

  it('hitting the page budget with more pages left stays silent (it proves nothing)', async () => {
    arrive('?mark=missing');
    serveRoots(Array.from({ length: 9 }, (_, i) => pageOf(i + 1, false)));
    const { result } = mount();
    await waitFor(() => expect(api.roots).toHaveBeenCalledTimes(FOCUS_PAGE_BUDGET));
    await act(async () => undefined);
    expect(api.roots).toHaveBeenCalledTimes(FOCUS_PAGE_BUDGET);
    expect(result.current.state.nextCursor).not.toBeNull();
    expect(result.current.focusUnavailable).toBe(false);
  });

  it('finding the root is never unavailable, and no ?mark= is never unavailable', async () => {
    arrive('?mark=x2');
    serveRoots([pageOf(1, false), pageOf(2, true)]);
    const found = mount();
    await waitFor(() => expect(found.result.current.state.roots.some((item) => item.id === 'x2')).toBe(true));
    expect(found.result.current.focusUnavailable).toBe(false);
    cleanup();

    arrive('');
    api.roots.mockResolvedValue(rootsPage([root('r1')]));
    const plain = mount();
    await waitFor(() => expect(plain.result.current.state.summary).not.toBeNull());
    act(() => plain.result.current.request());
    await waitFor(() => expect(plain.result.current.state.rootsStatus).toBe('ready'));
    expect(plain.result.current.focusUnavailable).toBe(false);
  });
});

describe('quoted Marcas', () => {
  const selection = { key: 'bbbbbbbbbbbb', quote: 'un ritmo lento', source: 'margin' as const };

  async function openComposer(options: Parameters<typeof useChapterMarks>[4] = {}) {
    const hook = mount(options);
    await waitFor(() => expect(hook.result.current.state.summary).not.toBeNull());
    act(() => hook.result.current.openPassageComposer(selection));
    await waitFor(() => expect(hook.result.current.state.composer?.passage).toBeTruthy());
    return hook;
  }

  it('create sends the passage with the chapter revision of the summary, and tracks without text', async () => {
    const onQuoted = vi.fn();
    const { result } = await openComposer({ onQuoted });
    expect(vi.mocked(track)).toHaveBeenCalledWith(
      'ink_mark_composer_opened',
      expect.objectContaining({ kind: 'root', has_passage: true, source: 'margin' }),
    );
    api.create.mockResolvedValue({ created: true, root: root('new', { passage: { paragraphKey: 'bbbbbbbbbbbb', located: true, quote: 'un ritmo lento' } }), reply: null });
    await act(async () => {
      await result.current.create('Me heló esa frase');
    });
    expect(api.create).toHaveBeenCalledWith('w1', 'c1', expect.any(String), 'Me heló esa frase', null, { locale: 'es' }, {
      paragraphKey: 'bbbbbbbbbbbb',
      quote: 'un ritmo lento',
      chapterRevision: 7,
    });
    expect(onQuoted).toHaveBeenCalledTimes(1);
    const created = vi.mocked(track).mock.calls.find(([name]) => name === 'ink_mark_created');
    expect(created?.[1]).toMatchObject({ has_passage: true, source: 'margin', is_reply: false });
    expect(JSON.stringify(vi.mocked(track).mock.calls)).not.toContain('ritmo lento');
    expect(JSON.stringify(vi.mocked(track).mock.calls)).not.toContain('Me heló');
  });

  it('a general Marca tracks has_passage 0 and the end CTA as its source', async () => {
    const hook = mount();
    await waitFor(() => expect(hook.result.current.state.summary).not.toBeNull());
    act(() => hook.result.current.openComposer({ rootId: null, parentId: null, name: '', source: 'end_cta' }));
    expect(vi.mocked(track)).toHaveBeenCalledWith(
      'ink_mark_composer_opened',
      expect.objectContaining({ has_passage: false, source: 'end_cta' }),
    );
    api.create.mockResolvedValue({ created: true, root: root('g1'), reply: null });
    await act(async () => {
      await hook.result.current.create('Una Marca general');
    });
    expect(api.create.mock.calls[0][6]).toBeUndefined();
    const created = vi.mocked(track).mock.calls.find(([name]) => name === 'ink_mark_created');
    expect(created?.[1]).toMatchObject({ has_passage: false, source: 'end_cta' });
  });

  it('409 passage_changed: reloads chapter and summary, drops the draft, says the conflict', async () => {
    const reloadChapter = vi.fn().mockResolvedValue(undefined);
    const { result } = await openComposer({ reloadChapter });
    api.summary.mockClear();
    api.create.mockRejectedValue(new ApiError(409, 'http', { error: 'cambió', code: 'passage_changed' }));
    let ok = true;
    await act(async () => {
      ok = await result.current.create('Me heló esa frase');
    });
    expect(ok).toBe(false);
    expect(reloadChapter).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(api.summary).toHaveBeenCalledTimes(1));
    expect(result.current.state.conflict).toBe(true);
    expect(result.current.state.composer).toBeNull();
    expect(result.current.state.busy).toBe(false);
  });

  it('any other 409 keeps the old behaviour: no reload, the composer stays with the error', async () => {
    const reloadChapter = vi.fn();
    const { result } = await openComposer({ reloadChapter });
    api.create.mockRejectedValue(new ApiError(409, 'http', { error: 'otro conflicto' }));
    await act(async () => {
      await result.current.create('Me heló esa frase');
    });
    expect(reloadChapter).not.toHaveBeenCalled();
    expect(result.current.state.conflict).toBe(false);
    expect(result.current.state.composer).not.toBeNull();
    expect(result.current.state.createError).toBeTruthy();
  });

  it('503 passages_unavailable turns quoting off without turning writes off', async () => {
    const { result } = await openComposer();
    api.create.mockRejectedValue(new ApiError(503, 'http', { code: 'passages_unavailable' }));
    await act(async () => {
      await result.current.create('Me heló esa frase');
    });
    expect(result.current.state.quoteOff).toBe(true);
    expect(result.current.state.writesOff).toBe(false);
  });

  it('the new drop appears at once: the paragraph is marked after a quoted Marca', async () => {
    api.summary.mockResolvedValue(
      summary({ passages: { paragraphKeys: ['aaaaaaaaaaaa', 'bbbbbbbbbbbb'], markedKeys: [], maxQuoteRunes: 300, chapterRevision: 7 } }),
    );
    const { result } = await openComposer();
    expect(result.current.state.summary?.passages?.markedKeys).toEqual([]);
    api.create.mockResolvedValue({ created: true, root: root('n'), reply: null });
    await act(async () => {
      await result.current.create('Me heló esa frase');
    });
    expect(result.current.state.summary?.passages?.markedKeys).toEqual(['bbbbbbbbbbbb']);
  });

  it('the paragraph panel is the server query for that key, never an in-memory filter', async () => {
    const hook = mount();
    await waitFor(() => expect(hook.result.current.state.summary).not.toBeNull());
    api.roots.mockClear();
    api.roots.mockResolvedValue(rootsPage([root('q1', { passage: { paragraphKey: 'bbbbbbbbbbbb', located: true, quote: 'frase' } })]));
    act(() => hook.result.current.openPassage('bbbbbbbbbbbb'));
    await waitFor(() => expect(hook.result.current.state.passage?.status).toBe('ready'));
    expect(api.roots).toHaveBeenCalledWith('w1', 'c1', null, { locale: 'es', passage: 'bbbbbbbbbbbb' });
    expect(hook.result.current.state.passage?.items.map((item) => item.id)).toEqual(['q1']);
    expect(vi.mocked(track)).toHaveBeenCalledWith('ink_mark_passage_thread_opened', expect.not.objectContaining({ quote: expect.anything() }));
  });

  it('a panel that comes back empty hides its drop for the session (drift)', async () => {
    const hook = mount();
    await waitFor(() => expect(hook.result.current.state.summary).not.toBeNull());
    api.roots.mockResolvedValue(rootsPage([]));
    act(() => hook.result.current.openPassage('bbbbbbbbbbbb'));
    await waitFor(() => expect(hook.result.current.state.hiddenKeys).toEqual(['bbbbbbbbbbbb']));
  });
});

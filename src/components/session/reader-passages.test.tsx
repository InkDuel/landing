import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiGet } from '@/lib/session/api';
import { followsApi } from '@/lib/session/follows';
import { type InkMarkRoot, inkMarksApi } from '@/lib/session/marks';

import { ReaderView } from './reader';

let currentUser = { id: 'reader-1' };
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('@/lib/session/auth-context', () => ({ useSession: () => ({ user: currentUser }) }));
vi.mock('./session-root', () => ({ useSessionLocale: () => ({ locale: 'es' }) }));
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/session/api', async (original) => {
  const actual = await original<typeof import('@/lib/session/api')>();
  return { ...actual, apiGet: vi.fn() };
});
vi.mock('@/lib/session/follows', () => ({ followsApi: { state: vi.fn() } }));
vi.mock('@/lib/session/marks', async (original) => {
  const actual = await original<typeof import('@/lib/session/marks')>();
  return { ...actual, inkMarksApi: { summary: vi.fn(), roots: vi.fn(), replies: vi.fn(), create: vi.fn(), remove: vi.fn(), report: vi.fn() } };
});

const get = vi.mocked(apiGet);
const marksApi = vi.mocked(inkMarksApi);

const KEYS = ['aaaaaaaaaaaa', 'bbbbbbbbbbbb', 'cccccccccccc'];
const CONTENT = 'Primera línea del capítulo.\n\nEra un ritmo lento, de pecho dormido.\n\nY cerró la puerta.';

const WORK = { id: 'w1', title: 'La casa', authorId: 'author-1', authorDisplayName: 'ana', publishedChapterCount: 1 };
const chapter = (over: Record<string, unknown> = {}) => ({ id: 'c1', title: 'Uno', orderIndex: 1, content: CONTENT, revision: 7, ...over });
const passages = (over: Record<string, unknown> = {}) => ({
  paragraphKeys: KEYS,
  markedKeys: ['bbbbbbbbbbbb'],
  maxQuoteRunes: 300,
  chapterRevision: 7,
  ...over,
});

function serve(options: { chapter?: Record<string, unknown> | ApiError; work?: Record<string, unknown> | ApiError } = {}) {
  get.mockImplementation(async (path: string) => {
    if (path.endsWith('/chapters')) return { items: [], nextCursor: null };
    if (path.includes('/chapters/')) {
      if (options.chapter instanceof ApiError) throw options.chapter;
      return options.chapter ?? chapter();
    }
    if (options.work instanceof ApiError) throw options.work;
    return options.work ?? WORK;
  });
}

const root = (id: string, over: Partial<InkMarkRoot> = {}): InkMarkRoot => ({
  id,
  author: { userId: 'u9', displayName: 'beto' },
  content: 'Esa frase me heló',
  createdAt: '2026-11-01T10:00:00Z',
  isAuthor: false,
  isDeleted: false,
  replyCount: 0,
  canDelete: false,
  passage: null,
  ...over,
});

const observers: IntersectionObserverCallback[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = { id: 'reader-1' };
  window.localStorage.clear();
  window.history.replaceState(null, '', '/work/w1/chapter/c1');
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
  window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        observers.push(callback);
      }
      observe() {}
      disconnect() {}
    },
  );
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
  vi.mocked(followsApi.state).mockResolvedValue({ following: false, canFollow: false });
  marksApi.summary.mockResolvedValue({ markCount: 1, rootCount: 1, canMark: true, passages: passages() });
  marksApi.roots.mockResolvedValue({ items: [], nextCursor: null, markCount: 1, rootCount: 1, canMark: true });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const lines = () => document.querySelectorAll('[data-passage-line]');
async function ready() {
  await screen.findByRole('heading', { level: 1, name: 'Uno' });
}

describe('unavailable chapter (?mark= link)', () => {
  it.each([
    ['an unpublished chapter (403)', { chapter: new ApiError(403, 'http') }],
    ['a missing chapter (404)', { chapter: new ApiError(404, 'http') }],
    ['a gone chapter (410)', { chapter: new ApiError(410, 'http') }],
    ['an unavailable work (404)', { work: new ApiError(404, 'http') }],
  ])('%s shows the unavailable state, with no Marcas panel and no Marcas request', async (_name, options) => {
    window.history.replaceState(null, '', '/work/w1/chapter/c1?mark=r1&reply=p1');
    serve(options);
    render(<ReaderView workId="w1" chapterId="c1" />);
    expect(await screen.findByText('Esta obra ya no está disponible')).toBeTruthy();
    expect(document.getElementById('marcas')).toBeNull();
    expect(screen.queryByText('Marcas de este párrafo')).toBeNull();
    expect(marksApi.summary).not.toHaveBeenCalled();
    expect(marksApi.roots).not.toHaveBeenCalled();
    expect(marksApi.replies).not.toHaveBeenCalled();
  });
});

describe('the text with places', () => {
  it('draws one element per line with the same text, a drop on a marked paragraph and a margin action on each', async () => {
    serve();
    render(<ReaderView workId="w1" chapterId="c1" />);
    await ready();
    await waitFor(() => expect(lines()).toHaveLength(3));
    expect([...lines()].map((node) => node.textContent)).toEqual(['Primera línea del capítulo.', 'Era un ritmo lento, de pecho dormido.', 'Y cerró la puerta.']);
    expect(screen.getAllByRole('button', { name: 'Marcas de este párrafo' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Dejar una Marca en este párrafo' })).toHaveLength(3);
  });

  it.each([
    ['a paragraph count that disagrees', { paragraphKeys: ['a', 'b'] }],
    ['another chapter revision', { chapterRevision: 8 }],
  ])('%s: the reader draws exactly what it drew before', async (_name, over) => {
    marksApi.summary.mockResolvedValue({ markCount: 1, rootCount: 1, canMark: true, passages: passages(over) });
    serve();
    render(<ReaderView workId="w1" chapterId="c1" />);
    await ready();
    await waitFor(() => expect(marksApi.summary).toHaveBeenCalled());
    await act(async () => undefined);
    expect(lines()).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Marcas de este párrafo' })).toBeNull();
    expect(screen.queryByText(/Selecciona una frase/)).toBeNull();
    expect(screen.getByText(/Primera línea del capítulo\./)).toBeTruthy();
  });

  it('without passages in the summary nothing changes either', async () => {
    marksApi.summary.mockResolvedValue({ markCount: 0, rootCount: 0, canMark: true, passages: null });
    serve();
    render(<ReaderView workId="w1" chapterId="c1" />);
    await ready();
    await act(async () => undefined);
    expect(lines()).toHaveLength(0);
  });

  it('a repeated paragraph gets neither a drop nor a margin action', async () => {
    marksApi.summary.mockResolvedValue({
      markCount: 1,
      rootCount: 1,
      canMark: true,
      passages: passages({ paragraphKeys: ['rrrrrrrrrrrr', 'bbbbbbbbbbbb', 'rrrrrrrrrrrr'], markedKeys: ['rrrrrrrrrrrr', 'bbbbbbbbbbbb'] }),
    });
    serve();
    render(<ReaderView workId="w1" chapterId="c1" />);
    await ready();
    await waitFor(() => expect(lines()).toHaveLength(3));
    expect(screen.getAllByRole('button', { name: 'Marcas de este párrafo' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Dejar una Marca en este párrafo' })).toHaveLength(1);
  });

  it('the author sees the drops but no margin action, no hint and no end line', async () => {
    currentUser = { id: 'author-1' };
    marksApi.summary.mockResolvedValue({ markCount: 1, rootCount: 1, canMark: false, passages: passages() });
    serve();
    render(<ReaderView workId="w1" chapterId="c1" />);
    await ready();
    await waitFor(() => expect(lines()).toHaveLength(3));
    expect(screen.getAllByRole('button', { name: 'Marcas de este párrafo' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Dejar una Marca en este párrafo' })).toBeNull();
    expect(screen.queryByText(/Selecciona una frase/)).toBeNull();
    expect(screen.queryByText(/También puedes seleccionar/)).toBeNull();
  });

  it('a reader with canMark=false gets the same: drops yes, gesture no', async () => {
    marksApi.summary.mockResolvedValue({ markCount: 1, rootCount: 1, canMark: false, passages: passages() });
    serve();
    render(<ReaderView workId="w1" chapterId="c1" />);
    await ready();
    await waitFor(() => expect(lines()).toHaveLength(3));
    expect(screen.getAllByRole('button', { name: 'Marcas de este párrafo' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Dejar una Marca en este párrafo' })).toBeNull();
    expect(screen.queryByText(/Selecciona una frase/)).toBeNull();
  });
});

describe('the one-time hint', () => {
  it('shows once with the end line, closes for good, and both retire after the first quoted Marca', async () => {
    serve();
    const first = render(<ReaderView workId="w1" chapterId="c1" />);
    await ready();
    expect(await screen.findByText(/Selecciona una frase/)).toBeTruthy();
    expect(screen.getByText(/También puedes seleccionar/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar la pista' }));
    expect(screen.queryByText(/Selecciona una frase para/)).toBeNull();
    expect(window.localStorage.getItem('inkduel-passage-hint-dismissed:reader-1')).toBe('1');
    // The end line stays until the first quoted Marca.
    expect(screen.getByText(/También puedes seleccionar/)).toBeTruthy();
    first.unmount();

    window.localStorage.setItem('inkduel-passage-quoted:reader-1', '1');
    serve();
    render(<ReaderView workId="w1" chapterId="c1" />);
    await ready();
    await waitFor(() => expect(lines()).toHaveLength(3));
    expect(screen.queryByText(/También puedes seleccionar/)).toBeNull();
  });
});

describe('the drop and the paragraph panel', () => {
  it('opens «Marcas de este párrafo» from the server query, each Marca with its own quote', async () => {
    serve();
    render(<ReaderView workId="w1" chapterId="c1" />);
    await ready();
    await waitFor(() => expect(lines()).toHaveLength(3));
    marksApi.roots.mockClear();
    marksApi.roots.mockResolvedValue({
      items: [root('r1', { passage: { paragraphKey: 'bbbbbbbbbbbb', located: true, quote: 'pecho dormido' } })],
      nextCursor: null,
      markCount: 1,
      rootCount: 1,
      canMark: true,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Marcas de este párrafo' }));
    const dialog = await screen.findByRole('dialog', { name: 'Marcas de este párrafo' });
    await within(dialog).findByText('Esa frase me heló');
    expect(within(dialog).getByText(/pecho dormido/)).toBeTruthy();
    expect(marksApi.roots).toHaveBeenCalledWith('w1', 'c1', null, expect.objectContaining({ passage: 'bbbbbbbbbbbb' }));
    expect(within(dialog).getByText('Para citar otra frase, selecciónala en el texto.')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Ver todas las del capítulo' })).toBeTruthy();
  });
});

describe('the quote gesture', () => {
  function select(node: Node, from: number, to: number) {
    const range = document.createRange();
    range.setStart(node, from);
    range.setEnd(node, to);
    const selection = window.getSelection() as Selection;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  }
  const textOf = (index: number) => lines()[index].firstChild as Text;

  it('a selection inside one paragraph offers «Dejar una Marca» and opens the composer on the quote', async () => {
    serve();
    render(<ReaderView workId="w1" chapterId="c1" />);
    await ready();
    await waitFor(() => expect(lines()).toHaveLength(3));
    expect(screen.queryByRole('button', { name: 'Dejar una Marca' })).toBeNull();
    select(textOf(1), 4, 20);
    const bar = await screen.findByRole('button', { name: 'Dejar una Marca' });
    fireEvent.click(bar);
    const dialog = await screen.findByRole('dialog', { name: 'Sobre este fragmento' });
    expect(within(dialog).getByText(/un ritmo lento,/)).toBeTruthy();
    expect(within(dialog).getByRole('textbox')).toBeTruthy();
  });

  it('a selection across two paragraphs offers nothing', async () => {
    serve();
    render(<ReaderView workId="w1" chapterId="c1" />);
    await ready();
    await waitFor(() => expect(lines()).toHaveLength(3));
    const range = document.createRange();
    range.setStart(textOf(0), 3);
    range.setEnd(textOf(1), 5);
    const selection = window.getSelection() as Selection;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 40)));
    expect(screen.queryByRole('button', { name: 'Dejar una Marca' })).toBeNull();
  });

  it('over 300 runes: shows the limit inline, never opens the composer, never sends, never trims', async () => {
    const long = 'x'.repeat(301);
    serve({ chapter: chapter({ content: `Antes.\n${long}\nDespués.` }) });
    render(<ReaderView workId="w1" chapterId="c1" />);
    await ready();
    await waitFor(() => expect(lines()).toHaveLength(3));
    select(textOf(1), 0, 301);
    fireEvent.click(await screen.findByRole('button', { name: 'Dejar una Marca' }));
    expect(await screen.findByText('La cita puede tener hasta 300 caracteres. Achica la selección.')).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Sobre este fragmento' })).toBeNull();
    expect(marksApi.create).not.toHaveBeenCalled();
  });

  it('the margin action pre-selects the whole paragraph', async () => {
    serve();
    render(<ReaderView workId="w1" chapterId="c1" />);
    await ready();
    await waitFor(() => expect(lines()).toHaveLength(3));
    fireEvent.click(screen.getAllByRole('button', { name: 'Dejar una Marca en este párrafo' })[2]);
    expect(window.getSelection()?.toString()).toBe('Y cerró la puerta.');
    expect(await screen.findByRole('button', { name: 'Dejar una Marca' })).toBeTruthy();
  });

  it('a conflict on create reloads the chapter and says it', async () => {
    serve();
    render(<ReaderView workId="w1" chapterId="c1" />);
    await ready();
    await waitFor(() => expect(lines()).toHaveLength(3));
    select(textOf(1), 0, 13);
    fireEvent.click(await screen.findByRole('button', { name: 'Dejar una Marca' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sobre este fragmento' });
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Me heló esa frase' } });
    marksApi.create.mockRejectedValue(new ApiError(409, 'http', { code: 'passage_changed' }));
    const chapterCalls = () => get.mock.calls.filter(([path]) => String(path).endsWith('/chapters/c1')).length;
    const before = chapterCalls();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dejarla' }));
    expect(await screen.findByText('El capítulo cambió mientras leías. Vuelve a elegir el fragmento.')).toBeTruthy();
    await waitFor(() => expect(chapterCalls()).toBe(before + 1));
    expect(screen.queryByRole('dialog', { name: 'Sobre este fragmento' })).toBeNull();
  });

  it('passage_changed keeps the typed text: a new quote reopens it prefilled and publishes with a new id and the current revision', async () => {
    serve();
    render(<ReaderView workId="w1" chapterId="c1" />);
    await ready();
    await waitFor(() => expect(lines()).toHaveLength(3));
    select(textOf(1), 0, 13);
    fireEvent.click(await screen.findByRole('button', { name: 'Dejar una Marca' }));
    let dialog = await screen.findByRole('dialog', { name: 'Sobre este fragmento' });
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Me heló esa frase' } });
    marksApi.create.mockRejectedValueOnce(new ApiError(409, 'http', { code: 'passage_changed' }));
    // The chapter moved on: new text, new keys, revision 8.
    serve({ chapter: chapter({ revision: 8, content: 'Primera línea del capítulo.\n\nEra un ritmo lento, de pecho tranquilo.\n\nY cerró la puerta.' }) });
    marksApi.summary.mockResolvedValue({
      markCount: 1,
      rootCount: 1,
      canMark: true,
      passages: passages({ paragraphKeys: ['dddddddddddd', 'eeeeeeeeeeee', 'ffffffffffff'], markedKeys: [], chapterRevision: 8 }),
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dejarla' }));
    expect(await screen.findByText('El capítulo cambió mientras leías. Vuelve a elegir el fragmento.')).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Sobre este fragmento' })).toBeNull();
    // Nothing was re-sent, and nothing was turned into a general Marca.
    expect(marksApi.create).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(lines()[1]?.textContent).toContain('pecho tranquilo'));

    select(textOf(1), 4, 19);
    fireEvent.click(await screen.findByRole('button', { name: 'Dejar una Marca' }));
    dialog = await screen.findByRole('dialog', { name: 'Sobre este fragmento' });
    expect((within(dialog).getByRole('textbox') as HTMLTextAreaElement).value).toBe('Me heló esa frase');
    expect(marksApi.create).toHaveBeenCalledTimes(1);

    marksApi.create.mockResolvedValueOnce({
      created: true,
      root: root('new', { passage: { paragraphKey: 'eeeeeeeeeeee', located: true, quote: 'un ritmo lento,' } }),
      reply: null,
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dejarla' }));
    await waitFor(() => expect(marksApi.create).toHaveBeenCalledTimes(2));
    const [first, second] = marksApi.create.mock.calls;
    expect(second[2]).not.toBe(first[2]);
    expect(second[3]).toBe('Me heló esa frase');
    expect(second[6]).toEqual({ paragraphKey: 'eeeeeeeeeeee', quote: 'un ritmo lento,', chapterRevision: 8 });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Sobre este fragmento' })).toBeNull());
  });

  it.each([
    ['a timeout', new ApiError(0, 'timeout'), true],
    ['a 503', new ApiError(503, 'http'), false],
  ])('%s keeps the composer and the typed text, with no conflict and no carried draft', async (_name, failure, retryable) => {
    serve();
    render(<ReaderView workId="w1" chapterId="c1" />);
    await ready();
    await waitFor(() => expect(lines()).toHaveLength(3));
    select(textOf(1), 0, 13);
    fireEvent.click(await screen.findByRole('button', { name: 'Dejar una Marca' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sobre este fragmento' });
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Me heló esa frase' } });
    marksApi.create.mockRejectedValueOnce(failure);
    const chapterCalls = () => get.mock.calls.filter(([path]) => String(path).endsWith('/chapters/c1')).length;
    const before = chapterCalls();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dejarla' }));
    await waitFor(() => expect(marksApi.create).toHaveBeenCalledTimes(1));
    await act(async () => undefined);
    expect(chapterCalls()).toBe(before);
    expect(screen.queryByText('El capítulo cambió mientras leías. Vuelve a elegir el fragmento.')).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Sobre este fragmento' })).toBe(dialog);
    expect((within(dialog).getByRole('textbox') as HTMLTextAreaElement).value).toBe('Me heló esa frase');
    if (!retryable) {
      // A 503 turns writes off: Publish stays disabled, the text stays.
      expect(within(dialog).getByRole('button', { name: 'Dejarla' })).toHaveProperty('disabled', true);
      return;
    }
    // A timeout may have succeeded: the retry reuses the same request id.
    marksApi.create.mockResolvedValueOnce({ created: false, root: root('new'), reply: null });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dejarla' }));
    await waitFor(() => expect(marksApi.create).toHaveBeenCalledTimes(2));
    const [first, second] = marksApi.create.mock.calls;
    expect(second[2]).toBe(first[2]);
    expect(second[3]).toBe('Me heló esa frase');
    expect(second[6]).toEqual(first[6]);
  });
});

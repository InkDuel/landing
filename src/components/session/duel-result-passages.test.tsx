import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { track } from '@/lib/analytics';
import { ApiError } from '@/lib/session/api';
import { parseDuelDetail } from '@/lib/session/duels';
import { type StoryComment, storyCommentsApi, storyRepliesApi } from '@/lib/session/marks';
import { passagesWebEnabled } from '@/lib/session/reading';

import { DuelResultView } from './duel-result';

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('@/lib/session/auth-context', () => ({ useSession: () => ({ user: { id: 'me', username: 'yo' } }) }));
vi.mock('./session-root', () => ({ useSessionLocale: () => ({ locale: 'es' }) }));
vi.mock('./ranked-runtime', () => ({ useRanked: () => ({ runtime: { reset: vi.fn() } }) }));
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/session/reading', async (original) => {
  const actual = await original<typeof import('@/lib/session/reading')>();
  return { ...actual, passagesWebEnabled: vi.fn() };
});
vi.mock('@/lib/session/marks', async (original) => {
  const actual = await original<typeof import('@/lib/session/marks')>();
  return {
    ...actual,
    storyCommentsApi: { ...actual.storyCommentsApi, summary: vi.fn(), list: vi.fn(), create: vi.fn() },
    storyRepliesApi: { list: vi.fn(), create: vi.fn(), remove: vi.fn(), report: vi.fn() },
  };
});

const api = vi.mocked(storyCommentsApi);
const OWN = 'Mi relato propio.\n\nTermina aquí.';
const RIVAL = 'Era un ritmo lento, de pecho dormido.\n\nY cerró la puerta.';
const OWN_KEYS = ['own000000001', 'own000000002'];
const RIVAL_KEYS = ['riv000000001', 'riv000000002'];

const duel = () =>
  parseDuelDetail({
    id: 'd',
    prompt: 'Una puerta',
    userA: { id: 'me', username: 'Autor' },
    userB: { id: 'rival', username: 'Rival' },
    storyA: { id: 'sa', text: OWN, commentable: true, commentsCount: 1 },
    storyB: { id: 'sb', text: RIVAL, commentable: true, commentsCount: 1 },
  });

const marca = (id: string, over: Partial<StoryComment> = {}): StoryComment => ({
  id,
  author: { userId: 'u-ana', displayName: 'ana' },
  content: `Marca ${id}`,
  createdAt: '2026-11-01T10:00:00Z',
  canDelete: false,
  replyCount: 0,
  ...over,
});

function serve(opts: { own?: string[] | null; rival?: string[] | null } = {}) {
  const own = opts.own === undefined ? [OWN_KEYS[0]] : opts.own;
  const rival = opts.rival === undefined ? [] : opts.rival;
  api.summary.mockImplementation(async (_d, storyId) => {
    const marked = storyId === 'sa' ? own : rival;
    if (marked === null) throw new ApiError(404, 'http');
    return {
      commentsCount: 1,
      canComment: true,
      canReply: true,
      passages: { paragraphKeys: storyId === 'sa' ? OWN_KEYS : RIVAL_KEYS, markedKeys: marked, maxQuoteRunes: 300 },
    };
  });
}

const PLAIN_CLASS = 'mt-5 whitespace-pre-wrap break-words type-literary-small leading-relaxed text-content';
const lines = (scope: ParentNode = document) => scope.querySelectorAll('[data-passage-line]');
/** The plain story paragraph (getByText normalizes the line breaks away). */
const para = (text: string) => screen.getByText((_, node) => node?.tagName === 'P' && node.textContent === text);
const column = (name: string) => screen.getByText(name).closest('.min-w-0.flex-col') as HTMLElement;

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private readonly callback: IntersectionObserverCallback) {}
      // Everything is in view: the conversations load on their own.
      observe(node: Element) {
        this.callback([{ target: node, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      disconnect() {}
    },
  );
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
  vi.mocked(passagesWebEnabled).mockResolvedValue(true);
  api.list.mockImplementation(async (_d, storyId, _cursor, options) => ({
    items: options.passage ? [marca('p1', { passage: { paragraphKey: OWN_KEYS[0], located: true, quote: 'Mi relato' } })] : [marca(`g-${storyId}`)],
    nextCursor: null,
    commentsCount: 1,
    canComment: true,
    canReply: true,
  }));
  vi.mocked(storyRepliesApi.list).mockResolvedValue({ items: [], nextCursor: null, replyCount: 0, canReply: true });
  serve();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function select(node: Node, from: number, to: number) {
  const range = document.createRange();
  range.setStart(node, from);
  range.setEnd(node, to);
  const selection = window.getSelection() as Selection;
  selection.removeAllRanges();
  selection.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
}

describe('flags off or unknown: the story is the paragraph of before', () => {
  it('renders the exact markup, with no summary request', async () => {
    vi.mocked(passagesWebEnabled).mockResolvedValue(false);
    render(<DuelResultView duel={duel()} locale="es" />);
    await screen.findByText('Marca g-sb');
    await act(async () => undefined);
    const own = para(OWN);
    expect(own.outerHTML).toBe(`<p class="${PLAIN_CLASS}">${OWN}</p>`);
    expect(own.parentElement?.className).toContain('rounded-card');
    expect(lines()).toHaveLength(0);
    expect(api.summary).not.toHaveBeenCalled();
  });

  it('never waits for the switch', async () => {
    vi.mocked(passagesWebEnabled).mockReturnValue(new Promise(() => undefined));
    render(<DuelResultView duel={duel()} locale="es" />);
    expect(para(RIVAL).outerHTML).toBe(`<p class="${PLAIN_CLASS}">${RIVAL}</p>`);
    await screen.findByText('Marca g-sb');
    expect(api.summary).not.toHaveBeenCalled();
  });

  it.each([
    ['no passages in the summary', () => api.summary.mockResolvedValue({ commentsCount: 1, canComment: true, canReply: true, passages: null })],
    ['a 404 (private or friend duel of someone else)', () => api.summary.mockRejectedValue(new ApiError(404, 'http'))],
    ['a paragraph count that disagrees', () => api.summary.mockResolvedValue({ commentsCount: 1, canComment: true, canReply: true, passages: { paragraphKeys: ['a'], markedKeys: [], maxQuoteRunes: 300 } })],
  ])('%s: today\'s text', async (_name, arrange) => {
    arrange();
    render(<DuelResultView duel={duel()} locale="es" />);
    await waitFor(() => expect(api.summary).toHaveBeenCalledTimes(2));
    await act(async () => undefined);
    expect(lines()).toHaveLength(0);
    expect(para(RIVAL).outerHTML).toBe(`<p class="${PLAIN_CLASS}">${RIVAL}</p>`);
  });
});

describe('flags on', () => {
  it('draws places with the card typography, the 26px line and a gutter for the gotas', async () => {
    render(<DuelResultView duel={duel()} locale="es" />);
    await waitFor(() => expect(lines()).toHaveLength(4));
    const root = lines()[0].closest('div.group')?.parentElement as HTMLElement;
    expect(root.className).toContain('type-literary-small leading-relaxed');
    expect(root.className).toContain('whitespace-pre-wrap');
    expect(root.className).toContain('mt-5 px-5');
    expect(root.querySelector('[aria-hidden="true"][style*="min-height: 26px"]')).toBeTruthy();
    expect([...lines(root)].map((node) => node.textContent)).toEqual(['Mi relato propio.', 'Termina aquí.']);
    // Once per relato and page session: the rival's story only (it is the one that can be quoted).
    await waitFor(() => expect(track).toHaveBeenCalledWith('ink_mark_quote_action_shown', { surface: 'duel_story', context: 'duel_result_rival' }));
  });

  it('the rival story can be quoted: composer on the quote, create with the passage, context duel_result_rival', async () => {
    api.create.mockResolvedValue({
      comment: marca('n1', { content: 'Me heló', canDelete: true, passage: { paragraphKey: RIVAL_KEYS[0], located: true, quote: 'un ritmo lento,' } }),
      commentsCount: 2,
    });
    render(<DuelResultView duel={duel()} locale="es" />);
    const rivalLines = () => lines(column('Rival'));
    await waitFor(() => expect(rivalLines()).toHaveLength(2));
    select(rivalLines()[0].firstChild as Text, 4, 20);
    fireEvent.click(await screen.findByRole('button', { name: 'Dejar una Marca' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sobre este fragmento' });
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Me heló' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dejarla' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    expect(api.create).toHaveBeenCalledWith('d', 'sb', expect.any(String), 'Me heló', { locale: 'es' }, { paragraphKey: RIVAL_KEYS[0], quote: 'un ritmo lento,' });
    expect(track).toHaveBeenCalledWith('ink_mark_created', { surface: 'duel_story', context: 'duel_result_rival', has_passage: true, source: 'selection' });
    // The drop shows up on the rival's paragraph only.
    await waitFor(() => expect(within(column('Rival')).getAllByRole('button', { name: 'Marcas de este párrafo' })).toHaveLength(1));
    expect(within(column('Autor')).getAllByRole('button', { name: 'Marcas de este párrafo' })).toHaveLength(1);
  });

  it('your own story shows gotas but offers no quoting, no hint', async () => {
    render(<DuelResultView duel={duel()} locale="es" />);
    const own = () => column('Autor');
    await waitFor(() => expect(lines(own())).toHaveLength(2));
    expect(within(own()).getAllByRole('button', { name: 'Marcas de este párrafo' })).toHaveLength(1);
    expect(within(own()).queryByRole('button', { name: 'Dejar una Marca en este párrafo' })).toBeNull();
    select(lines(own())[0].firstChild as Text, 0, 6);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 40)));
    expect(screen.queryByRole('button', { name: 'Dejar una Marca' })).toBeNull();
    // The rival's story still offers the margin action.
    expect(within(column('Rival')).getAllByRole('button', { name: 'Dejar una Marca en este párrafo' })).toHaveLength(2);
    expect(track).not.toHaveBeenCalledWith('ink_mark_quote_action_shown', { surface: 'duel_story', context: 'duel_result_own' });
  });

  it('two stories keep independent state: one summary each, one panel only', async () => {
    render(<DuelResultView duel={duel()} locale="es" />);
    await waitFor(() => expect(lines()).toHaveLength(4));
    expect(api.summary.mock.calls.map((call) => call[1]).sort()).toEqual(['sa', 'sb']);
    fireEvent.click(within(column('Autor')).getByRole('button', { name: 'Marcas de este párrafo' }));
    const dialog = await screen.findByRole('dialog', { name: 'Marcas de este párrafo' });
    await within(dialog).findByText('Marca p1');
    expect(api.list).toHaveBeenCalledWith('d', 'sa', null, { locale: 'es', passage: OWN_KEYS[0] });
    expect(api.list.mock.calls.some((call) => call[1] === 'sb' && call[3].passage)).toBe(false);
    expect(track).toHaveBeenCalledWith('ink_mark_passage_thread_opened', { surface: 'duel_story', context: 'duel_result_own', has_passage: true, source: 'gota' });
  });
});

describe('another duel with the same players, without unmounting', () => {
  const second = () =>
    parseDuelDetail({
      id: 'd2',
      prompt: 'Otra puerta',
      userA: { id: 'me', username: 'Autor' },
      userB: { id: 'rival', username: 'Rival' },
      storyA: { id: 'sa2', text: OWN, commentable: true, commentsCount: 1 },
      storyB: { id: 'sb2', text: RIVAL, commentable: true, commentsCount: 1 },
    });

  for (const flag of [true, false]) {
    it(`keeps nothing from the previous duel (flag ${flag ? 'on' : 'off'})`, async () => {
      vi.mocked(passagesWebEnabled).mockResolvedValue(flag);
      const view = render(<DuelResultView duel={duel()} locale="es" />);
      await screen.findByText('Marca g-sb');
      await act(async () => undefined);

      view.rerender(<DuelResultView duel={second()} locale="es" />);
      // The new duel's conversation is requested and shown; the old one is gone.
      await screen.findByText('Marca g-sb2');
      await act(async () => undefined);
      expect(screen.queryByText('Marca g-sb')).toBeNull();
      expect(screen.queryByText('Marca g-sa')).toBeNull();
      expect(api.list.mock.calls.some((call) => call[0] === 'd2' && call[1] === 'sb2')).toBe(true);
      if (flag) expect(api.summary.mock.calls.some((call) => call[0] === 'd2' && call[1] === 'sb2')).toBe(true);
      else expect(api.summary).not.toHaveBeenCalled();
    });
  }
});

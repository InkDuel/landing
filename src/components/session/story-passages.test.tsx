import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { track } from '@/lib/analytics';
import { ApiError, apiGet } from '@/lib/session/api';
import { type StoryComment, type StoryCommentReply, storyCommentsApi, storyRepliesApi } from '@/lib/session/marks';
import { type GalleryStory, NO_REACTIONS } from '@/lib/session/models';
import { passagesWebEnabled, readingApi } from '@/lib/session/reading';

import { ReceivedStoryView } from './received-story';
import { StoryComments } from './story-comments';
import { StoryPassageText, StoryPassagesProvider } from './story-passages';
import { StoryReaderArticle } from './story-reader';

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('@/lib/session/auth-context', () => ({ useSession: () => ({ user: { id: 'me', username: 'yo' } }) }));
vi.mock('./session-root', () => ({ useSessionLocale: () => ({ locale: 'es' }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
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
vi.mock('@/lib/session/reading', async (original) => {
  const actual = await original<typeof import('@/lib/session/reading')>();
  return {
    ...actual,
    passagesWebEnabled: vi.fn(),
    readingApi: { next: vi.fn(), markRead: vi.fn(), setReaction: vi.fn() },
  };
});
vi.mock('@/lib/session/marks', async (original) => {
  const actual = await original<typeof import('@/lib/session/marks')>();
  return {
    ...actual,
    storyCommentsApi: { ...actual.storyCommentsApi, summary: vi.fn(), list: vi.fn(), create: vi.fn(), remove: vi.fn(), report: vi.fn() },
    storyRepliesApi: { list: vi.fn(), create: vi.fn(), remove: vi.fn(), report: vi.fn() },
  };
});

const api = vi.mocked(storyCommentsApi);
const replies = vi.mocked(storyRepliesApi);
const KEYS = ['aaaaaaaaaaaa', 'bbbbbbbbbbbb', 'cccccccccccc'];
const TEXT = 'Primera línea.\n\nEra un ritmo lento, de pecho dormido.\n\nY cerró la puerta.';

const author = (name: string) => ({ userId: `u-${name}`, displayName: name });
const marca = (id: string, over: Partial<StoryComment> = {}): StoryComment => ({
  id,
  author: author('ana'),
  content: `Marca ${id}`,
  createdAt: '2026-11-01T10:00:00Z',
  canDelete: false,
  replyCount: 0,
  ...over,
});
const quoted = (id: string, quote = 'pecho dormido', over: Partial<StoryComment> = {}) =>
  marca(id, { passage: { paragraphKey: KEYS[1], located: true, quote }, ...over });

type Summary = Awaited<ReturnType<typeof storyCommentsApi.summary>>;
const summaryOf = (over: Partial<Summary> = {}, markedKeys: string[] = []): Summary => ({
  commentsCount: 0,
  canComment: true,
  canReply: true,
  passages: { paragraphKeys: KEYS, markedKeys, maxQuoteRunes: 300 },
  ...over,
});

/** The server: the general conversation, and one paragraph's panel. */
let general: StoryComment[] = [];
let panel: StoryComment[] = [];
function serve(opts: { general?: StoryComment[]; panel?: StoryComment[]; summary?: Summary } = {}) {
  general = opts.general ?? [];
  panel = opts.panel ?? [];
  api.summary.mockResolvedValue(opts.summary ?? summaryOf());
  api.list.mockImplementation(async (_d, _s, _cursor, options) => {
    const items = options.passage ? panel : general;
    return { items, nextCursor: null, commentsCount: general.length, canComment: true, canReply: true };
  });
}

const story = (id: string, over: Partial<GalleryStory> = {}): GalleryStory => ({
  key: `duel_${id}~story_${id}`,
  duelId: `duel_${id}`,
  storyId: `story_${id}`,
  prompt: `Consigna ${id}`,
  storyPreview: TEXT,
  storyText: TEXT,
  authorId: `author_${id}`,
  authorDisplayName: `autor${id}`,
  authorRank: 'Aprendiz I',
  score: 70,
  strengths: [],
  commentsCount: 0,
  language: 'es',
  readByMe: false,
  myReaction: null,
  reactionCounts: NO_REACTIONS,
  ...over,
});

function Article({ item = story('1'), passages = true, hidden = false }: { item?: GalleryStory; passages?: boolean; hidden?: boolean }) {
  return (
    <StoryReaderArticle
      key={item.key}
      locale="es"
      hidden={hidden}
      options={{
        story: item,
        api: readingApi,
        queueEnabled: false,
        reactionsEnabled: false,
        passagesEnabled: passages,
        viewerId: 'me',
        locale: 'es',
        markReadOnOpen: false,
      }}
    />
  );
}

/** The provider with its two consumers, for what does not need the whole reader. */
function Harness({ own = false, autoOpen = true, surface = 'historias', id = 's1' }: { own?: boolean; autoOpen?: boolean; surface?: 'historias' | 'received_story'; id?: string }) {
  return (
    <StoryPassagesProvider duelId="d1" storyId={id} isOwnStory={own} initialCount={0} autoOpen={autoOpen} text={TEXT} surface={surface} locale="es">
      <StoryPassageText text={TEXT} />
      <StoryComments duelId="d1" storyId={id} isOwnStory={own} initialCount={0} autoOpen={autoOpen} locale="es" />
    </StoryPassagesProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  general = [];
  panel = [];
  window.localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
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
  vi.mocked(readingApi.markRead).mockResolvedValue(undefined);
  vi.mocked(passagesWebEnabled).mockResolvedValue(true);
  serve();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const lines = () => document.querySelectorAll('[data-passage-line]');
const textOf = (index: number) => lines()[index].firstChild as Text;
function select(node: Node, from: number, to: number) {
  const range = document.createRange();
  range.setStart(node, from);
  range.setEnd(node, to);
  const selection = window.getSelection() as Selection;
  selection.removeAllRanges();
  selection.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
}
const drops = () => screen.queryAllByRole('button', { name: 'Marcas de este párrafo' });
async function drawn() {
  await waitFor(() => expect(lines()).toHaveLength(3));
}
async function quoteTheSecondLine() {
  select(textOf(1), 4, 20);
  fireEvent.click(await screen.findByRole('button', { name: 'Dejar una Marca' }));
  const dialog = await screen.findByRole('dialog', { name: 'Sobre este fragmento' });
  fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Me heló esa frase' } });
  return dialog;
}

describe('everything off reads exactly as before', () => {
  it('without the switch: no summary request and the plain StoryText', async () => {
    render(<Article passages={false} />);
    await screen.findByText(/Era un ritmo lento/);
    await act(async () => undefined);
    expect(api.summary).not.toHaveBeenCalled();
    expect(lines()).toHaveLength(0);
    expect(document.querySelector('.type-literary-body')?.textContent).toBe(TEXT);
  });

  it('switch on but no passages in the summary', async () => {
    serve({ summary: summaryOf({ passages: null }) });
    render(<Article />);
    await waitFor(() => expect(api.summary).toHaveBeenCalledWith('duel_1', 'story_1', expect.anything()));
    await act(async () => undefined);
    expect(lines()).toHaveLength(0);
    expect(document.querySelector('.type-literary-body')?.textContent).toBe(TEXT);
  });

  it('switch on but a paragraph count that disagrees', async () => {
    serve({ summary: summaryOf({ passages: { paragraphKeys: ['a', 'b'], markedKeys: [], maxQuoteRunes: 300 } }) });
    render(<Article />);
    await waitFor(() => expect(api.summary).toHaveBeenCalled());
    await act(async () => undefined);
    expect(lines()).toHaveLength(0);
  });

  it('never draws places from a preview: with no full text the summary cannot switch the layout on', async () => {
    render(<Article item={story('1', { storyText: '' })} />);
    await waitFor(() => expect(api.summary).toHaveBeenCalled());
    await act(async () => undefined);
    expect(lines()).toHaveLength(0);
    expect(screen.getByText(/Era un ritmo lento/)).toBeTruthy();
  });

  it('a failing summary leaves the relato and its conversation as they were', async () => {
    api.summary.mockRejectedValue(new ApiError(503, 'http'));
    render(<Article />);
    await waitFor(() => expect(api.summary).toHaveBeenCalled());
    await act(async () => undefined);
    expect(lines()).toHaveLength(0);
    expect(screen.getByRole('heading', { name: /Marcas de tinta/ })).toBeTruthy();
  });
});

describe('the text with places and the quote flow', () => {
  it('draws one element per paragraph and a drop only on marked ones', async () => {
    serve({ summary: summaryOf({}, [KEYS[1]]) });
    render(<Article />);
    await drawn();
    expect([...lines()].map((node) => node.textContent)).toEqual(['Primera línea.', 'Era un ritmo lento, de pecho dormido.', 'Y cerró la puerta.']);
    expect(drops()).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Dejar una Marca en este párrafo' })).toHaveLength(3);
    expect(screen.getByText(/Selecciona una frase/)).toBeTruthy();
  });

  it('a selection opens the composer on the quote, publishes it with the passage and the drop appears', async () => {
    api.create.mockResolvedValue({ comment: quoted('new', 'un ritmo lento,', { content: 'Me heló esa frase', canDelete: true }), commentsCount: 1 });
    render(<Harness />);
    await drawn();
    expect(drops()).toHaveLength(0);
    const dialog = await quoteTheSecondLine();
    expect(within(dialog).getByText(/un ritmo lento,/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dejarla' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    expect(api.create).toHaveBeenCalledWith('d1', 's1', expect.any(String), 'Me heló esa frase', { locale: 'es' }, { paragraphKey: KEYS[1], quote: 'un ritmo lento,' });
    await waitFor(() => expect(drops()).toHaveLength(1));
    expect(screen.queryByRole('dialog', { name: 'Sobre este fragmento' })).toBeNull();
    // The conversation shows it at the top with its quote; the hint retires for good.
    expect(await screen.findByText('Me heló esa frase')).toBeTruthy();
    expect(window.localStorage.getItem('inkduel-passage-quoted:me')).toBe('1');
  });

  it('marks the paragraph at once and takes it back when the Marca fails for another reason', async () => {
    let fail!: (error: unknown) => void;
    api.create.mockReturnValue(new Promise((_, reject) => (fail = reject)));
    render(<Harness />);
    await drawn();
    const dialog = await quoteTheSecondLine();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dejarla' }));
    await waitFor(() => expect(drops()).toHaveLength(1));
    await act(async () => fail(new ApiError(429, 'http')));
    await waitFor(() => expect(drops()).toHaveLength(0));
    // No offer for an ordinary failure: the generic error and the text stay.
    expect(screen.queryByText('No pudimos citar este fragmento')).toBeNull();
    expect(within(dialog).getByText('Demasiados intentos. Inténtalo más tarde.')).toBeTruthy();
    expect((within(dialog).getByRole('textbox') as HTMLTextAreaElement).value).toBe('Me heló esa frase');
  });

  it('a margin action pre-selects the paragraph; the general composer never sends a passage', async () => {
    api.create.mockResolvedValue({ comment: marca('g1', { content: 'General' }), commentsCount: 1 });
    render(<Harness />);
    await drawn();
    fireEvent.click(screen.getAllByRole('button', { name: 'Dejar una Marca en este párrafo' })[2]);
    expect(window.getSelection()?.toString()).toBe('Y cerró la puerta.');
    const field = await screen.findByPlaceholderText('Deja tu Marca en este relato…');
    fireEvent.change(field, { target: { value: 'Una Marca general' } });
    fireEvent.submit(field.closest('form') as HTMLFormElement);
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    expect(api.create.mock.calls[0]).toHaveLength(5);
  });

  it('over 300 runes: the limit is shown and nothing opens or is sent', async () => {
    serve({ summary: summaryOf({ passages: { paragraphKeys: KEYS, markedKeys: [], maxQuoteRunes: 300 } }) });
    const long = `Antes.\n${'x'.repeat(301)}\nDespués.`;
    render(
      <StoryPassagesProvider duelId="d1" storyId="s1" isOwnStory={false} initialCount={0} text={long} surface="historias" locale="es">
        <StoryPassageText text={long} />
      </StoryPassagesProvider>,
    );
    await drawn();
    select(textOf(1), 0, 301);
    fireEvent.click(await screen.findByRole('button', { name: 'Dejar una Marca' }));
    expect(await screen.findByText('La cita puede tener hasta 300 caracteres. Achica la selección.')).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Sobre este fragmento' })).toBeNull();
    expect(api.create).not.toHaveBeenCalled();
  });
});

describe('the explicit offer when the quote is refused (§15.8)', () => {
  const offerFor = async (error: unknown) => {
    api.create.mockRejectedValueOnce(error);
    render(<Harness />);
    await drawn();
    const dialog = await quoteTheSecondLine();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dejarla' }));
    return dialog;
  };

  it.each([
    ['503 passages_unavailable', new ApiError(503, 'http', { code: 'passages_unavailable' })],
    ['400 passage_invalid', new ApiError(400, 'http', { code: 'passage_invalid' })],
  ])('%s offers «Dejarla sin cita» with the text kept; accepting sends a plain Marca on a new request id', async (_name, error) => {
    const dialog = await offerFor(error);
    expect(await within(dialog).findByText('No pudimos citar este fragmento')).toBeTruthy();
    expect((within(dialog).getByRole('textbox') as HTMLTextAreaElement).value).toBe('Me heló esa frase');
    expect(api.create).toHaveBeenCalledTimes(1);

    api.create.mockResolvedValueOnce({ comment: marca('plain', { content: 'Me heló esa frase', canDelete: true }), commentsCount: 1 });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dejarla sin cita' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(2));
    const [first, second] = api.create.mock.calls;
    expect(first[5]).toEqual({ paragraphKey: KEYS[1], quote: 'un ritmo lento,' });
    expect(second).toHaveLength(5);
    expect(second[3]).toBe('Me heló esa frase');
    expect(second[2]).not.toBe(first[2]);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Sobre este fragmento' })).toBeNull());
  });

  it('«Cancelar» sends nothing and keeps the text', async () => {
    const dialog = await offerFor(new ApiError(503, 'http', { code: 'passages_unavailable' }));
    await within(dialog).findByText('No pudimos citar este fragmento');
    // The offer's «Cancelar» comes first; the composer has its own below.
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Cancelar' })[0]);
    await waitFor(() => expect(within(dialog).queryByText('No pudimos citar este fragmento')).toBeNull());
    expect(api.create).toHaveBeenCalledTimes(1);
    expect((within(dialog).getByRole('textbox') as HTMLTextAreaElement).value).toBe('Me heló esa frase');
  });

  it('a bare 400 re-reads the summary: no offer while it still carries passages', async () => {
    const dialog = await offerFor(new ApiError(400, 'http'));
    await waitFor(() => expect(api.summary).toHaveBeenCalledTimes(2));
    expect(await within(dialog).findByText('Revisa el comentario e inténtalo de nuevo.')).toBeTruthy();
    expect(screen.queryByText('No pudimos citar este fragmento')).toBeNull();
    expect(api.create).toHaveBeenCalledTimes(1);
  });

  it('a bare 400 offers it once the summary has lost passages', async () => {
    api.create.mockRejectedValueOnce(new ApiError(400, 'http'));
    render(<Harness />);
    await drawn();
    const dialog = await quoteTheSecondLine();
    api.summary.mockResolvedValue(summaryOf({ passages: null }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dejarla' }));
    expect(await within(dialog).findByText('No pudimos citar este fragmento')).toBeTruthy();
  });

  it.each([
    ['409 conflict', new ApiError(409, 'http')],
    ['500', new ApiError(500, 'http')],
    ['network', new ApiError(0, 'network')],
    ['a plain 503 (writes off)', new ApiError(503, 'http')],
  ])('%s is the generic error, never the offer', async (_name, error) => {
    const dialog = await offerFor(error);
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    await act(async () => undefined);
    expect(screen.queryByText('No pudimos citar este fragmento')).toBeNull();
    expect(within(dialog).queryByRole('button', { name: 'Dejarla sin cita' })).toBeNull();
    expect(api.create).toHaveBeenCalledTimes(1);
  });
});

describe('the paragraph panel', () => {
  async function openPanel() {
    fireEvent.click(await screen.findByRole('button', { name: 'Marcas de este párrafo' }));
    return screen.findByRole('dialog', { name: 'Marcas de este párrafo' });
  }

  it('lists the server query for that paragraph, can not start a root and offers «Ver todas las del relato»', async () => {
    serve({ summary: summaryOf({}, [KEYS[1]]), general: [marca('g1'), quoted('q1')], panel: [quoted('q1')] });
    render(<Harness />);
    await drawn();
    const dialog = await openPanel();
    await within(dialog).findByText('Marca q1');
    expect(api.list).toHaveBeenCalledWith('d1', 's1', null, { locale: 'es', passage: KEYS[1] });
    // Filtered by the server: the general Marca is not in the panel.
    expect(within(dialog).queryByText('Marca g1')).toBeNull();
    expect(within(dialog).getByText(/pecho dormido/)).toBeTruthy();
    expect(within(dialog).queryByRole('textbox')).toBeNull();
    expect(within(dialog).getByText('Para citar otra frase, selecciónala en el texto.')).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Ver todas las del relato' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Marcas de este párrafo' })).toBeNull());
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(await screen.findByText('Marca g1')).toBeTruthy();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('answers a Marca from the panel', async () => {
    serve({ summary: summaryOf({}, [KEYS[1]]), general: [quoted('q1')], panel: [quoted('q1')] });
    replies.create.mockResolvedValue({
      reply: { id: 'r1', author: author('yo'), content: 'Gracias', createdAt: '2026-11-01T12:00:00Z', canDelete: true, parentReplyId: '', replyingTo: '' } satisfies StoryCommentReply,
      replyCount: 1,
    });
    render(<Harness />);
    await drawn();
    const dialog = await openPanel();
    await within(dialog).findByText('Marca q1');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Responder' }));
    const field = await within(dialog).findByPlaceholderText('Escribe tu respuesta…');
    fireEvent.change(field, { target: { value: 'Gracias' } });
    fireEvent.submit(field.closest('form') as HTMLFormElement);
    await waitFor(() => expect(replies.create).toHaveBeenCalledTimes(1));
    expect(replies.create.mock.calls[0].slice(0, 2)).toEqual(['d1', 's1']);
    expect(replies.create.mock.calls[0][2]).toBe('q1');
    expect(await within(dialog).findByText('Gracias')).toBeTruthy();
  });

  it('closing after a mutation reloads the general first page and the summary; closing untouched does not', async () => {
    serve({ summary: summaryOf({}, [KEYS[1]]), general: [quoted('q1')], panel: [quoted('q1')] });
    replies.create.mockResolvedValue({
      reply: { id: 'r1', author: author('yo'), content: 'Gracias', createdAt: '2026-11-01T12:00:00Z', canDelete: true, parentReplyId: '', replyingTo: '' },
      replyCount: 1,
    });
    render(<Harness />);
    await drawn();
    await screen.findByText('Marca q1', { selector: 'p' });
    const generalLoads = () => api.list.mock.calls.filter((call) => !call[3].passage).length;

    // Untouched: nothing is re-read.
    let dialog = await openPanel();
    await within(dialog).findByText(/Marca q1/);
    const summaryBefore = api.summary.mock.calls.length;
    const loadsBefore = generalLoads();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    await act(async () => undefined);
    expect(generalLoads()).toBe(loadsBefore);
    expect(api.summary).toHaveBeenCalledTimes(summaryBefore);

    // After a reply: both come back.
    dialog = await openPanel();
    await within(dialog).findByText(/Marca q1/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Responder' }));
    const field = await within(dialog).findByPlaceholderText('Escribe tu respuesta…');
    fireEvent.change(field, { target: { value: 'Gracias' } });
    fireEvent.submit(field.closest('form') as HTMLFormElement);
    await within(dialog).findByText('Gracias');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(generalLoads()).toBe(loadsBefore + 1));
    await waitFor(() => expect(api.summary).toHaveBeenCalledTimes(summaryBefore + 1));
  });

  it('an empty answer for a marked paragraph hides its drop for the session', async () => {
    serve({ summary: summaryOf({}, [KEYS[1]]), panel: [] });
    render(<Harness />);
    await drawn();
    const dialog = await openPanel();
    expect(await within(dialog).findByText('Todavía no hay Marcas en este párrafo.')).toBeTruthy();
    await waitFor(() => expect(drops()).toHaveLength(0));
  });
});

describe('jumping to a quote', () => {
  it('a located quote scrolls to its paragraph and marks the first occurrence', async () => {
    serve({ summary: summaryOf({}, [KEYS[1]]), general: [quoted('q1'), quoted('q2', 'frase vieja', { passage: { paragraphKey: KEYS[1], located: false, quote: null } })] });
    render(<Harness />);
    await drawn();
    const jump = await screen.findByRole('button', { name: 'Sobre este fragmento: pecho dormido' });
    expect(screen.getByText('Sobre un fragmento que cambió')).toBeTruthy();
    (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();
    fireEvent.click(jump);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    await waitFor(() => expect(document.querySelector('[data-passage-line] mark')?.textContent).toBe('pecho dormido'));
  });

  it('without a layout (flag off) the quote is only text', async () => {
    serve({ general: [quoted('q1')] });
    render(<StoryComments duelId="d1" storyId="s1" isOwnStory={false} initialCount={1} autoOpen locale="es" />);
    await screen.findByText(/pecho dormido/);
    expect(screen.queryByRole('button', { name: /Sobre este fragmento/ })).toBeNull();
  });
});

describe('your own relato', () => {
  it('shows the drops and the panel but offers no quoting, no hint and no root', async () => {
    serve({ summary: summaryOf({}, [KEYS[1]]), panel: [quoted('q1')], general: [quoted('q1')] });
    render(<Harness own />);
    await drawn();
    expect(await screen.findAllByRole('button', { name: 'Marcas de este párrafo' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Dejar una Marca en este párrafo' })).toBeNull();
    expect(screen.queryByText(/Selecciona una frase/)).toBeNull();
    select(textOf(1), 4, 20);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 40)));
    expect(screen.queryByRole('button', { name: 'Dejar una Marca' })).toBeNull();
    expect(screen.queryByPlaceholderText('Deja tu Marca en este relato…')).toBeNull();
    fireEvent.click(drops()[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Marcas de este párrafo' });
    await within(dialog).findByText(/Marca q1/);
    expect(within(dialog).queryByText('Para citar otra frase, selecciónala en el texto.')).toBeNull();
  });
});

describe('the reader on screen', () => {
  it('a hidden reader ignores selections; shown again it offers the action', async () => {
    const view = render(<Article hidden />);
    await drawn();
    select(textOf(1), 4, 20);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 40)));
    expect(screen.queryByRole('button', { name: 'Dejar una Marca' })).toBeNull();
    view.rerender(<Article />);
    select(textOf(1), 4, 20);
    expect(await screen.findByRole('button', { name: 'Dejar una Marca' })).toBeTruthy();
  });

  it('changing the relato (key) resets the selection, the open composer and the conversation', async () => {
    const view = render(<Article />);
    await drawn();
    await quoteTheSecondLine();
    view.rerender(<Article item={story('2')} />);
    await waitFor(() => expect(api.summary).toHaveBeenCalledWith('duel_2', 'story_2', expect.anything()));
    expect(screen.queryByRole('dialog', { name: 'Sobre este fragmento' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Dejar una Marca' })).toBeNull();
    await drawn();
    expect(screen.getAllByRole('heading', { name: /Marcas de tinta/ })).toHaveLength(1);
  });
});

describe('analytics', () => {
  it('sends the quote events with surface and context, no ids and no text', async () => {
    serve({ summary: summaryOf({}, [KEYS[0]]) });
    api.create.mockResolvedValue({ comment: quoted('n1', 'un ritmo lento,'), commentsCount: 1 });
    const view = render(<Harness id="analytics-1" />);
    await drawn();
    await waitFor(() => expect(track).toHaveBeenCalledWith('ink_mark_quote_action_shown', { surface: 'duel_story', context: 'historias' }));
    // Once per relato and page session.
    view.unmount();
    render(<Harness id="analytics-1" />);
    await drawn();
    await act(async () => undefined);
    expect(vi.mocked(track).mock.calls.filter(([name]) => name === 'ink_mark_quote_action_shown')).toHaveLength(1);

    fireEvent.click(await screen.findByRole('button', { name: 'Marcas de este párrafo' }));
    expect(track).toHaveBeenCalledWith('ink_mark_passage_thread_opened', { surface: 'duel_story', context: 'historias', has_passage: true, source: 'gota' });
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar' }));

    const dialog = await quoteTheSecondLine();
    expect(track).toHaveBeenCalledWith('ink_mark_composer_opened', { surface: 'duel_story', context: 'historias', has_passage: true, source: 'selection' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dejarla' }));
    await waitFor(() => expect(track).toHaveBeenCalledWith('ink_mark_created', { surface: 'duel_story', context: 'historias', has_passage: true, source: 'selection' }));
    for (const [, params] of vi.mocked(track).mock.calls) {
      expect(JSON.stringify(params ?? {})).not.toMatch(/analytics-1|d1|heló|bbbb|aaaa/);
    }
  });
});

describe('the received-comment page', () => {
  const served = { author: { id: 'me' }, prompt: 'Una puerta', text: TEXT };

  it('draws places and the panel when the switch is on and the summary brings passages', async () => {
    vi.mocked(apiGet).mockResolvedValue(served);
    serve({ summary: summaryOf({}, [KEYS[1]]), general: [quoted('q1')] });
    render(<ReceivedStoryView duelId="d9" storyId="s9" commentId="q1" />);
    await drawn();
    expect(await screen.findAllByRole('button', { name: 'Marcas de este párrafo' })).toHaveLength(1);
    // It is your relato: no quoting.
    expect(screen.queryByRole('button', { name: 'Dejar una Marca en este párrafo' })).toBeNull();
    // The focused root is still found, with its quote.
    expect(await screen.findByRole('button', { name: 'Sobre este fragmento: pecho dormido' })).toBeTruthy();
  });

  it('never waits for Remote Config: the text and the conversation render at once, with no summary', async () => {
    vi.mocked(passagesWebEnabled).mockReturnValue(new Promise(() => undefined));
    vi.mocked(apiGet).mockResolvedValue(served);
    serve({ general: [marca('g1')] });
    render(<ReceivedStoryView duelId="d9" storyId="s9" commentId={null} />);
    await screen.findByText(/Era un ritmo lento/);
    await screen.findByText('Marca g1');
    expect(lines()).toHaveLength(0);
    expect(api.summary).not.toHaveBeenCalled();
  });

  it('when the switch resolves late the plain text turns into places without remounting the conversation', async () => {
    let resolve!: (value: boolean) => void;
    vi.mocked(passagesWebEnabled).mockReturnValue(new Promise((res) => (resolve = res)));
    vi.mocked(apiGet).mockResolvedValue(served);
    serve({ summary: summaryOf({}, [KEYS[1]]), general: [marca('g1')] });
    render(<ReceivedStoryView duelId="d9" storyId="s9" commentId={null} />);
    await screen.findByText('Marca g1');
    expect(lines()).toHaveLength(0);
    const listCalls = api.list.mock.calls.length;
    await act(async () => resolve(true));
    await drawn();
    expect(api.list.mock.calls.length).toBe(listCalls);
    expect(screen.getByText('Marca g1')).toBeTruthy();
  });

  it('with the switch off it is the page of before and no summary is requested', async () => {
    vi.mocked(passagesWebEnabled).mockResolvedValue(false);
    vi.mocked(apiGet).mockResolvedValue(served);
    serve({ general: [marca('g1')] });
    render(<ReceivedStoryView duelId="d9" storyId="s9" commentId={null} />);
    await screen.findByText(/Era un ritmo lento/);
    await screen.findByText('Marca g1');
    expect(lines()).toHaveLength(0);
    expect(api.summary).not.toHaveBeenCalled();
  });
});

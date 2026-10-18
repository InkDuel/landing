import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/session/api';
import { type StoryComment, type StoryCommentReply, storyCommentsApi, storyRepliesApi } from '@/lib/session/marks';

import { StoryComments } from './story-comments';

vi.mock('@/lib/session/auth-context', () => ({ useSession: () => ({ user: { id: 'me', username: 'yo' } }) }));
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/session/marks', async (original) => {
  const actual = await original<typeof import('@/lib/session/marks')>();
  return {
    ...actual,
    storyCommentsApi: { ...actual.storyCommentsApi, list: vi.fn() },
    storyRepliesApi: { list: vi.fn(), create: vi.fn(), remove: vi.fn(), report: vi.fn() },
  };
});

const author = (name: string) => ({ userId: `u-${name}`, displayName: name });

const marca = (over: Partial<StoryComment> = {}): StoryComment => ({
  id: 'm1',
  author: author('ana'),
  content: 'Qué final.',
  createdAt: '2026-10-16T10:00:00Z',
  canDelete: false,
  replyCount: 0,
  ...over,
});

const reply = (id: string, over: Partial<StoryCommentReply> = {}): StoryCommentReply => ({
  id,
  author: author('beto'),
  content: `Respuesta ${id}`,
  createdAt: `2026-10-16T1${id.slice(-1)}:00:00Z`,
  canDelete: false,
  parentReplyId: '',
  replyingTo: '',
  ...over,
});

function listing(items: StoryComment[], canReply = true) {
  vi.mocked(storyCommentsApi.list).mockResolvedValue({ items, nextCursor: null, commentsCount: items.length, canComment: true, canReply });
}

const show = (isOwnStory = false) =>
  render(<StoryComments duelId="d1" storyId="s1" isOwnStory={isOwnStory} initialCount={1} autoOpen locale="es" />);

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
  // jsdom has no modal dialogs.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('replies inside duel story Marcas', () => {
  it('reads a thread only when asked, and lets the relato author answer', async () => {
    listing([marca({ replyCount: 2 })]);
    vi.mocked(storyRepliesApi.list).mockResolvedValue({
      items: [reply('r2'), reply('r1', { author: author('cami') })],
      nextCursor: null,
      replyCount: 2,
      canReply: true,
    });
    show(true);

    await screen.findByText('Qué final.');
    expect(storyRepliesApi.list).not.toHaveBeenCalled();
    // No field for a Marca on your own relato, but «Responder» is there.
    expect(screen.queryByPlaceholderText('Deja tu Marca en este relato…')).toBeNull();
    expect(screen.getByRole('button', { name: 'Responder' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Ver 2 respuestas' }));
    await screen.findByText('Respuesta r1');
    const texts = screen.getAllByText(/^Respuesta r/).map((node) => node.textContent);
    expect(texts).toEqual(['Respuesta r1', 'Respuesta r2']);
    expect(screen.getByRole('button', { name: 'Ocultar respuestas' })).toBeTruthy();
  });

  it('offers nothing to answer when the backend says canReply is false', async () => {
    listing([marca({ replyCount: 1 })], false);
    show();
    await screen.findByText('Qué final.');
    expect(screen.queryByRole('button', { name: 'Responder' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver 1 respuesta' })).toBeTruthy();
  });

  it('answers a reply in the same thread, optimistically, adopting the server count', async () => {
    listing([marca({ replyCount: 1 })]);
    vi.mocked(storyRepliesApi.list).mockResolvedValue({ items: [reply('r1')], nextCursor: null, replyCount: 1, canReply: true });
    const sent = deferred<{ reply: StoryCommentReply; replyCount: number }>();
    vi.mocked(storyRepliesApi.create).mockReturnValue(sent.promise);
    show();

    fireEvent.click(await screen.findByRole('button', { name: 'Ver 1 respuesta' }));
    const answered = await screen.findByText('Respuesta r1');
    const item = answered.closest('li') as HTMLElement;
    fireEvent.click(within(item).getByRole('button', { name: 'Responder' }));
    expect(screen.getByText('En respuesta a beto')).toBeTruthy();

    const replyField = screen.getByPlaceholderText('Escribe tu respuesta…');
    fireEvent.change(replyField, { target: { value: 'Gracias, beto.' } });
    fireEvent.click(within(replyField.closest('form') as HTMLElement).getByRole('button', { name: 'Dejarla' }));

    // Pending first: the text is in the thread before the server answers.
    const pendingItem = (await screen.findByText('Gracias, beto.', { selector: 'p' })).closest('li') as HTMLElement;
    expect(within(pendingItem).getByText('Enviando Marca')).toBeTruthy();
    const call = vi.mocked(storyRepliesApi.create).mock.calls[0];
    expect(call.slice(0, 6)).toEqual(['d1', 's1', 'm1', expect.any(String), 'Gracias, beto.', 'r1']);

    await act(async () =>
      sent.resolve({
        reply: reply('r3', { author: author('yo'), content: 'Gracias, beto.', canDelete: true, parentReplyId: 'r1', replyingTo: 'beto' }),
        replyCount: 5,
      }),
    );
    expect(screen.queryByText('Enviando Marca')).toBeNull();
    expect(screen.getAllByText('Gracias, beto.', { selector: 'p' })).toHaveLength(1);
    expect(screen.getByText('Tu respuesta quedó.')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Escribe tu respuesta…')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar respuestas' }));
    expect(screen.getByRole('button', { name: 'Ver 5 respuestas' })).toBeTruthy();
  });

  it('rolls a failed reply back and keeps the draft; 503 takes «Responder» away', async () => {
    listing([marca()]);
    vi.mocked(storyRepliesApi.create).mockRejectedValue(new ApiError(503, 'http'));
    show();

    fireEvent.click(await screen.findByRole('button', { name: 'Responder' }));
    const field = screen.getByPlaceholderText('Escribe tu respuesta…');
    fireEvent.change(field, { target: { value: 'No llegó.' } });
    fireEvent.click(within(field.closest('form') as HTMLElement).getByRole('button', { name: 'Dejarla' }));

    await screen.findByText('Las Marcas no están disponibles por ahora.');
    expect((field as HTMLTextAreaElement).value).toBe('No llegó.');
    expect(screen.queryByText('Enviando Marca')).toBeNull();
    expect(screen.queryByText('No llegó.', { selector: 'p' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('button', { name: 'Responder' })).toBeNull();
  });

  it('deletes your reply at once and puts it back if the server refuses', async () => {
    listing([marca({ replyCount: 1 })]);
    vi.mocked(storyRepliesApi.list).mockResolvedValue({
      items: [reply('r1', { author: author('yo'), canDelete: true })],
      nextCursor: null,
      replyCount: 1,
      canReply: true,
    });
    vi.mocked(storyRepliesApi.remove).mockRejectedValue(new ApiError(0, 'network'));
    show();

    fireEvent.click(await screen.findByRole('button', { name: 'Ver 1 respuesta' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Borrar Marca' }));
    expect(screen.getByText('¿Borrar esta respuesta?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));

    expect(storyRepliesApi.remove).toHaveBeenCalledWith('d1', 's1', 'm1', 'r1', { locale: 'es' });
    await waitFor(() => expect(screen.getByText('Respuesta r1')).toBeTruthy());
    expect(await screen.findByText('Revisa tu conexión e inténtalo de nuevo.')).toBeTruthy();
  });
});

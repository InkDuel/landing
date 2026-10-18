import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { storyCommentsApi } from '@/lib/session/marks';
import { type GalleryStory, NO_REACTIONS } from '@/lib/session/models';
import { readingApi } from '@/lib/session/reading';

import { ModeAction, type ReaderLinks, ReadingMode } from './historias-reading';

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('@/lib/session/auth-context', () => ({ useSession: () => ({ user: { id: 'me', username: 'yo' } }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/session/reading', async (original) => {
  const actual = await original<typeof import('@/lib/session/reading')>();
  return { ...actual, readingApi: { next: vi.fn(), markRead: vi.fn(), setReaction: vi.fn() } };
});
vi.mock('@/lib/session/marks', async (original) => {
  const actual = await original<typeof import('@/lib/session/marks')>();
  return { ...actual, storyCommentsApi: { ...actual.storyCommentsApi, list: vi.fn() } };
});

const story = (id: string, over: Partial<GalleryStory> = {}): GalleryStory => ({
  key: `duel_${id}~story_${id}`,
  duelId: `duel_${id}`,
  storyId: `story_${id}`,
  prompt: `Consigna ${id}`,
  storyPreview: `Relato ${id}`,
  storyText: `Relato ${id}`,
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

/** Every observer, so a test decides what is on screen. */
const observers: { callback: IntersectionObserverCallback; nodes: Element[] }[] = [];
function setVisible(node: Element, isIntersecting: boolean) {
  for (const observer of observers) {
    if (observer.nodes.includes(node)) {
      observer.callback([{ target: node, isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
    }
  }
}

const links = (feed: GalleryStory[], over: Partial<ReaderLinks> = {}): ReaderLinks => ({
  flags: { queue: true, reactions: true },
  viewerId: 'me',
  feed,
  onStoryRead: vi.fn(),
  onReactionSaved: vi.fn(),
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  observers.length = 0;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      private readonly entry: { callback: IntersectionObserverCallback; nodes: Element[] };
      constructor(callback: IntersectionObserverCallback) {
        this.entry = { callback, nodes: [] };
        observers.push(this.entry);
      }
      observe(node: Element) {
        this.entry.nodes.push(node);
      }
      disconnect() {
        this.entry.nodes = [];
      }
    },
  );
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  // A variable, not a literal: it also fits once Marcas carry canReply.
  const noMarcas = { items: [], nextCursor: null, commentsCount: 0, canComment: true, canReply: false };
  vi.mocked(storyCommentsApi.list).mockResolvedValue(noMarcas);
  vi.mocked(readingApi.markRead).mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Historias reading mode', () => {
  it('lands on the queue pick without marking it, and marks it when the reader scrolls to the end', async () => {
    vi.mocked(readingApi.next).mockResolvedValueOnce({ items: [story('q'), story('r')], exhausted: false });
    render(<ReadingMode links={links([story('l')])} listStatus="ready" listError={null} onShowList={vi.fn()} locale="es" />);

    await screen.findByText('Relato q');
    // Let the reader's effects (observer, scroll listener) attach.
    await act(async () => undefined);
    expect(readingApi.next).toHaveBeenCalledWith(null, [], 3, expect.objectContaining({ locale: 'es' }));
    const end = screen.getByText('Fin del relato');

    // Already in view on landing (a short relato): not reading yet.
    act(() => setVisible(end, true));
    expect(readingApi.markRead).not.toHaveBeenCalled();

    // The reader's own scroll brings the end in: read, once.
    Object.defineProperty(window, 'scrollY', { value: 640, configurable: true });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('scroll'));
    });
    expect(readingApi.markRead).toHaveBeenCalledTimes(1);
    expect(readingApi.markRead).toHaveBeenCalledWith('duel_q', 'story_q', { locale: 'es' });
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });

    // The rest of the queue's answer is already «Siguiente relato».
    expect(screen.getByRole('button', { name: /Siguiente relato/ })).toBeTruthy();
  });

  it('without the queue it never lands on a read or own relato', async () => {
    vi.mocked(readingApi.next).mockRejectedValueOnce(new Error('503'));
    const onShowList = vi.fn();
    render(
      <ReadingMode
        links={links([story('read', { readByMe: true }), story('mine', { authorId: 'me' })])}
        listStatus="ready"
        listError={null}
        onShowList={onShowList}
        locale="es"
      />,
    );

    await screen.findByText('Leíste todos los relatos nuevos');
    expect(screen.queryByText('Relato read')).toBeNull();
    expect(screen.queryByText('Relato mine')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver la lista' }));
    expect(onShowList).toHaveBeenCalled();
  });

  it('reacts with one tap and shows the server count; the author only reads the counts', async () => {
    vi.mocked(readingApi.next).mockResolvedValueOnce({ items: [story('q')], exhausted: false }).mockResolvedValue({ items: [], exhausted: false });
    vi.mocked(readingApi.setReaction).mockResolvedValue({ storyId: 'story_q', myReaction: 'moved', reactionCounts: { hooked: 0, moved: 4, surprised: 0 } });
    const reader = links([]);
    render(<ReadingMode links={reader} listStatus="ready" listError={null} onShowList={vi.fn()} locale="es" />);

    const moved = await screen.findByRole('button', { name: 'Me emocionó: 0 lectores' });
    await act(async () => {
      fireEvent.click(moved);
    });
    expect(readingApi.setReaction).toHaveBeenCalledWith('duel_q', 'story_q', 'moved', { locale: 'es' });
    const selected = screen.getByRole('button', { name: 'Me emocionó: 4 lectores' });
    expect(selected.getAttribute('aria-pressed')).toBe('true');
    expect(reader.onReactionSaved).toHaveBeenCalledWith(expect.objectContaining({ key: 'duel_q~story_q', myReaction: 'moved' }));
    // Reacting is reading.
    expect(readingApi.markRead).toHaveBeenCalledWith('duel_q', 'story_q', { locale: 'es' });

    cleanup();
    vi.mocked(readingApi.next).mockResolvedValueOnce({ items: [story('own', { authorId: 'me', reactionCounts: { hooked: 2, moved: 0, surprised: 0 } })], exhausted: false });
    render(<ReadingMode links={links([])} listStatus="ready" listError={null} onShowList={vi.fn()} locale="es" />);
    await screen.findByText('Cómo reaccionaron tus lectores');
    expect(screen.queryByRole('button', { name: /Me atrapó/ })).toBeNull();
    expect(screen.getByRole('img', { name: 'Me atrapó: 2 lectores' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Deja tu Marca' })).toBeNull();
  });

  it('the title-row action names the other mode', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ModeAction mode="reading" onChange={onChange} locale="es" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver lista' }));
    expect(onChange).toHaveBeenCalledWith('list');
    rerender(<ModeAction mode="list" onChange={onChange} locale="es" />);
    fireEvent.click(screen.getByRole('button', { name: 'Leer de corrido' }));
    expect(onChange).toHaveBeenLastCalledWith('reading');
  });
});

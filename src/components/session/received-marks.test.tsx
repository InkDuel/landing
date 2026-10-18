import React from 'react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/session/api';
import {
  type ReceivedMark,
  inkMarksApi,
  parseStoryRepliesReceived,
  parseWorkRepliesReceived,
  storyCommentsApi,
} from '@/lib/session/marks';

import { ReceivedMarksPreview } from './received-marks';

vi.mock('@/lib/session/auth-context', () => ({ useSession: () => ({ user: { id: 'me' } }) }));
vi.mock('./session-root', () => ({ useSessionLocale: () => ({ locale: 'es' }) }));
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
    storyCommentsApi: { ...actual.storyCommentsApi, received: vi.fn(), repliesReceived: vi.fn() },
    inkMarksApi: { ...actual.inkMarksApi, received: vi.fn(), repliesReceived: vi.fn() },
  };
});

const author = { userId: 'u-beto', displayName: 'beto', avatar: 'https://example.com/a.png' };

describe('reply sources: parsing', () => {
  it('keeps well-formed rows, drops what cannot be placed or opened, never reads the avatar', () => {
    const story = parseStoryRepliesReceived({
      items: [
        {
          reply: { id: 'r1', author, content: 'Gracias', createdAt: '2026-10-16T10:00:00Z', parentReplyId: 'r0', replyingTo: 'ana' },
          rootCommentId: 'c1',
          story: { duelId: 'd1', storyId: 's1', prompt: 'Una llave' },
          isStoryAuthor: true,
        },
        { reply: { id: 'r2', author, content: 'x', createdAt: '2026-10-16T10:00:00Z' }, story: { duelId: 'd1', storyId: 's1' } },
        { reply: { id: 'r3', author, content: 'x', createdAt: 'ayer' }, rootCommentId: 'c1', story: { duelId: 'd1', storyId: 's1' } },
        { rootCommentId: 'c1', story: { duelId: 'd1', storyId: 's1' } },
      ],
      nextCursor: 'next',
    });
    expect(story).toEqual({
      items: [
        {
          source: 'duelStoryReply',
          id: 'r1',
          author: { userId: 'u-beto', displayName: 'beto' },
          content: 'Gracias',
          createdAt: '2026-10-16T10:00:00Z',
          duelId: 'd1',
          storyId: 's1',
          prompt: 'Una llave',
          rootCommentId: 'c1',
          isStoryAuthor: true,
        },
      ],
      nextCursor: 'next',
    });

    const work = parseWorkRepliesReceived({
      items: [
        {
          id: 'w1',
          author,
          content: 'Respuesta',
          createdAt: '2026-10-16T09:00:00Z',
          rootId: 'm1',
          isWorkAuthor: false,
          work: { id: 'o1', title: 'La casa' },
          chapter: { id: 'ch1', orderIndex: 2, title: 'El sótano' },
        },
        { id: 'w2', author, content: 'x', createdAt: '2026-10-16T09:00:00Z', work: { id: 'o1' }, chapter: { id: 'ch1' } },
        { id: 'w3', author, content: 'x', createdAt: '2026-10-16T09:00:00Z', rootId: 'm1', work: { id: 'o1' } },
      ],
    });
    expect(work.nextCursor).toBeNull();
    expect(work.items).toEqual([
      {
        source: 'workChapterReply',
        id: 'w1',
        author: { userId: 'u-beto', displayName: 'beto' },
        content: 'Respuesta',
        createdAt: '2026-10-16T09:00:00Z',
        workId: 'o1',
        workTitle: 'La casa',
        chapterId: 'ch1',
        chapterOrderIndex: 2,
        chapterTitle: 'El sótano',
        rootId: 'm1',
        isWorkAuthor: false,
      },
    ]);
  });
});

const storyMark = (id: string, createdAt: string): ReceivedMark => ({
  source: 'duelStory',
  id,
  author: { userId: 'u-ana', displayName: 'ana' },
  content: `Marca ${id}`,
  createdAt,
  duelId: 'd0',
  storyId: 's0',
  prompt: 'Mi consigna',
});

const storyReply = (id: string, createdAt: string, isStoryAuthor: boolean): ReceivedMark => ({
  source: 'duelStoryReply',
  id,
  author: { userId: `u-${id}`, displayName: id === 'r1' ? 'beto' : 'carla' },
  content: `Respuesta ${id}`,
  createdAt,
  duelId: 'd1',
  storyId: 's1',
  prompt: 'Una llave',
  rootCommentId: 'c1',
  isStoryAuthor,
});

const page = (items: ReceivedMark[]) => ({ items, nextCursor: null });

describe('«Marcas recibidas» with replies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });
  afterEach(cleanup);

  it('merges replies by time with the other sources, counts them as new, and omits a source without the route', async () => {
    // Seen up to 08:00: the 07:00 Marca is old, both replies are new.
    window.localStorage.setItem('inkduel-marks-seen:me', '2026-10-16T08:00:00Z');
    vi.mocked(storyCommentsApi.received).mockResolvedValue(page([storyMark('c0', '2026-10-16T07:00:00Z')]));
    vi.mocked(inkMarksApi.received).mockRejectedValue(new ApiError(503, 'http'));
    vi.mocked(storyCommentsApi.repliesReceived).mockResolvedValue(
      page([storyReply('r2', '2026-10-16T09:00:00Z', true), storyReply('r1', '2026-10-16T10:00:00Z', false)]),
    );
    // Production today: the route does not exist yet.
    vi.mocked(inkMarksApi.repliesReceived).mockRejectedValue(new ApiError(404, 'http'));

    render(<ReceivedMarksPreview />);
    const rows = await screen.findAllByRole('listitem');
    expect(rows.map((row) => within(row).getAllByRole('link').at(-1)?.textContent)).toEqual(['Respuesta r1', 'Respuesta r2', 'Marca c0']);
    expect(screen.getByText('2 nuevas')).toBeTruthy();
    expect(screen.queryByText('Algunas Marcas no se pudieron cargar.')).toBeNull();

    // Someone else's reply: their @name and the relato it answers in.
    expect(rows[0].textContent).toContain('@beto respondió a tu Marca');
    expect(within(rows[0]).getByRole('link', { name: '@beto' }).getAttribute('href')).toBe('/profile/u-r1');
    expect(within(rows[0]).getByText('en el relato de «Una llave»')).toBeTruthy();
    expect(within(rows[0]).getByRole('link', { name: 'Respuesta r1' }).getAttribute('href')).toBe(
      '/duels/d1?story=s1&comment=c1&lang=es',
    );
    // The relato's author: said as such.
    expect(within(rows[1]).getByText('El autor respondió a tu Marca')).toBeTruthy();
    // Your own relato keeps its copy.
    expect(within(rows[2]).getByText('en tu relato de «Mi consigna»')).toBeTruthy();
    await waitFor(() => expect(window.localStorage.getItem('inkduel-marks-seen:me')).toBe('2026-10-16T10:00:00.000Z'));
  });

  it('shows a reply on your own Work once, as the received Marca, counted once', async () => {
    const work = { workId: 'o1', workTitle: 'La casa', chapterId: 'ch1', chapterOrderIndex: 1, chapterTitle: '', rootId: 'm1' };
    const shared = { id: 'w1', author: { userId: 'u-beto', displayName: 'beto' }, content: 'Respuesta', createdAt: '2026-10-16T10:00:00Z', ...work };
    vi.mocked(storyCommentsApi.received).mockResolvedValue(page([]));
    vi.mocked(storyCommentsApi.repliesReceived).mockResolvedValue(page([]));
    vi.mocked(inkMarksApi.received).mockResolvedValue(page([{ source: 'workChapter', ...shared }]));
    vi.mocked(inkMarksApi.repliesReceived).mockResolvedValue(page([{ source: 'workChapterReply', ...shared, isWorkAuthor: false }]));

    render(<ReceivedMarksPreview />);
    const rows = await screen.findAllByRole('listitem');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).not.toContain('respondió a tu Marca');
    expect(screen.getByText('1 nueva')).toBeTruthy();
  });
});

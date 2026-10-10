import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/session/api';
import { parseDuelDetail, parseDuelHistory, duelsApi } from '@/lib/session/duels';
import { RankedSession } from '@/lib/session/ranked-session';
import { DuelHistory, DuelHistoryRow, RankedQueue } from './duel-history';
import { DuelResult, DuelResultView } from './duel-result';
import { RankedEditor } from './ranked';

vi.mock('@/lib/session/auth-context', () => ({ useSession: () => ({ user: { id: 'me' } }) }));
vi.mock('./session-root', () => ({ useSessionLocale: () => ({ locale: 'es' }) }));
vi.mock('./ranked-runtime', () => ({ useRanked: () => ({ runtime: { reset: vi.fn() } }) }));
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/session/duels', async (original) => {
  const actual = await original<typeof import('@/lib/session/duels')>();
  return { ...actual, duelsApi: { ...actual.duelsApi, history: vi.fn(), detail: vi.fn(), status: vi.fn(), queued: vi.fn() } };
});
const row = parseDuelHistory({
  duels: [
    {
      id: 'duel/encoded',
      prompt: 'Una llave',
      createdAt: '2026-10-10T12:00:00Z',
      status: 'won',
      outcome: 'won',
      kind: 'ranked_human',
      isRanked: true,
      userA: { id: 'me', username: 'Autor' },
      userB: { id: 'rival', username: 'Rival' },
      scoreMine: 8.5,
      scoreOther: 7,
      rankDelta: { rankPointsDelta: 12 },
    },
  ],
  cursor: '',
}).items[0];
const detail = parseDuelDetail({
  id: 'd',
  prompt: 'Una llave',
  userA: { id: 'me', username: 'Autor' },
  userB: { id: 'rival', username: 'Rival' },
  storyA: { text: 'Mi relato' },
  storyB: { text: 'Otro relato' },
  scoreA: 8.5,
  scoreB: 7,
  winnerId: 'me',
  reason: 'Veredicto del servidor',
  feedback: 'Feedback privado',
  rankDelta: { rankPointsDelta: 12 },
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Profile history and visibility', () => {
  it('expands a history row with the encoded detail link and server score', () => {
    render(<DuelHistoryRow duel={row} ownerId="me" privateDetail={false} own locale="es" />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Una llave')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver duelo completo' }).getAttribute('href')).toBe('/duels/duel%2Fencoded?lang=es');
    expect(screen.getByText(/Puntuación: 8,5/)).toBeTruthy();
  });
  it('disables expansion and detail navigation in a private other profile', () => {
    render(<DuelHistoryRow duel={{ ...row, prompt: '' }} ownerId="me" privateDetail own={false} locale="es" />);
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Detalle privado')).toBeTruthy();
  });
  it('loads cursor pages and provides navigation for completed duels', async () => {
    vi.mocked(duelsApi.history)
      .mockResolvedValueOnce({ items: [row], nextCursor: 'next' })
      .mockResolvedValueOnce({ items: [{ ...row, id: 'd2' }], nextCursor: null });
    render(<DuelHistory ownerId="me" locale="es" />);
    await screen.findByText(/Autor · Rival/);
    fireEvent.click(screen.getByRole('button', { name: 'Ver más duelos' }));
    await waitFor(() => expect(screen.getAllByText(/Autor · Rival/)).toHaveLength(2));
    expect(vi.mocked(duelsApi.history).mock.calls[1].slice(0, 3)).toEqual(['me', 'es', 'next']);
    expect(screen.queryByRole('button', { name: 'Ver más duelos' })).toBeNull();
  });
  it('shows an explicit empty state', async () => {
    vi.mocked(duelsApi.history).mockResolvedValue({ items: [], nextCursor: null });
    render(<DuelHistory ownerId="me" locale="es" />);
    expect(await screen.findByText('Todavía no hay duelos')).toBeTruthy();
  });
  it('keeps a history failure distinct from an empty list and allows retry', async () => {
    vi.mocked(duelsApi.history).mockRejectedValueOnce(new ApiError(0, 'network')).mockResolvedValueOnce({ items: [], nextCursor: null });
    render(<DuelHistory ownerId="me" locale="es" />);
    await screen.findByText('No se pudo cargar el historial.');
    expect(screen.queryByText('Todavía no hay duelos')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Todavía no hay duelos')).toBeTruthy();
  });
  it('shows owner-only async pending submissions separately from duel history', async () => {
    vi.mocked(duelsApi.queued).mockResolvedValue([{ id: 's', status: 'pending', createdAt: '', expiresAt: '' }]);
    render(<RankedQueue locale="es" />);
    expect(await screen.findByText('Ranked pendientes')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Ver duelo completo' })).toBeNull();
  });
});
describe('Results and pending states', () => {
  it('renders the backend winner, scores, verdict and both stories', () => {
    render(<DuelResultView duel={detail} locale="es" />);
    expect(screen.getByRole('heading', { name: 'Ganador: Autor' })).toBeTruthy();
    for (const text of ['Veredicto del servidor', 'Feedback privado', 'Mi relato', 'Otro relato', '8,5'])
      expect(screen.getByText(text)).toBeTruthy();
  });
  it('does not fabricate feedback or story text withheld by the server', () => {
    render(<DuelResultView duel={{ ...detail, reason: '', feedback: '', storyA: '', storyB: '' }} locale="es" />);
    expect(screen.queryByText('Veredicto')).toBeNull();
    expect(screen.queryByText('Para tu escritura')).toBeNull();
    expect(screen.queryByText('Mi relato')).toBeNull();
  });
  it('only offers participant result waiting if /status authorizes it', async () => {
    vi.mocked(duelsApi.detail).mockRejectedValue(new ApiError(403, 'http'));
    vi.mocked(duelsApi.status).mockRejectedValue(new ApiError(403, 'http'));
    render(<DuelResult duelId="d" />);
    expect(await screen.findByText('Este duelo todavía no está disponible o no tienes acceso.')).toBeTruthy();
    expect(screen.queryByText('Tu relato ya está enviado')).toBeNull();
  });
  it('recovers a pending participant result', async () => {
    vi.mocked(duelsApi.detail).mockRejectedValue(new ApiError(403, 'http'));
    vi.mocked(duelsApi.status).mockResolvedValue({
      id: 'd',
      state: 'evaluating',
      prompt: '',
      writingStartedAt: '',
      writingEndsAt: '',
      kind: '',
      mode: '',
      userHasSubmitted: true,
      userA: null,
      userB: null,
    });
    render(<DuelResult duelId="d" />);
    expect(await screen.findByText('Tu relato ya está enviado')).toBeTruthy();
  });
});
it('renders an absolute timer, keeps invalid send disabled and freezes editing when time ends', async () => {
  vi.useFakeTimers();
  vi.setSystemTime('2026-10-10T12:04:00Z');
  const runtime = new RankedSession('me', 'es');
  const state = {
    ...runtime.getSnapshot(),
    phase: 'writing' as const,
    duel: {
      id: 'd',
      state: 'writing',
      prompt: 'Una llave',
      writingStartedAt: '2026-10-10T12:00:00Z',
      writingEndsAt: '2026-10-10T12:05:00Z',
      kind: 'ranked_human',
      mode: 'ranked',
      userHasSubmitted: false,
      userA: null,
      userB: null,
    },
  };
  render(<RankedEditor state={state} runtime={runtime} locale="es" />);
  expect(screen.getByRole('timer').textContent).toBe('1:00');
  expect((screen.getByRole('button', { name: 'Enviar relato' }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => {
    vi.setSystemTime('2026-10-10T12:05:01Z');
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(screen.getByRole('timer').textContent).toBe('0:00');
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).readOnly).toBe(true);
  vi.useRealTimers();
});

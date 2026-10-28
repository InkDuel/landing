import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/session/api';
import { parseWritingSummary, type WritingSummary, writingApi } from '@/lib/session/writing';

import { WritingProgress } from './writing-progress';

vi.mock('@/lib/session/firebase', () => ({ getFirebaseAuth: () => ({ currentUser: { getIdToken: async () => 'test-user-token' } }) }));

const day = (date: string, duelWords: number, studioWords: number, active = true) => ({
  date,
  words: duelWords + studioWords,
  duelWords,
  studioWords,
  duels: duelWords > 0 ? 1 : 0,
  active,
});

// 2026-10-24 is a Saturday.
const DAYS = [
  day('2026-09-30', 70, 0),
  day('2026-10-01', 0, 50),
  day('2026-10-12', 320, 20),
  day('2026-10-22', 3, 0, false), // too little to count
  day('2026-10-23', 100, 0),
  day('2026-10-24', 320, 220),
];

const summary = (overrides: Partial<WritingSummary> = {}): WritingSummary => ({
  days: DAYS,
  currentStreak: 2,
  bestStreak: 12,
  lastWritingDate: '2026-10-24',
  activeDayMinChars: 20,
  timezone: 'America/Argentina/Buenos_Aires',
  dailyGoalWords: 500,
  settingsRevision: 3,
  ...overrides,
});

const row = (label: string) => within(screen.getByText(label).closest('div') as HTMLElement);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 24, 12, 0, 0));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Tu escritura · states', () => {
  it('asks for the last 53 weeks in local dates and writes the numbers out', async () => {
    const request = vi.spyOn(writingApi, 'summary').mockResolvedValue(summary());
    render(<WritingProgress locale="es" />);
    expect(screen.getByText('Cargando…')).toBeTruthy();

    expect(await screen.findByText('Racha de escritura')).toBeTruthy();
    expect(request).toHaveBeenCalledWith({ from: '2025-10-20', to: '2026-10-24', today: '2026-10-24' }, expect.objectContaining({ locale: 'es' }));
    expect(screen.getByRole('heading', { name: 'Tu escritura' }).closest('section')!.id).toBe('escritura');
    expect(screen.getByText('Cuenta lo que escribes en duelos y en tus obras. Solo tú ves este resumen.')).toBeTruthy();
    expect(row('Racha de escritura').getByText('2 días')).toBeTruthy();
    expect(screen.getByText('Días seguidos escribiendo.')).toBeTruthy();
    expect(row('Mejor racha').getByText('12 días')).toBeTruthy();
    expect(row('Palabras esta semana').getByText('643')).toBeTruthy(); // 540 + 100 + 3, the last 7 days
    expect(row('Días de escritura este mes').getByText('4')).toBeTruthy(); // 1, 12, 23 and 24
    // How it counts, in whose time zone.
    expect(screen.getByText('Cuentan los relatos que entregas en duelos y el texto nuevo que guardas en tus obras.')).toBeTruthy();
    expect(screen.getByText('Los textos importados no cuentan.')).toBeTruthy();
    expect(screen.getByText('Un día cuenta cuando escribes al menos 20 caracteres.')).toBeTruthy();
    expect(screen.getByText('Los días se calculan con tu zona horaria (America/Argentina/Buenos_Aires).')).toBeTruthy();
  });

  it('draws the combined calendar with the duel and work breakdown on each day', async () => {
    vi.spyOn(writingApi, 'summary').mockResolvedValue(summary());
    render(<WritingProgress locale="es" />);
    const grid = await screen.findByRole('grid');
    expect(within(grid).getAllByRole('gridcell')).toHaveLength(53 * 7 - 1); // tomorrow is not drawn
    expect(within(grid).getByLabelText('24 de octubre: 540 palabras (320 en duelos, 220 en obras)')).toBeTruthy();
    expect(within(grid).getByLabelText('1 de octubre: 50 palabras (0 en duelos, 50 en obras)')).toBeTruthy();
    expect(within(grid).getByLabelText('22 de octubre: sin escritura')).toBeTruthy();
    expect(within(grid).getByLabelText('20 de octubre de 2025: sin escritura')).toBeTruthy();
    expect(screen.getByText('5 días con escritura en el último año')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Ver como lista' }));
    const table = screen.getByRole('table', { name: 'Días con escritura' });
    expect(within(table).getAllByRole('row').slice(1).map((r) => r.textContent)).toEqual([
      '24 de octubre540',
      '23 de octubre100',
      '12 de octubre340',
      '1 de octubre50',
      '30 de septiembre70',
    ]);
  });

  it('is honest when nothing has been written yet, and a zero streak is never a reproach', async () => {
    vi.spyOn(writingApi, 'summary').mockResolvedValue(summary({ days: [], currentStreak: 0, bestStreak: 0, dailyGoalWords: 0 }));
    render(<WritingProgress locale="es" />);
    expect(await screen.findByText('Tu calendario empieza con tu primer duelo o con el primer texto que guardes en una obra.')).toBeTruthy();
    expect(screen.getByText('Puedes volver a escribir cuando quieras.')).toBeTruthy();
    expect(row('Racha de escritura').queryByText(/0 días/)).toBeNull();
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull(); // no goal, no bar
  });

  it('hides the whole block when the backend does not have the endpoint yet (404)', async () => {
    const request = vi.spyOn(writingApi, 'summary').mockRejectedValue(new ApiError(404, 'http'));
    const { container } = render(<WritingProgress locale="es" />);
    await waitFor(() => expect(request).toHaveBeenCalled());
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });

  it('shows a quiet error with a retry on any other failure', async () => {
    const request = vi.spyOn(writingApi, 'summary').mockRejectedValueOnce(new ApiError(500, 'http')).mockResolvedValue(summary());
    render(<WritingProgress locale="en" />);
    expect(await screen.findByText('We could not load your writing.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Writing streak')).toBeTruthy();
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe('Tu escritura · daily goal', () => {
  it('shows the bar with its text equivalent, and says when the goal is reached', async () => {
    vi.spyOn(writingApi, 'summary').mockResolvedValue(summary());
    render(<WritingProgress locale="es" />);
    const bar = await screen.findByRole('progressbar', { name: 'Meta diaria (palabras)' });
    expect(bar.getAttribute('aria-valuetext')).toBe('540 de 500 palabras hoy');
    expect(bar.getAttribute('aria-valuenow')).toBe('500');
    expect(screen.getByText('540 de 500 palabras hoy · Meta cumplida.')).toBeTruthy();
  });

  it('saves under the settings revision and follows the saved value', async () => {
    vi.spyOn(writingApi, 'summary').mockResolvedValue(summary());
    const save = vi.spyOn(writingApi, 'saveSettings').mockResolvedValue({ dailyGoalWords: 800, revision: 4 });
    render(<WritingProgress locale="es" />);
    const field = await screen.findByRole('spinbutton', { name: 'Meta diaria (palabras)' });
    expect((screen.getByRole('button', { name: 'Guardar meta' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(field, { target: { value: '800' } });
    expect(screen.getByText('Cambios sin guardar')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar meta' }));

    await waitFor(() => expect(save).toHaveBeenCalledWith({ dailyGoalWords: 800, expectedRevision: 3 }, { locale: 'es' }));
    expect(await screen.findByText('Meta guardada.')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuetext')).toBe('540 de 800 palabras hoy');
  });

  it('refuses a number out of range before asking the backend', async () => {
    vi.spyOn(writingApi, 'summary').mockResolvedValue(summary());
    const save = vi.spyOn(writingApi, 'saveSettings');
    render(<WritingProgress locale="es" />);
    fireEvent.change(await screen.findByRole('spinbutton', { name: 'Meta diaria (palabras)' }), { target: { value: '100001' } });
    expect(screen.getByText('Escribe un número entero entre 0 y 100.000.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Guardar meta' }) as HTMLButtonElement).disabled).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });

  it('on a revision conflict refreshes the block, keeps what was typed and lets you try again', async () => {
    const request = vi
      .spyOn(writingApi, 'summary')
      .mockResolvedValueOnce(summary())
      .mockResolvedValue(summary({ dailyGoalWords: 300, settingsRevision: 5 }));
    const save = vi
      .spyOn(writingApi, 'saveSettings')
      .mockRejectedValueOnce(new ApiError(409, 'http', { code: 'revision_conflict' }))
      .mockResolvedValue({ dailyGoalWords: 900, revision: 6 });
    render(<WritingProgress locale="es" />);

    fireEvent.change(await screen.findByRole('spinbutton', { name: 'Meta diaria (palabras)' }), { target: { value: '900' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar meta' }));

    expect(await screen.findByText(/Tu meta cambió en otro lugar/)).toBeTruthy();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('progressbar').getAttribute('aria-valuetext')).toBe('540 de 300 palabras hoy'));
    expect((screen.getByRole('spinbutton', { name: 'Meta diaria (palabras)' }) as HTMLInputElement).value).toBe('900');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar meta' }));
    await waitFor(() => expect(save).toHaveBeenLastCalledWith({ dailyGoalWords: 900, expectedRevision: 5 }, { locale: 'es' }));
  });
});

describe('writing API client', () => {
  const response = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  it('parses defensively: bad days dropped, missing totals rebuilt, missing numbers as 0', () => {
    const parsed = parseWritingSummary({
      days: [
        { date: '2026-10-24', duelWords: 10, studioWords: 5, active: true },
        { date: 'yesterday', words: 99, active: true },
        'nope',
        { date: '2026-10-20', words: 40, duelWords: -3, active: 'yes' },
      ],
      currentStreak: '4',
    });
    expect(parsed.days).toEqual([
      { date: '2026-10-20', words: 40, duelWords: 0, studioWords: 0, duels: 0, active: false },
      { date: '2026-10-24', words: 15, duelWords: 10, studioWords: 5, duels: 0, active: true },
    ]);
    expect(parsed).toMatchObject({ currentStreak: 0, bestStreak: 0, activeDayMinChars: 20, dailyGoalWords: 0, settingsRevision: 0, timezone: '' });
    expect(parseWritingSummary(null).days).toEqual([]);
  });

  it('sends the time zone in the body of the settings PUT, never as a header', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response({ dailyGoalWords: 500, revision: 4 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await writingApi.saveSettings({ dailyGoalWords: 500, expectedRevision: 3 }, { locale: 'es' })).toEqual({ dailyGoalWords: 500, revision: 4 });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://inkduel-backend-production.up.railway.app/api/me/writing/settings');
    expect(options?.method).toBe('PUT');
    const body = JSON.parse(options?.body as string);
    expect(body).toEqual({ dailyGoalWords: 500, expectedRevision: 3, timezone: expect.any(String) });
    expect(body.timezone).not.toBe('');
    expect(Object.keys(options?.headers ?? {}).sort()).toEqual(['Accept', 'Accept-Language', 'Authorization', 'Content-Type']);
  });

  it('asks for the range in the query string', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response({ days: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await writingApi.summary({ from: '2025-10-20', to: '2026-10-24', today: '2026-10-24' }, { locale: 'pt' });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://inkduel-backend-production.up.railway.app/api/me/writing?from=2025-10-20&to=2026-10-24&today=2026-10-24',
    );
  });

  it('rejects a settings answer without a revision', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response({ ok: true })));
    await expect(writingApi.saveSettings({ dailyGoalWords: 1, expectedRevision: 0 }, { locale: 'es' })).rejects.toMatchObject({ kind: 'parse' });
  });
});

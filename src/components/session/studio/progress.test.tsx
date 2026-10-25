import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/session/api';
import { studioApi } from '@/lib/session/studio/api';
import { DEFAULT_LIMITS, type DraftSummary, type ManuscriptEntry, type StudioOverview, type StudioProgress, type StudioSettings } from '@/lib/session/studio/models';
import { studioAnalytics } from '@/lib/session/studio/studio-analytics';
import { StudioStore } from '@/lib/session/studio/studio-store';

import { ProgressArea } from './progress-area';
import { type StudioContextValue, StudioProvider } from './studio-context';

const settings: StudioSettings = {
  workGoalWords: 400,
  dailyGoalWords: 500,
  sessionGoalWords: 0,
  streakEnabled: true,
  timezone: 'Europe/Madrid',
  onboardingDismissed: true,
  lastDraftId: '',
  revision: 5,
};

const entry = (id: string, chapterWords: number, draftWords: number | null): ManuscriptEntry => ({
  id,
  chapterId: id,
  orderIndex: 1,
  published: true,
  chapterTitle: id,
  chapterRevision: 1,
  chapterWordCount: chapterWords,
  chapterCharCount: chapterWords * 5,
  seededFromDuel: false,
  draft: draftWords === null ? null : ({ id, wordCount: draftWords, charCount: draftWords * 5 } as DraftSummary),
  publishedChanged: false,
});

const day = (date: string, wordsAdded: number, charsAdded: number) => ({
  date,
  wordsAdded,
  wordsRemoved: 0,
  charsAdded,
  charsRemoved: 0,
  importedWords: 0,
  saves: 1,
  sessions: 1,
});

const progress = (days: ReturnType<typeof day>[], currentStreak = 2): StudioProgress => ({
  days,
  currentStreak,
  longestStreak: 5,
  activeDays: days.length,
  wordsAdded: days.reduce((n, d) => n + d.wordsAdded, 0),
  wordsRemoved: 0,
  importedWords: 0,
  sessions: days.length,
  activeDayMinChars: 20,
});

// 2026-10-24 is a Saturday: the week of the Monday-first calendar began on the 19th.
const DAYS = [
  day('2026-10-24', 340, 1800),
  day('2026-10-23', 100, 600),
  day('2026-10-22', 5, 10), // too little text to count as a day
  day('2026-10-12', 340, 1900),
  day('2026-10-01', 50, 300),
  day('2026-09-30', 70, 400),
];

function mountProgress(overrides: Partial<StudioSettings> = {}) {
  const store = new StudioStore('w1', () => 'es');
  const refresh = vi.fn(async () => {});
  const overview = {
    // The draft is the same text as the chapter, further along: 120 + 80, never 100 + 120 + 80.
    manuscript: [entry('c1', 100, 120), entry('c2', 80, null)],
    settings: { ...settings, ...overrides },
  } as unknown as StudioOverview;
  const value: StudioContextValue = {
    workId: 'w1',
    uid: 'u1',
    locale: 'es',
    overview,
    limits: DEFAULT_LIMITS,
    store,
    area: 'progress',
    docId: null,
    goTo: vi.fn(async () => true),
    refresh,
    applyDraft: vi.fn(),
    registerEditor: vi.fn(),
    editor: () => null,
    openEntry: vi.fn(async () => true),
    createChapter: vi.fn(async () => null),
    toast: vi.fn(),
  };
  render(
    <StudioProvider value={value}>
      <ProgressArea />
    </StudioProvider>,
  );
  return { refresh };
}

const row = (label: string) => within(screen.getByText(label).closest('div') as HTMLElement);

beforeEach(() => {
  // Only the clock: timers stay real so the waits below behave.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 24, 12, 0, 0));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Progress · numbers and calendar', () => {
  it('asks for the last 53 weeks in local dates and writes the numbers out', async () => {
    const request = vi.spyOn(studioApi, 'progress').mockResolvedValue(progress(DAYS));
    mountProgress();

    expect(await screen.findByText('Palabras en tu obra')).toBeTruthy();
    expect(request).toHaveBeenCalledWith('w1', { from: '2025-10-20', to: '2026-10-24', today: '2026-10-24' }, expect.objectContaining({ locale: 'es' }));

    expect(row('Palabras en tu obra').getByText('200')).toBeTruthy(); // 120 (draft) + 80 (chapter), not both
    expect(screen.getByText('Lectura estimada: 1 min')).toBeTruthy();
    expect(row('Palabras escritas esta semana').getByText('445')).toBeTruthy(); // 340 + 100 + 5, the last 7 days
    expect(screen.getByText('Últimos 7 días. Las importaciones no cuentan.')).toBeTruthy();
    expect(row('Días de escritura este mes').getByText('4')).toBeTruthy(); // 24, 23, 12 and 1; the 22nd is too short
    expect(row('Racha actual').getByText('2 días')).toBeTruthy();
    // How it counts, and in whose time zone.
    expect(screen.getByText('Solo cuenta el texto guardado.')).toBeTruthy();
    expect(screen.getByText('Los textos importados no cuentan como palabras escritas.')).toBeTruthy();
    expect(screen.getByText(/al menos 20 caracteres nuevos/)).toBeTruthy();
    expect(screen.getByText('Los días se calculan con tu zona horaria (Europe/Madrid).')).toBeTruthy();
  });

  it('draws 53 weeks with an accessible name on every day and counts only real writing days', async () => {
    vi.spyOn(studioApi, 'progress').mockResolvedValue(progress(DAYS));
    mountProgress();
    const grid = await screen.findByRole('grid');

    const cells = within(grid).getAllByRole('gridcell');
    expect(cells).toHaveLength(53 * 7 - 1); // tomorrow, Sunday, is not drawn
    expect(within(grid).getByLabelText('12 de octubre: 340 palabras')).toBeTruthy();
    expect(within(grid).getByLabelText('24 de octubre: 340 palabras')).toBeTruthy();
    expect(within(grid).getByLabelText('22 de octubre: sin escritura')).toBeTruthy(); // 5 words, 10 characters
    expect(within(grid).getByLabelText('20 de octubre de 2025: sin escritura')).toBeTruthy(); // last year says so
    expect(screen.getByText('5 días con escritura en el último año')).toBeTruthy();
    // Colour never stands alone.
    const legend = screen.getByRole('group', { name: 'Leyenda' });
    for (const text of ['Sin escritura', '1–99 palabras', '100–499 palabras', '500–999 palabras', '1.000 palabras o más']) {
      expect(within(legend).getByText(text)).toBeTruthy();
    }
    // One stop in the tab order, on today.
    expect(cells.filter((c) => c.tabIndex === 0).map((c) => c.getAttribute('aria-label'))).toEqual(['24 de octubre: 340 palabras']);
  });

  it('moves between days with the arrow keys and offers the same days as a list', async () => {
    vi.spyOn(studioApi, 'progress').mockResolvedValue(progress(DAYS));
    mountProgress();
    const today = await screen.findByLabelText('24 de octubre: 340 palabras');

    act(() => today.focus());
    fireEvent.keyDown(today, { key: 'ArrowUp' });
    expect(document.activeElement?.getAttribute('aria-label')).toBe('23 de octubre: 100 palabras');
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(document.activeElement?.getAttribute('aria-label')).toBe('16 de octubre: sin escritura');
    expect(document.activeElement?.getAttribute('tabindex')).toBe('0');

    fireEvent.click(screen.getByRole('button', { name: 'Ver como lista' }));
    const table = screen.getByRole('table', { name: 'Días con escritura' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => r.textContent)).toEqual(['24 de octubre340', '23 de octubre100', '12 de octubre340', '1 de octubre50', '30 de septiembre70']);
    expect(screen.getByRole('button', { name: 'Ocultar la lista' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('is honest when nothing has been saved yet', async () => {
    vi.spyOn(studioApi, 'progress').mockResolvedValue(progress([], 0));
    mountProgress();
    expect(await screen.findByText('Tu calendario empieza con tu primer guardado.')).toBeTruthy();
    expect(screen.queryByRole('grid')).toBeNull();
  });

  it('never shows a streak the author did not want, and a streak of zero is never a reproach', async () => {
    vi.spyOn(studioApi, 'progress').mockResolvedValue(progress(DAYS, 0));
    mountProgress();
    expect(await screen.findByText('Palabras en tu obra')).toBeTruthy();
    expect(screen.getByText('Puedes volver a escribir cuando quieras.')).toBeTruthy();
    expect(screen.queryByText(/0 días/)).toBeNull();
    cleanup();

    vi.spyOn(studioApi, 'progress').mockResolvedValue(progress(DAYS, 4));
    mountProgress({ streakEnabled: false });
    expect(await screen.findByText('Palabras en tu obra')).toBeTruthy();
    expect(screen.queryByText('Racha actual')).toBeNull();
    expect(screen.queryByText(/Puedes volver a escribir/)).toBeNull();
  });

  it('shows an error with a retry', async () => {
    const request = vi.spyOn(studioApi, 'progress').mockRejectedValueOnce(new ApiError(0, 'network')).mockResolvedValue(progress(DAYS));
    mountProgress();
    expect(await screen.findByText('No pudimos cargar tu progreso.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Palabras en tu obra')).toBeTruthy();
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe('Progress · goals', () => {
  it('shows bars with their text equivalent', async () => {
    vi.spyOn(studioApi, 'progress').mockResolvedValue(progress(DAYS));
    mountProgress();
    const work = await screen.findByRole('progressbar', { name: 'Avance de la meta de la obra' });
    expect(work.getAttribute('aria-valuetext')).toBe('200 de 400 palabras (50 %)');
    expect(work.getAttribute('aria-valuenow')).toBe('200');
    const daily = await screen.findByRole('progressbar', { name: 'Avance de la meta de hoy' });
    expect(daily.getAttribute('aria-valuetext')).toBe('340 de 500 palabras (68 %)');
    expect(screen.getByText('200 de 400 palabras (50 %)')).toBeTruthy();
  });

  it('saves under the settings revision with the right payload and counts only goals set to a value', async () => {
    vi.spyOn(studioApi, 'progress').mockResolvedValue(progress(DAYS));
    const save = vi.spyOn(studioApi, 'saveSettings').mockImplementation((async (_w: string, input: Record<string, unknown>) => ({
      ...settings,
      workGoalWords: input.workGoalWords,
      dailyGoalWords: input.dailyGoalWords,
      sessionGoalWords: input.sessionGoalWords,
      streakEnabled: input.streakEnabled,
      revision: 6,
    })) as never);
    const goalSet = vi.spyOn(studioAnalytics, 'goalSet').mockImplementation(() => {});
    const { refresh } = mountProgress();

    const submit = await screen.findByRole('button', { name: 'Guardar metas' });
    expect((submit as HTMLButtonElement).disabled).toBe(true); // unchanged
    fireEvent.change(screen.getByLabelText('Meta de la obra (palabras)'), { target: { value: '50000' } });
    fireEvent.change(screen.getByLabelText('Meta diaria (palabras)'), { target: { value: '0' } }); // turned off
    fireEvent.change(screen.getByLabelText('Meta por sesión (palabras)'), { target: { value: '300' } });
    fireEvent.click(screen.getByLabelText('Mostrar mi racha')); // off
    expect((screen.getByRole('button', { name: 'Guardar metas' }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar metas' }));

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(
      'w1',
      {
        expectedRevision: 5,
        workGoalWords: 50000,
        dailyGoalWords: 0,
        sessionGoalWords: 300,
        streakEnabled: false,
        timezone: expect.any(String),
        onboardingDismissed: true,
      },
      { locale: 'es' },
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(goalSet.mock.calls).toEqual([
      ['w1', 'work'],
      ['w1', 'session'],
    ]);
    expect(await screen.findByText('Metas guardadas.')).toBeTruthy();
  });

  it('refuses numbers out of range before asking the backend', async () => {
    vi.spyOn(studioApi, 'progress').mockResolvedValue(progress(DAYS));
    const save = vi.spyOn(studioApi, 'saveSettings');
    mountProgress();
    await screen.findByRole('button', { name: 'Guardar metas' });
    fireEvent.change(screen.getByLabelText('Meta diaria (palabras)'), { target: { value: '100001' } });
    expect(screen.getByText('Escribe un número entero entre 0 y 100.000.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Guardar metas' }) as HTMLButtonElement).disabled).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });

  it('on a revision conflict refreshes the overview, keeps what was typed and asks to look again', async () => {
    vi.spyOn(studioApi, 'progress').mockResolvedValue(progress(DAYS));
    const save = vi.spyOn(studioApi, 'saveSettings').mockRejectedValue(new ApiError(409, 'http', { code: 'revision_conflict' }));
    const { refresh } = mountProgress();

    fireEvent.change(await screen.findByLabelText('Meta de la obra (palabras)'), { target: { value: '9000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar metas' }));

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Tus metas cambiaron en otro lugar/)).toBeTruthy();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText('Meta de la obra (palabras)') as HTMLInputElement).value).toBe('9000');
    expect((screen.getByRole('button', { name: 'Guardar metas' }) as HTMLButtonElement).disabled).toBe(false); // ready to try again
  });
});

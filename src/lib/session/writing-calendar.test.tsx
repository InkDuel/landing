import { describe, expect, it } from 'vitest';

import {
  addDays,
  buildCalendar,
  calendarRange,
  CALENDAR_WEEKS,
  diffDays,
  findCell,
  moveInGrid,
  parseYmd,
  startOfWeek,
  studioCalendarDays,
  weekdayOf,
  weekdayOfRow,
  weekStartFor,
  wordsInLastDays,
  wordsLevel,
  writingDaysInMonth,
  writingDaysList,
} from './writing-calendar';

// 2026-10-24 is a Saturday.
const TODAY = '2026-10-24';
const day = (date: string, wordsAdded: number, charsAdded: number) => ({ date, wordsAdded, charsAdded });

describe('calendar dates', () => {
  it('starts weeks on Monday for es and pt, on Sunday for en', () => {
    expect(weekStartFor('es')).toBe(1);
    expect(weekStartFor('pt')).toBe(1);
    expect(weekStartFor('en')).toBe(0);
    expect(weekdayOf(TODAY)).toBe(6);
    expect(startOfWeek(TODAY, 1)).toBe('2026-10-19'); // Monday
    expect(startOfWeek(TODAY, 0)).toBe('2026-10-18'); // Sunday
    expect(startOfWeek('2026-10-19', 1)).toBe('2026-10-19');
    expect(startOfWeek('2026-10-18', 1)).toBe('2026-10-12');
    expect(weekdayOfRow(0, 1)).toBe(1);
    expect(weekdayOfRow(6, 1)).toBe(0);
    expect(weekdayOfRow(0, 0)).toBe(0);
  });

  it('only accepts real calendar dates', () => {
    expect(parseYmd('2026-02-29')).toBeNull();
    expect(parseYmd('2028-02-29')).toEqual({ year: 2028, month: 2, day: 29 });
    expect(parseYmd('2026-13-01')).toBeNull();
    expect(parseYmd('26-10-24')).toBeNull();
    expect(() => addDays('nope', 1)).toThrow(RangeError);
  });

  it('adds days across month, year and leap boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays(TODAY, -371)).toBe('2025-10-18');
    expect(diffDays(TODAY, '2025-10-18')).toBe(371);
  });

  it('asks the backend for 53 weeks, within its 400-day cap', () => {
    const es = calendarRange(TODAY, 1);
    expect(es).toEqual({ from: '2025-10-20', to: TODAY });
    expect(diffDays(es.to, es.from)).toBeLessThanOrEqual(400);
    const en = calendarRange(TODAY, 0);
    expect(en.from).toBe('2025-10-19');
    expect(diffDays(en.to, en.from)).toBeLessThanOrEqual(400);
  });
});

describe('calendar grid', () => {
  it('has 53 weeks of 7 days, the first on the week start and the last holding today', () => {
    for (const weekStart of [0, 1] as const) {
      const grid = buildCalendar([], TODAY, weekStart);
      expect(grid.weeks).toHaveLength(CALENDAR_WEEKS);
      expect(grid.weeks.every((week) => week.length === 7)).toBe(true);
      expect(weekdayOf(grid.weeks[0][0].date)).toBe(weekStart);
      expect(grid.weeks[0][0].date).toBe(grid.from);
      const found = findCell(grid, TODAY);
      expect(found?.col).toBe(CALENDAR_WEEKS - 1);
      expect(found?.cell.future).toBe(false);
      // Rows follow the week start.
      expect(weekdayOf(grid.weeks[10][3].date)).toBe(weekdayOfRow(3, weekStart));
    }
  });

  it('marks the days after today as future (Saturday ends the Monday-first week; Sunday-first has one more)', () => {
    const monday = buildCalendar([], TODAY, 1);
    expect(monday.weeks[52].filter((c) => c.future).map((c) => c.date)).toEqual(['2026-10-25']);
    const sunday = buildCalendar([], TODAY, 0);
    expect(sunday.weeks[52].filter((c) => c.future)).toHaveLength(0); // Saturday is the last row
  });

  it('keeps every date consecutive across daylight-saving changes in any zone', () => {
    const before = process.env.TZ;
    try {
      for (const tz of ['America/New_York', 'Europe/Madrid', 'America/Sao_Paulo', 'Australia/Lord_Howe', 'Pacific/Auckland']) {
        process.env.TZ = tz;
        // Each of these grids spans a spring and an autumn transition of the zone.
        for (const today of ['2026-03-29', '2026-03-08', '2026-11-01', '2026-10-25', '2026-04-05', '2026-09-27']) {
          const grid = buildCalendar([], today, 1);
          const dates = grid.weeks.flat().map((c) => c.date);
          expect(new Set(dates).size).toBe(dates.length);
          for (let i = 1; i < dates.length; i += 1) expect(diffDays(dates[i], dates[i - 1])).toBe(1);
        }
      }
    } finally {
      if (before === undefined) delete process.env.TZ;
      else process.env.TZ = before;
    }
  });

  it('adds one calendar day on the night clocks change (a +24 h shortcut would repeat or skip it)', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
    expect(diffDays('2026-11-02', '2026-03-08')).toBe(239);
  });

  it('maps words to intensity levels 0 · 1–99 · 100–499 · 500–999 · 1000+', () => {
    expect([0, 1, 99, 100, 499, 500, 999, 1000, 25000].map(wordsLevel)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
    expect(wordsLevel(-5)).toBe(0);
  });

  it('counts a day as written only from the minimum characters and never leaves it blank', () => {
    const grid = buildCalendar(
      studioCalendarDays([
        day('2026-10-24', 340, 1900), // a real day
        day('2026-10-23', 3, 15), // below the threshold: shown as nothing
        day('2026-10-22', 0, 25), // enough characters, no whole word: still visible
        day('2026-10-21', 1200, 6000),
        day('2026-10-20', 120, 20), // exactly the threshold counts
        day('2026-10-26', 900, 9000), // a future day is ignored
      ], 20),
      TODAY,
      1,
    );
    const at = (date: string) => findCell(grid, date)!.cell;
    expect(at('2026-10-24')).toMatchObject({ active: true, level: 2, words: 340 });
    expect(at('2026-10-23')).toMatchObject({ active: false, level: 0 });
    expect(at('2026-10-22')).toMatchObject({ active: true, level: 1 });
    expect(at('2026-10-21')).toMatchObject({ active: true, level: 4 });
    expect(at('2026-10-20')).toMatchObject({ active: true, level: 2 });
    expect(findCell(grid, '2026-10-26')).toBeNull(); // beyond the last column
    expect(grid.activeDays).toBe(4);
    expect(writingDaysList(grid).map((c) => c.date)).toEqual(['2026-10-24', '2026-10-22', '2026-10-21', '2026-10-20']);
  });

  it('places each month label on the column that holds its first day', () => {
    const grid = buildCalendar([], TODAY, 1);
    expect(grid.months.map((m) => `${m.year}-${m.month}`)).toEqual([
      '2025-11', '2025-12', '2026-1', '2026-2', '2026-3', '2026-4', '2026-5', '2026-6', '2026-7', '2026-8', '2026-9', '2026-10',
    ]);
    for (const m of grid.months) {
      expect(grid.weeks[m.column].some((c) => c.date.endsWith('-01'))).toBe(true);
    }
    // Labels never crowd each other.
    for (let i = 1; i < grid.months.length; i += 1) expect(grid.months[i].column - grid.months[i - 1].column).toBeGreaterThanOrEqual(4);
  });

  it('moves with the arrows, week by week and day by day, and never onto the future', () => {
    const grid = buildCalendar([], TODAY, 1); // today is the Saturday (row 5); Sunday (row 6) is tomorrow
    expect(moveInGrid(grid, { col: 10, row: 2 }, 'ArrowRight')).toEqual({ col: 11, row: 2 });
    expect(moveInGrid(grid, { col: 10, row: 2 }, 'ArrowLeft')).toEqual({ col: 9, row: 2 });
    expect(moveInGrid(grid, { col: 10, row: 2 }, 'ArrowUp')).toEqual({ col: 10, row: 1 });
    expect(moveInGrid(grid, { col: 10, row: 6 }, 'ArrowDown')).toEqual({ col: 10, row: 6 });
    expect(moveInGrid(grid, { col: 0, row: 0 }, 'ArrowLeft')).toEqual({ col: 0, row: 0 });
    expect(moveInGrid(grid, { col: 10, row: 2 }, 'Home')).toEqual({ col: 0, row: 2 });
    expect(moveInGrid(grid, { col: 10, row: 2 }, 'End')).toEqual({ col: 52, row: 2 });
    expect(moveInGrid(grid, { col: 10, row: 2 }, 'PageDown')).toEqual({ col: 14, row: 2 });
    expect(moveInGrid(grid, { col: 3, row: 2 }, 'PageUp')).toEqual({ col: 0, row: 2 });
    // The last column ends at today: below it is tomorrow, and the row's end steps back to the last real day.
    expect(moveInGrid(grid, { col: 52, row: 5 }, 'ArrowDown')).toEqual({ col: 52, row: 5 });
    expect(moveInGrid(grid, { col: 51, row: 6 }, 'ArrowRight')).toEqual({ col: 51, row: 6 });
    expect(moveInGrid(grid, { col: 40, row: 6 }, 'End')).toEqual({ col: 51, row: 6 });
  });
});

describe('calendar numbers', () => {
  const days = studioCalendarDays([
    day('2026-10-24', 300, 1500),
    day('2026-10-20', 100, 600), // 4 days ago: inside the last 7
    day('2026-10-18', 50, 300), // 6 days ago: inside
    day('2026-10-17', 999, 5000), // 7 days ago: outside
    day('2026-10-03', 10, 5), // this month, too little text
    day('2026-09-30', 70, 400), // last month
    day('2026-10-25', 800, 4000), // tomorrow: never counted
  ], 20);

  it('sums the last 7 local days, today included', () => {
    expect(wordsInLastDays(days, TODAY, 7)).toBe(450);
    expect(wordsInLastDays(days, TODAY, 1)).toBe(300);
    expect(wordsInLastDays([], TODAY, 7)).toBe(0);
  });

  it('counts writing days of the current month only', () => {
    expect(writingDaysInMonth(days, TODAY)).toBe(4); // 24, 20, 18 and 17; the 3rd had too little text
    expect(writingDaysInMonth(days, '2026-09-30')).toBe(1);
  });
});

describe('combined calendar (profile)', () => {
  it('keeps the duel and work breakdown on each cell and trusts the backend on active days', () => {
    const grid = buildCalendar(
      [
        { date: '2026-10-24', words: 540, duelWords: 320, studioWords: 220, active: true },
        { date: '2026-10-23', words: 3, duelWords: 3, studioWords: 0, active: false },
      ],
      TODAY,
      1,
    );
    expect(findCell(grid, '2026-10-24')!.cell).toMatchObject({ words: 540, duelWords: 320, studioWords: 220, active: true, level: 3 });
    expect(findCell(grid, '2026-10-23')!.cell).toMatchObject({ active: false, level: 0, duelWords: 3 });
    expect(findCell(grid, '2026-10-22')!.cell).toMatchObject({ words: 0, duelWords: 0, studioWords: 0, active: false });
    expect(grid.activeDays).toBe(1);
  });
});

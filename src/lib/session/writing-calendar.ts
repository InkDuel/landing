import type { Locale } from '@/lib/i18n';

// Pure date math of the writing calendar, shared by Studio's «Progreso» (one
// work) and «Tu escritura» on the profile (duels + works). Days are local
// calendar dates («YYYY-MM-DD») in the writer's own zone, exactly what the
// backend keys its daily rollups by. Every step goes through integer Y-M-D plus UTC
// arithmetic, never through «add 24 hours in milliseconds» on a local Date, so
// a daylight-saving change can neither skip nor repeat a day.

/** 0 = Sunday, 1 = Monday. */
export type WeekStart = 0 | 1;

/** Weeks start on Monday for Spanish and Portuguese, on Sunday for English. */
export const weekStartFor = (locale: Locale): WeekStart => (locale === 'en' ? 0 : 1);

export const CALENDAR_WEEKS = 53;
const DAY_MS = 86_400_000;

export type Ymd = { year: number; month: number; day: number };

/** Strict «YYYY-MM-DD» (a real calendar date), or null. */
export function parseYmd(value: string): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const t = new Date(Date.UTC(year, month - 1, day));
  if (t.getUTCFullYear() !== year || t.getUTCMonth() !== month - 1 || t.getUTCDate() !== day) return null;
  return { year, month, day };
}

const pad = (n: number, width: number) => String(n).padStart(width, '0');

function toYmd(t: Date): string {
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1, 2)}-${pad(t.getUTCDate(), 2)}`;
}

function utc(value: string): number {
  const p = parseYmd(value);
  if (!p) throw new RangeError(`Invalid calendar date: ${value}`);
  return Date.UTC(p.year, p.month - 1, p.day);
}

/** The date [days] after [value] (negative goes back). */
export function addDays(value: string, days: number): string {
  const p = parseYmd(value);
  if (!p) throw new RangeError(`Invalid calendar date: ${value}`);
  return toYmd(new Date(Date.UTC(p.year, p.month - 1, p.day + days)));
}

/** Days from [b] to [a] (a - b). */
export function diffDays(a: string, b: string): number {
  return Math.round((utc(a) - utc(b)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(value: string): number {
  return new Date(utc(value)).getUTCDay();
}

/** The first day of the week that contains [value]. */
export function startOfWeek(value: string, weekStart: WeekStart): string {
  return addDays(value, -((weekdayOf(value) - weekStart + 7) % 7));
}

/** Day of the week (0 = Sunday) shown on row [row] of the grid. */
export const weekdayOfRow = (row: number, weekStart: WeekStart): number => (weekStart + row) % 7;

/** The range the calendar shows and the progress request asks for. */
export function calendarRange(today: string, weekStart: WeekStart, weeks: number = CALENDAR_WEEKS): { from: string; to: string } {
  return { from: addDays(startOfWeek(today, weekStart), -(weeks - 1) * 7), to: today };
}

export type Level = 0 | 1 | 2 | 3 | 4;

/** Smallest word count of each level, for the legend. */
export const LEVEL_MIN_WORDS: readonly [number, number, number, number, number] = [0, 1, 100, 500, 1000];

/** 0 · 1–99 · 100–499 · 500–999 · 1000+ */
export function wordsLevel(words: number): Level {
  if (words <= 0) return 0;
  if (words < 100) return 1;
  if (words < 500) return 2;
  if (words < 1000) return 3;
  return 4;
}

/**
 * One day as the calendar needs it, whatever its source. [active] is decided
 * by the source: Studio from the characters added, the profile by the backend.
 */
export type CalendarDay = {
  date: string;
  words: number;
  active: boolean;
  /** Breakdown for the profile calendar (duels + works); absent in Studio. */
  duelWords?: number;
  studioWords?: number;
};

/** A Studio rollup day counts from [minChars] characters added. */
export function studioCalendarDays(
  days: readonly { date: string; wordsAdded: number; charsAdded: number }[],
  minChars: number,
): CalendarDay[] {
  return days.map((d) => ({ date: d.date, words: d.wordsAdded, active: d.charsAdded > 0 && d.charsAdded >= minChars }));
}

export type CalendarCell = {
  date: string;
  words: number;
  duelWords: number;
  studioWords: number;
  /** Written enough to count as a writing day. */
  active: boolean;
  /** Always 0 for a day that does not count, however many words it had. */
  level: Level;
  /** After today: drawn empty, never focusable. */
  future: boolean;
};

export type CalendarMonth = { column: number; month: number; year: number };

export type Calendar = {
  from: string;
  to: string;
  /** weeks[column][row]; rows follow the week start. */
  weeks: CalendarCell[][];
  /** Where each month begins (the column holding its first day). */
  months: CalendarMonth[];
  activeDays: number;
};

export function buildCalendar(days: readonly CalendarDay[], today: string, weekStart: WeekStart, weeks: number = CALENDAR_WEEKS): Calendar {
  const { from, to } = calendarRange(today, weekStart, weeks);
  const byDate = new Map(days.map((d) => [d.date, d]));
  const months: CalendarMonth[] = [];
  let activeDays = 0;
  const columns: CalendarCell[][] = [];
  for (let col = 0; col < weeks; col += 1) {
    const column: CalendarCell[] = [];
    for (let row = 0; row < 7; row += 1) {
      const date = addDays(from, col * 7 + row);
      const future = date > today;
      const day = future ? undefined : byDate.get(date);
      const words = day?.words ?? 0;
      const active = !future && day?.active === true;
      if (active) activeDays += 1;
      column.push({
        date,
        words,
        duelWords: day?.duelWords ?? 0,
        studioWords: day?.studioWords ?? 0,
        active,
        level: active ? (Math.max(1, wordsLevel(words)) as Level) : 0,
        future,
      });
      if (!future && date.endsWith('-01')) {
        const p = parseYmd(date);
        if (p) months.push({ column: col, month: p.month, year: p.year });
      }
    }
    columns.push(column);
  }
  return { from, to, weeks: columns, months, activeDays };
}

export type GridKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End' | 'PageUp' | 'PageDown';
export type GridPos = { col: number; row: number };

/**
 * Where the keyboard moves from [pos]: arrows step a week or a day, Home/End
 * go to the first/last week of the row, PageUp/PageDown jump four weeks.
 * Never lands on a day after today; if it would, it stays put.
 */
export function moveInGrid(calendar: Calendar, pos: GridPos, key: GridKey): GridPos {
  const lastCol = calendar.weeks.length - 1;
  let { col, row } = pos;
  switch (key) {
    case 'ArrowLeft':
      col -= 1;
      break;
    case 'ArrowRight':
      col += 1;
      break;
    case 'ArrowUp':
      row -= 1;
      break;
    case 'ArrowDown':
      row += 1;
      break;
    case 'Home':
      col = 0;
      break;
    case 'End':
      col = lastCol;
      break;
    case 'PageUp':
      col -= 4;
      break;
    case 'PageDown':
      col += 4;
      break;
  }
  col = Math.max(0, Math.min(lastCol, col));
  row = Math.max(0, Math.min(6, row));
  // Past today: fall back to the last real day of that row/column.
  while (calendar.weeks[col]?.[row]?.future && col > 0 && (key === 'End' || key === 'PageDown' || key === 'ArrowRight')) col -= 1;
  if (calendar.weeks[col]?.[row]?.future) return pos;
  return { col, row };
}

/** The cell that holds [date], or null when it is outside the grid. */
export function findCell(calendar: Calendar, date: string): (GridPos & { cell: CalendarCell }) | null {
  const offset = diffDays(date, calendar.from);
  if (offset < 0) return null;
  const col = Math.floor(offset / 7);
  const row = offset % 7;
  const cell = calendar.weeks[col]?.[row];
  return cell ? { col, row, cell } : null;
}

// ---- Numbers ----

/** Words written over the last [count] local days up to and including [today]. */
export function wordsInLastDays(days: readonly Pick<CalendarDay, 'date' | 'words'>[], today: string, count: number): number {
  const first = addDays(today, -(count - 1));
  return days.reduce((sum, d) => (d.date >= first && d.date <= today ? sum + d.words : sum), 0);
}

/** Writing days in the month of [today]. */
export function writingDaysInMonth(days: readonly Pick<CalendarDay, 'date' | 'active'>[], today: string): number {
  const prefix = today.slice(0, 7);
  return days.filter((d) => d.date.startsWith(prefix) && d.date <= today && d.active).length;
}

/** Words written on [date] (0 when the day has no record). */
export function wordsOn(days: readonly Pick<CalendarDay, 'date' | 'words'>[], date: string): number {
  return days.find((d) => d.date === date)?.words ?? 0;
}

/** The days that count, newest first, for the textual equivalent of the grid. */
export function writingDaysList(calendar: Calendar): CalendarCell[] {
  return calendar.weeks
    .flat()
    .filter((cell) => cell.active)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

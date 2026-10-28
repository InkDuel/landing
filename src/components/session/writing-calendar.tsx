'use client';

import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

import { cx } from '@/components/ink/cx';
import { INTL_LOCALE, type Locale } from '@/lib/i18n';
import {
  type Calendar,
  type GridKey,
  type GridPos,
  findCell,
  type Level,
  moveInGrid,
  parseYmd,
  type WeekStart,
  weekdayOfRow,
  writingDaysList,
} from '@/lib/session/writing-calendar';
import type { CalendarCopy } from '@/lib/session/writing-copy';

// The writing calendar (Studio PRD §9, shared with the profile's «Tu
// escritura»): weeks as columns, days as rows, one square per day tinted by
// the words written that day. Colour never stands alone: every
// square has a spoken label («12 de octubre: 340 palabras»), the legend names
// each step, and «Ver como lista» offers the same days as a plain table.

const GRID_KEYS: readonly string[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];

const LEVEL_CLASS: Record<Level, string> = {
  0: 'bg-sunken border-divider',
  1: 'bg-tint-yellow border-[color:var(--ink-pencil-yellow-deep)]',
  2: 'bg-yellow border-transparent',
  3: 'bg-[color:var(--ink-pencil-yellow-deep)] border-transparent',
  4: 'bg-brand-ink border-transparent',
};

const swatch = 'inline-block size-[13px] shrink-0 rounded-[3px] border-hairline';

function dayLabeler(locale: Locale, currentYear: number) {
  const intl = INTL_LOCALE[locale];
  const plain = new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const withYear = new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (date: string) => {
    const p = parseYmd(date);
    if (!p) return date;
    // A date from last year says so: the grid reaches back 53 weeks.
    return (p.year === currentYear ? plain : withYear).format(new Date(Date.UTC(p.year, p.month - 1, p.day)));
  };
}

export function WritingCalendar({
  calendar,
  today,
  locale,
  weekStart,
  copy,
}: {
  calendar: Calendar;
  today: string;
  locale: Locale;
  weekStart: WeekStart;
  copy: CalendarCopy;
}) {
  const intl = INTL_LOCALE[locale];
  const tableRef = useRef<HTMLTableElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayCell = useMemo(() => findCell(calendar, today), [calendar, today]);
  const [focus, setFocus] = useState<GridPos>({ col: todayCell?.col ?? calendar.weeks.length - 1, row: todayCell?.row ?? 0 });
  const [caption, setCaption] = useState('');
  const [showList, setShowList] = useState(false);

  const currentYear = parseYmd(today)?.year ?? new Date().getFullYear();
  const label = useMemo(() => dayLabeler(locale, currentYear), [locale, currentYear]);
  const number = useMemo(() => new Intl.NumberFormat(intl), [intl]);
  const cellText = (cell: Calendar['weeks'][number][number]) =>
    cell.active ? copy.cell(label(cell.date), cell, (n) => number.format(n)) : copy.cellNone(label(cell.date));

  const monthName = useMemo(() => new Intl.DateTimeFormat(intl, { month: 'short', timeZone: 'UTC' }), [intl]);
  const weekdayShort = useMemo(() => new Intl.DateTimeFormat(intl, { weekday: 'short', timeZone: 'UTC' }), [intl]);
  const weekdayLong = useMemo(() => new Intl.DateTimeFormat(intl, { weekday: 'long', timeZone: 'UTC' }), [intl]);
  // 2023-01-01 was a Sunday: day-of-week n is January 1 + n.
  const weekday = (dow: number, format: Intl.DateTimeFormat) => format.format(new Date(Date.UTC(2023, 0, 1 + dow)));

  // Header cells: one per month, as wide as the weeks it covers.
  const header = useMemo(() => {
    const total = calendar.weeks.length;
    const out: { span: number; text: string }[] = [];
    const first = calendar.months[0]?.column ?? total;
    if (first > 0) out.push({ span: first, text: '' });
    calendar.months.forEach((m, i) => {
      const end = calendar.months[i + 1]?.column ?? total;
      out.push({ span: end - m.column, text: monthName.format(new Date(Date.UTC(m.year, m.month - 1, 1))) });
    });
    return out;
  }, [calendar, monthName]);

  // The newest weeks are the ones that matter: start scrolled to today.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    if (!GRID_KEYS.includes(event.key)) return;
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-col]');
    if (!cell) return;
    event.preventDefault();
    const next = moveInGrid(calendar, { col: Number(cell.dataset.col), row: Number(cell.dataset.row) }, event.key as GridKey);
    setFocus(next);
    tableRef.current?.querySelector<HTMLElement>(`[data-col="${next.col}"][data-row="${next.row}"]`)?.focus();
  };

  const days = useMemo(() => (showList ? writingDaysList(calendar) : []), [showList, calendar]);

  return (
    <div className="flex flex-col gap-3">
      <div ref={scrollRef} className="overflow-x-auto pb-1">
        <table
          ref={tableRef}
          role="grid"
          aria-label={copy.gridLabel}
          aria-rowcount={7}
          aria-colcount={calendar.weeks.length}
          onKeyDown={onKeyDown}
          onMouseLeave={() => setCaption('')}
          className="border-separate border-spacing-[3px]"
        >
          <thead aria-hidden="true">
            <tr>
              <th className="w-8 min-w-8" />
              {header.map((h, i) => (
                <th key={i} colSpan={h.span} className="overflow-visible p-0 text-left align-bottom type-caption font-normal whitespace-nowrap text-secondary">
                  {h.text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 7 }, (_, row) => {
              const dow = weekdayOfRow(row, weekStart);
              const named = dow === 1 || dow === 3 || dow === 5;
              return (
                <tr key={row}>
                  <th scope="row" className="sticky left-0 bg-page pr-1 text-right align-middle type-caption font-normal text-secondary">
                    <span className={named ? undefined : 'sr-only'}>
                      {named ? weekday(dow, weekdayShort) : weekday(dow, weekdayLong)}
                    </span>
                  </th>
                  {calendar.weeks.map((week, col) => {
                    const cell = week[row];
                    if (cell.future) return <td key={cell.date} aria-hidden="true" className="size-[13px] p-0" />;
                    const text = cellText(cell);
                    return (
                      <td
                        key={cell.date}
                        role="gridcell"
                        data-col={col}
                        data-row={row}
                        tabIndex={focus.col === col && focus.row === row ? 0 : -1}
                        aria-label={text}
                        title={text}
                        onFocus={() => {
                          setFocus({ col, row });
                          setCaption(text);
                        }}
                        onMouseEnter={() => setCaption(text)}
                        className={cx('ink-focus size-[13px] rounded-[3px] border-hairline p-0', LEVEL_CLASS[cell.level])}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* What the pointer or the keyboard is on, in words. */}
      <p aria-hidden="true" className="min-h-5 type-caption text-primary">
        {caption}
      </p>

      <div role="group" aria-label={copy.legend} className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="type-caption text-secondary">{copy.less}</span>
        <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
          {copy.levels.map((text, level) => (
            <li key={text} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={cx(swatch, LEVEL_CLASS[level as Level])} />
              <span className="type-caption text-secondary">{text}</span>
            </li>
          ))}
        </ul>
        <span className="type-caption text-secondary">{copy.more}</span>
      </div>

      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          aria-expanded={showList}
          onClick={() => setShowList((v) => !v)}
          className="ink-focus ink-dim inline-flex min-h-11 items-center rounded-control px-1 type-button-sm text-[14px] text-blue"
        >
          {showList ? copy.hideList : copy.viewList}
        </button>
        {showList ? (
          <div className="w-full max-w-[420px]">
            {days.length === 0 ? (
              <p className="type-body-sm text-secondary">{copy.listEmpty}</p>
            ) : (
              <div className="max-h-80 overflow-y-auto rounded-card border-quiet border-divider bg-surface">
                <table className="w-full border-collapse">
                  <caption className="sr-only">{copy.listTitle}</caption>
                  <thead>
                    <tr className="border-b border-divider text-left">
                      <th scope="col" className="px-3 py-2 type-label text-secondary">
                        {copy.colDate}
                      </th>
                      <th scope="col" className="px-3 py-2 text-right type-label text-secondary">
                        {copy.colWords}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((cell) => (
                      <tr key={cell.date} className="border-b border-divider last:border-b-0">
                        <td className="px-3 py-2 type-body-sm text-primary">{label(cell.date)}</td>
                        <td className="px-3 py-2 text-right type-body-sm tabular-nums text-primary">{number.format(cell.words)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';

import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { INTL_LOCALE } from '@/lib/i18n';
import { localDate, localTimezone, studioApi } from '@/lib/session/studio/api';
import type { StudioProgress } from '@/lib/session/studio/models';
import {
  buildCalendar,
  calendarRange,
  weekStartFor,
  wordsInLastDays,
  wordsOn,
  writingDaysInMonth,
} from '@/lib/session/studio/progress-calendar';
import { PROGRESS_COPY } from '@/lib/session/studio/studio-plan-copy';
import { readingMinutes } from '@/lib/session/studio/words';

import { entryWords, useStudio } from './studio-context';
import { GoalsPanel } from './progress-goals';
import { WritingCalendar } from './progress-calendar-view';

// Progreso (PRD §9). A quiet record for the author, not a dashboard: a few
// numbers written out, the goals they chose, and a calendar of the days they
// wrote. Only saved writing counts, imports never count as written words, and
// days follow the author's own time zone. No streak is shown unless the author
// wants one, and a streak at zero is never a reproach.

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: StudioProgress };

function duration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function ProgressArea() {
  const { workId, locale, overview } = useStudio();
  const copy = PROGRESS_COPY[locale];
  const fmt = (n: number) => n.toLocaleString(INTL_LOCALE[locale]);
  const weekStart = weekStartFor(locale);
  // The author's "today" in their own calendar, fixed for this visit.
  const [today] = useState(() => localDate());
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    const range = calendarRange(today, weekStart);
    studioApi
      .progress(workId, { ...range, today }, { locale, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setLoad({ status: 'ready', data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoad({ status: 'error' });
      });
    return () => controller.abort();
  }, [workId, locale, today, weekStart, attempt]);

  const retry = () => {
    setLoad({ status: 'loading' });
    setAttempt((n) => n + 1);
  };

  // Words in the work now: the draft where there is one, else the published
  // chapter. Never both: a draft is the same text, further along.
  const workWords = useMemo(() => overview.manuscript.reduce((sum, entry) => sum + entryWords(entry), 0), [overview.manuscript]);
  const data = load.status === 'ready' ? load.data : null;
  const streakOn = overview.settings.streakEnabled;

  const calendar = useMemo(() => (data ? buildCalendar(data.days, today, weekStart, data.activeDayMinChars) : null), [data, today, weekStart]);
  const empty = data !== null && data.days.length === 0;
  const minutes = readingMinutes(workWords);

  return (
    <div className="flex flex-col gap-6 pb-8">
      <header className="flex flex-col gap-1">
        <h2 className="type-title-section text-primary">{copy.heading}</h2>
        <p className="max-w-[62ch] type-body-sm text-secondary">{copy.intro}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {load.status === 'loading' ? (
          <InkSkeleton lines={4} height="h-14" label={copy.loading} />
        ) : load.status === 'error' ? (
          <InkInlineBanner title={copy.loadError} action={<InkTextAction onClick={retry}>{copy.retry}</InkTextAction>} />
        ) : (
          <section aria-labelledby="progress-numbers-title">
            <h3 id="progress-numbers-title" className="sr-only">
              {copy.numbers.label}
            </h3>
            <dl className="m-0 divide-y divide-divider rounded-card border-quiet border-divider bg-surface">
              <Row label={copy.numbers.words} value={fmt(workWords)} hint={workWords > 0 ? copy.numbers.reading(duration(minutes)) : copy.numbers.readingNone} />
              <Row label={copy.numbers.weekWords} value={fmt(wordsInLastDays(load.data.days, today, 7))} hint={copy.numbers.weekHint} />
              <Row
                label={copy.numbers.monthDays}
                value={fmt(writingDaysInMonth(load.data.days, today, load.data.activeDayMinChars))}
                hint={copy.numbers.monthDaysHint}
              />
              {streakOn ? (
                load.data.currentStreak > 0 ? (
                  <Row
                    label={copy.numbers.streak}
                    value={copy.numbers.days(load.data.currentStreak, fmt(load.data.currentStreak))}
                    hint={copy.numbers.streakHint}
                  />
                ) : (
                  <Row label={copy.numbers.streak} value="" hint={copy.numbers.streakZero} />
                )
              ) : null}
            </dl>
          </section>
        )}

        <GoalsPanel workWords={workWords} todayWords={data ? wordsOn(data.days, today) : null} />
      </div>

      {load.status !== 'error' ? (
        <section aria-labelledby="progress-calendar-title" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h3 id="progress-calendar-title" className="type-title-section text-primary">
              {copy.calendar.title}
            </h3>
            {calendar && !empty ? (
              <p className="type-caption text-secondary">{copy.calendar.summary(calendar.activeDays, fmt(calendar.activeDays))}</p>
            ) : null}
          </div>
          {load.status === 'loading' ? <InkSkeleton lines={1} height="h-40" label={copy.loading} /> : null}
          {empty ? <p className="type-body text-secondary">{copy.calendar.empty}</p> : null}
          {calendar && !empty ? <WritingCalendar calendar={calendar} today={today} locale={locale} weekStart={weekStart} copy={copy.calendar} /> : null}
        </section>
      ) : null}

      <section aria-labelledby="progress-rules-title" className="flex flex-col gap-2">
        <h3 id="progress-rules-title" className="type-label text-secondary">
          {copy.rules.title}
        </h3>
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5 type-body-sm text-secondary">
          <li>{copy.rules.saved}</li>
          <li>{copy.rules.imports}</li>
          <li>{copy.rules.activeDay(fmt(data?.activeDayMinChars ?? 20))}</li>
          <li>{copy.rules.timezone(overview.settings.timezone || localTimezone())}</li>
        </ul>
      </section>
    </div>
  );
}

/** One line of the summary: a label, the figure (when it is one) and a quiet note. */
function Row({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 px-4 py-3">
      <dt className="col-start-1 row-start-1 type-body-strong text-[15px] text-primary">{label}</dt>
      {value ? (
        <dd className="col-start-2 row-span-2 row-start-1 m-0 font-literary text-[26px] leading-none font-semibold tabular-nums text-primary">{value}</dd>
      ) : null}
      <dd className="col-start-1 row-start-2 m-0 type-caption text-secondary">{hint}</dd>
    </div>
  );
}

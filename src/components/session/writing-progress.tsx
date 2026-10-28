'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { InkButton } from '@/components/ink/ink-button';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { InkTextField } from '@/components/ink/ink-text-field';
import { INTL_LOCALE, type Locale } from '@/lib/i18n';
import { ApiError } from '@/lib/session/api';
import { localDate, localTimezone } from '@/lib/session/local-time';
import { DAILY_GOAL_MAX, isWritingUnavailable, type WritingSettings, type WritingSummary, writingApi } from '@/lib/session/writing';
import { buildCalendar, calendarRange, weekStartFor, wordsInLastDays, wordsOn, writingDaysInMonth } from '@/lib/session/writing-calendar';
import { WRITING_COPY } from '@/lib/session/writing-copy';

import { WritingCalendar } from './writing-calendar';

// «Tu escritura» on your own profile (spec «Progreso de escritura» §9): what
// you wrote in duels and in your works, day by day, in your own time zone.
// Private to you. A quiet record, not a scoreboard: a streak at zero is never
// a reproach, and the daily goal is optional. An older backend without the
// endpoint (404) hides the block entirely; any other failure says so quietly.

export const WRITING_ANCHOR = 'escritura';

type Load =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'error' }
  | { status: 'ready'; data: WritingSummary };

export function WritingProgress({ locale }: { locale: Locale }) {
  const copy = WRITING_COPY[locale];
  const fmt = (n: number) => n.toLocaleString(INTL_LOCALE[locale]);
  const weekStart = weekStartFor(locale);
  // Your "today" in your own calendar, fixed for this visit.
  const [today] = useState(() => localDate());
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    writingApi
      .summary({ ...calendarRange(today, weekStart), today }, { locale, signal: controller.signal })
      .then((next) => {
        if (controller.signal.aborted) return;
        setLoad((prev) => {
          // A goal we saved meanwhile is newer than what this answer carries.
          if (prev.status === 'ready' && prev.data.settingsRevision > next.settingsRevision) {
            return { status: 'ready', data: { ...next, dailyGoalWords: prev.data.dailyGoalWords, settingsRevision: prev.data.settingsRevision } };
          }
          return { status: 'ready', data: next };
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        // A refresh that fails keeps what is already on screen.
        setLoad((prev) => (prev.status === 'ready' ? prev : { status: isWritingUnavailable(error) ? 'unavailable' : 'error' }));
      });
    return () => controller.abort();
  }, [locale, today, weekStart, attempt]);

  const retry = () => {
    setLoad({ status: 'loading' });
    setAttempt((n) => n + 1);
  };
  const refresh = () => setAttempt((n) => n + 1);

  const data = load.status === 'ready' ? load.data : null;
  const calendar = useMemo(() => (data ? buildCalendar(data.days, today, weekStart) : null), [data, today, weekStart]);

  // /me#escritura (from Studio): the block renders after the session loads,
  // too late for the browser's own jump, so scroll once it has its height.
  const sectionRef = useRef<HTMLElement>(null);
  const scrolled = useRef(false);
  useEffect(() => {
    if (!data || scrolled.current) return;
    scrolled.current = true;
    if (window.location.hash === `#${WRITING_ANCHOR}`) sectionRef.current?.scrollIntoView?.({ block: 'start' });
  }, [data]);

  if (load.status === 'unavailable') return null;

  const onSaved = (saved: WritingSettings) =>
    setLoad((prev) =>
      prev.status === 'ready' ? { status: 'ready', data: { ...prev.data, dailyGoalWords: saved.dailyGoalWords, settingsRevision: saved.revision } } : prev,
    );

  const empty = data !== null && data.days.length === 0;

  return (
    <section ref={sectionRef} id={WRITING_ANCHOR} aria-labelledby="writing-title" className="flex scroll-mt-24 flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 id="writing-title" className="type-title-section text-primary">
          {copy.title}
        </h2>
        <p className="max-w-[62ch] type-body-sm text-secondary">{copy.intro}</p>
      </header>

      {load.status === 'loading' ? <InkSkeleton lines={3} height="h-14" label={copy.loading} /> : null}

      {load.status === 'error' ? (
        <InkInlineBanner tone="info" title={copy.loadError} action={<InkTextAction onClick={retry}>{copy.retry}</InkTextAction>} />
      ) : null}

      {data && calendar ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <section aria-labelledby="writing-numbers-title">
              <h3 id="writing-numbers-title" className="sr-only">
                {copy.numbersLabel}
              </h3>
              <dl className="m-0 divide-y divide-divider rounded-card border-quiet border-divider bg-surface">
                {data.currentStreak > 0 ? (
                  <Row label={copy.streak} value={copy.days(data.currentStreak, fmt(data.currentStreak))} hint={copy.streakHint} />
                ) : (
                  <Row label={copy.streak} value="" hint={copy.streakZero} />
                )}
                <Row label={copy.bestStreak} value={copy.days(data.bestStreak, fmt(data.bestStreak))} />
                <Row label={copy.weekWords} value={fmt(wordsInLastDays(data.days, today, 7))} hint={copy.weekHint} />
                <Row label={copy.monthDays} value={fmt(writingDaysInMonth(data.days, today))} />
              </dl>
            </section>

            <DailyGoal
              locale={locale}
              settings={{ dailyGoalWords: data.dailyGoalWords, revision: data.settingsRevision }}
              todayWords={wordsOn(data.days, today)}
              onSaved={onSaved}
              onConflict={refresh}
            />
          </div>

          <section aria-labelledby="writing-calendar-title" className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h3 id="writing-calendar-title" className="type-title-section text-primary">
                {copy.calendar.title}
              </h3>
              {!empty ? <p className="type-caption text-secondary">{copy.calendar.summary(calendar.activeDays, fmt(calendar.activeDays))}</p> : null}
            </div>
            {empty ? (
              <p className="type-body text-secondary">{copy.calendar.empty}</p>
            ) : (
              <WritingCalendar calendar={calendar} today={today} locale={locale} weekStart={weekStart} copy={copy.calendar} />
            )}
          </section>

          <section aria-labelledby="writing-rules-title" className="flex flex-col gap-2">
            <h3 id="writing-rules-title" className="type-label text-secondary">
              {copy.rules.title}
            </h3>
            <ul className="m-0 flex list-disc flex-col gap-1 pl-5 type-body-sm text-secondary">
              <li>{copy.rules.counted}</li>
              <li>{copy.rules.imports}</li>
              <li>{copy.rules.activeDay(fmt(data.activeDayMinChars))}</li>
              <li>{copy.rules.timezone(data.timezone || localTimezone())}</li>
            </ul>
          </section>
        </>
      ) : null}
    </section>
  );
}

/** One line of the summary: a label, the figure (when it is one) and a quiet note. */
function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 px-4 py-3">
      <dt className="col-start-1 row-start-1 type-body-strong text-[15px] text-primary">{label}</dt>
      {value ? (
        <dd className="col-start-2 row-span-2 row-start-1 m-0 font-literary text-[26px] leading-none font-semibold tabular-nums text-primary">{value}</dd>
      ) : null}
      {hint ? <dd className="col-start-1 row-start-2 m-0 type-caption text-secondary">{hint}</dd> : null}
    </div>
  );
}

/** Empty means no goal (0); anything but a whole number in range is invalid (null). */
function parseGoal(text: string): number | null {
  const value = text.trim();
  if (value === '') return 0;
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n <= DAILY_GOAL_MAX ? n : null;
}

type Notice = { tone: 'saved' | 'conflict' | 'error'; text: string };

/**
 * The personal daily goal (duels + works), edited in place. Saved under the
 * settings revision: a save that finds it changed elsewhere refreshes the
 * block and keeps what you typed, so you can look once more.
 */
function DailyGoal({
  locale,
  settings,
  todayWords,
  onSaved,
  onConflict,
}: {
  locale: Locale;
  settings: WritingSettings;
  todayWords: number;
  onSaved: (saved: WritingSettings) => void;
  onConflict: () => void;
}) {
  const copy = WRITING_COPY[locale].goal;
  const fmt = (n: number) => n.toLocaleString(INTL_LOCALE[locale]);
  const [text, setText] = useState(() => String(settings.dailyGoalWords));
  const [seen, setSeen] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  // The saved goal moved on (our own save, a conflict refresh): follow it,
  // unless you are in the middle of typing something else.
  if (seen.revision !== settings.revision || seen.dailyGoalWords !== settings.dailyGoalWords) {
    const pristine = text === String(seen.dailyGoalWords);
    setSeen(settings);
    if (pristine) setText(String(settings.dailyGoalWords));
  }

  const parsed = parseGoal(text);
  const edited = parsed !== settings.dailyGoalWords;
  const canSave = parsed !== null && edited && !busy;

  async function save() {
    if (!canSave || parsed === null) return;
    setBusy(true);
    setNotice(null);
    try {
      const saved = await writingApi.saveSettings({ dailyGoalWords: parsed, expectedRevision: settings.revision }, { locale });
      setText(String(saved.dailyGoalWords));
      onSaved(saved);
      setNotice({ tone: 'saved', text: copy.saved });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setNotice({ tone: 'conflict', text: copy.conflict });
        onConflict();
      } else if (error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout')) {
        setNotice({ tone: 'error', text: copy.saveFailedNetwork });
      } else if (error instanceof ApiError && error.status === 400) {
        setNotice({ tone: 'error', text: copy.saveFailedInvalid });
      } else {
        setNotice({ tone: 'error', text: copy.saveFailed });
      }
    } finally {
      setBusy(false);
    }
  }

  const goal = settings.dailyGoalWords;
  const percent = goal > 0 ? Math.min(100, Math.floor((todayWords * 100) / goal)) : 0;
  const barText = copy.bar(fmt(todayWords), fmt(goal));
  const status = busy ? copy.saving : edited ? copy.unsaved : notice?.tone === 'saved' ? copy.saved : '';

  return (
    <div className="flex flex-col gap-4 rounded-card border-quiet border-divider bg-surface p-4">
      {goal > 0 ? (
        <div className="flex flex-col gap-1.5">
          <div
            role="progressbar"
            aria-label={copy.label}
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={Math.min(todayWords, goal)}
            aria-valuetext={barText}
            className="h-3 w-full overflow-hidden rounded-pill border-quiet border-outline bg-sunken"
          >
            <div className="h-full bg-yellow" style={{ width: `${percent}%` }} />
          </div>
          <p className="type-caption text-secondary">{todayWords >= goal ? `${barText} · ${copy.reached}` : barText}</p>
        </div>
      ) : null}

      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <InkTextField
          type="number"
          inputMode="numeric"
          min={0}
          label={copy.label}
          hint={copy.hint}
          value={text}
          error={parsed === null ? copy.invalid(fmt(DAILY_GOAL_MAX)) : undefined}
          onChange={(event) => {
            setText(event.target.value);
            setNotice(null);
          }}
        />
        {notice && notice.tone !== 'saved' ? <InkInlineBanner tone={notice.tone === 'conflict' ? 'notice' : 'error'} title={notice.text} /> : null}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <span role="status" aria-live="polite" className="type-caption text-secondary">
            {status}
          </span>
          <InkButton type="submit" variant="secondary" fullWidth={false} disabled={!canSave} busy={busy} busyLabel={copy.saving}>
            {copy.save}
          </InkButton>
        </div>
      </form>
    </div>
  );
}

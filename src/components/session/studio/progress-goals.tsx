'use client';

import { useState } from 'react';

import { InkButton } from '@/components/ink/ink-button';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { INTL_LOCALE } from '@/lib/i18n';
import { ApiError } from '@/lib/session/api';
import { localTimezone, studioApi } from '@/lib/session/studio/api';
import type { StudioSettings } from '@/lib/session/studio/models';
import { studioAnalytics } from '@/lib/session/studio/studio-analytics';
import { PROGRESS_COPY } from '@/lib/session/studio/studio-plan-copy';

import { useStudio } from './studio-context';
import { StudioInput, StudioToggle } from './studio-ui';

// Goals (PRD §9): voluntary, editable, never tied to a reward. They live in
// the Work's settings (OCC by revision): a save that finds the settings
// changed elsewhere refreshes them and asks the author to look once more.

/** internal/models MaxStudioGoalWords and MaxStudioDailyGoalWords. */
export const GOAL_MAX = { work: 2_000_000, daily: 100_000, session: 100_000 } as const;

type Fields = { work: string; daily: string; session: string; streak: boolean };

const toFields = (s: StudioSettings): Fields => ({
  work: String(s.workGoalWords),
  daily: String(s.dailyGoalWords),
  session: String(s.sessionGoalWords),
  streak: s.streakEnabled,
});

const sameFields = (a: Fields, b: Fields) => a.work === b.work && a.daily === b.daily && a.session === b.session && a.streak === b.streak;

/** Empty means no goal (0); anything but a whole number in range is invalid (null). */
export function parseGoal(text: string, max: number): number | null {
  const value = text.trim();
  if (value === '') return 0;
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n <= max ? n : null;
}

type Notice = { tone: 'saved' | 'conflict' | 'error'; text: string };

export function GoalsPanel({ workWords, todayWords }: { workWords: number; todayWords: number | null }) {
  const { workId, locale, overview, refresh } = useStudio();
  const copy = PROGRESS_COPY[locale].goals;
  const fmt = (n: number) => n.toLocaleString(INTL_LOCALE[locale]);

  // The newest settings we know: the overview's, or the answer to our own save
  // while the overview is still catching up.
  const [local, setLocal] = useState<StudioSettings | null>(null);
  const base = local && local.revision >= overview.settings.revision ? local : overview.settings;
  const [form, setForm] = useState<Fields>(() => toFields(base));
  const [seen, setSeen] = useState({ revision: base.revision, fields: toFields(base) });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  // The saved goals moved on (another tab, a conflict refresh): follow them,
  // unless the author is in the middle of typing something else.
  if (seen.revision !== base.revision) {
    const pristine = sameFields(form, seen.fields);
    setSeen({ revision: base.revision, fields: toFields(base) });
    if (pristine) setForm(toFields(base));
  }

  const parsed = {
    work: parseGoal(form.work, GOAL_MAX.work),
    daily: parseGoal(form.daily, GOAL_MAX.daily),
    session: parseGoal(form.session, GOAL_MAX.session),
  };
  const valid = parsed.work !== null && parsed.daily !== null && parsed.session !== null;
  const edited = !sameFields(form, toFields(base));
  const canSave = valid && edited && !busy;
  const set = (patch: Partial<Fields>) => {
    setForm((current) => ({ ...current, ...patch }));
    setNotice(null);
  };

  async function save() {
    if (!canSave || parsed.work === null || parsed.daily === null || parsed.session === null) return;
    const before = base;
    setBusy(true);
    setNotice(null);
    try {
      const saved = await studioApi.saveSettings(
        workId,
        {
          expectedRevision: before.revision,
          workGoalWords: parsed.work,
          dailyGoalWords: parsed.daily,
          sessionGoalWords: parsed.session,
          streakEnabled: form.streak,
          timezone: localTimezone(),
          onboardingDismissed: before.onboardingDismissed,
        },
        { locale },
      );
      setLocal(saved);
      setSeen({ revision: saved.revision, fields: toFields(saved) });
      setForm(toFields(saved));
      setNotice({ tone: 'saved', text: copy.saved });
      if (saved.workGoalWords !== before.workGoalWords && saved.workGoalWords > 0) studioAnalytics.goalSet(workId, 'work');
      if (saved.dailyGoalWords !== before.dailyGoalWords && saved.dailyGoalWords > 0) studioAnalytics.goalSet(workId, 'daily');
      if (saved.sessionGoalWords !== before.sessionGoalWords && saved.sessionGoalWords > 0) studioAnalytics.goalSet(workId, 'session');
      await refresh().catch(() => {});
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Someone saved other goals first: show them the current ones and let the author decide again.
        setNotice({ tone: 'conflict', text: copy.conflict });
        await refresh().catch(() => {});
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

  const invalid = (value: number | null, max: number) => (value === null ? copy.invalid(fmt(max)) : undefined);
  const status = busy ? copy.saving : edited ? copy.unsaved : notice?.tone === 'saved' ? copy.saved : '';

  return (
    <section aria-labelledby="progress-goals-title" className="flex flex-col gap-4 rounded-card border-quiet border-divider bg-surface p-4">
      <div className="flex flex-col gap-1">
        <h3 id="progress-goals-title" className="type-title-section text-primary">
          {copy.title}
        </h3>
        <p className="type-body-sm text-secondary">{copy.intro}</p>
      </div>

      {base.workGoalWords > 0 || base.dailyGoalWords > 0 ? (
        <div className="flex flex-col gap-3">
          {base.workGoalWords > 0 ? <GoalBar label={copy.workBar} done={workWords} goal={base.workGoalWords} /> : null}
          {base.dailyGoalWords > 0 ? (
            todayWords === null ? (
              <p className="type-caption text-secondary">{copy.todayLoading}</p>
            ) : (
              <GoalBar label={copy.dailyBar} done={todayWords} goal={base.dailyGoalWords} />
            )
          ) : null}
        </div>
      ) : null}

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        noValidate
      >
        <StudioInput
          type="number"
          inputMode="numeric"
          min={0}
          label={copy.work}
          hint={copy.workHint}
          value={form.work}
          error={invalid(parsed.work, GOAL_MAX.work)}
          onChange={(work) => set({ work })}
        />
        <StudioInput
          type="number"
          inputMode="numeric"
          min={0}
          label={copy.daily}
          hint={copy.dailyHint}
          value={form.daily}
          error={invalid(parsed.daily, GOAL_MAX.daily)}
          onChange={(daily) => set({ daily })}
        />
        <StudioInput
          type="number"
          inputMode="numeric"
          min={0}
          label={copy.session}
          hint={copy.sessionHint}
          value={form.session}
          error={invalid(parsed.session, GOAL_MAX.session)}
          onChange={(session) => set({ session })}
        />
        <StudioToggle label={copy.streakToggle} help={copy.streakHelp} checked={form.streak} onChange={(streak) => set({ streak })} />

        {notice && notice.tone !== 'saved' ? <InkInlineBanner tone={notice.tone === 'conflict' ? 'notice' : 'error'} title={notice.text} /> : null}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <span role="status" aria-live="polite" className="type-caption text-secondary">
            {status}
          </span>
          <InkButton type="submit" fullWidth={false} disabled={!canSave} busy={busy} busyLabel={copy.saving}>
            {copy.save}
          </InkButton>
        </div>
      </form>
    </section>
  );
}

/** A bar with its text equivalent: the number never hides behind the colour. */
function GoalBar({ label, done, goal }: { label: string; done: number; goal: number }) {
  const { locale } = useStudio();
  const copy = PROGRESS_COPY[locale].goals;
  const fmt = (n: number) => n.toLocaleString(INTL_LOCALE[locale]);
  const percent = Math.min(100, Math.floor((done * 100) / goal));
  const text = copy.barText(fmt(done), fmt(goal), String(percent));
  const reached = done >= goal;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="type-body-strong text-[15px] text-primary">{label}</p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(done, goal)}
        aria-valuetext={text}
        className="h-3 w-full overflow-hidden rounded-pill border-quiet border-outline bg-sunken"
      >
        <div className="h-full bg-yellow" style={{ width: `${percent}%` }} />
      </div>
      <p className="type-caption text-secondary">{reached ? `${text} · ${copy.reached}` : text}</p>
    </div>
  );
}

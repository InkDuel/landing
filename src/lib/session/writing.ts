'use client';

import type { Locale } from '@/lib/i18n';

import { ApiError, apiRequest } from './api';
import { localTimezone } from './local-time';
import type { CalendarDay } from './writing-calendar';

// «Tu escritura»: the writer's own progress across duels and works
// (inkduel-backend GET /api/me/writing, PUT /api/me/writing/settings; spec
// «Progreso de escritura» §6). Private to the owner. Parsed defensively:
// unknown or missing fields fall back to empty values, never to whatever
// arrived, and an older backend without the endpoint answers 404.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0);
const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** internal/models MaxStudioDailyGoalWords. */
export const DAILY_GOAL_MAX = 100_000;

export type WritingDay = CalendarDay & {
  duelWords: number;
  studioWords: number;
  duels: number;
};

export type WritingSummary = {
  /** Only days with some data, oldest first. */
  days: WritingDay[];
  /** Effective streak: already 0 when the last writing day is before yesterday. */
  currentStreak: number;
  bestStreak: number;
  lastWritingDate: string;
  activeDayMinChars: number;
  timezone: string;
  dailyGoalWords: number;
  settingsRevision: number;
};

export type WritingSettings = { dailyGoalWords: number; revision: number };

function parseDay(data: Record<string, unknown>): WritingDay {
  const duelWords = count(data.duelWords);
  const studioWords = count(data.studioWords);
  return {
    date: str(data.date),
    // The total is the backend's; the breakdown is its fallback.
    words: typeof data.words === 'number' ? count(data.words) : duelWords + studioWords,
    duelWords,
    studioWords,
    duels: count(data.duels),
    active: data.active === true,
  };
}

export function parseWritingSummary(data: unknown): WritingSummary {
  const d = isRecord(data) ? data : {};
  const days = (Array.isArray(d.days) ? d.days : [])
    .filter(isRecord)
    .map(parseDay)
    .filter((day) => YMD.test(day.date))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return {
    days,
    currentStreak: count(d.currentStreak),
    bestStreak: count(d.bestStreak),
    lastWritingDate: YMD.test(str(d.lastWritingDate)) ? str(d.lastWritingDate) : '',
    activeDayMinChars: count(d.activeDayMinChars) || 20,
    timezone: str(d.timezone),
    dailyGoalWords: Math.min(count(d.dailyGoalWords), DAILY_GOAL_MAX),
    settingsRevision: count(d.settingsRevision),
  };
}

export function parseWritingSettings(data: unknown): WritingSettings | null {
  if (!isRecord(data) || typeof data.revision !== 'number' || typeof data.dailyGoalWords !== 'number') return null;
  return { dailyGoalWords: count(data.dailyGoalWords), revision: count(data.revision) };
}

/** An older backend without «Tu escritura»: the block hides itself. */
export function isWritingUnavailable(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

type Ctx = { locale: Locale; signal?: AbortSignal };

export const writingApi = {
  /** Days in [from, to] (inclusive, local dates) plus the streak and the daily goal. */
  async summary(range: { from: string; to: string; today: string }, { locale, signal }: Ctx): Promise<WritingSummary> {
    return parseWritingSummary(await apiRequest('GET', '/api/me/writing', { locale, signal, query: range }));
  },

  /** Saves the personal daily goal under the settings revision (409 when it moved on). */
  async saveSettings(input: { dailyGoalWords: number; expectedRevision: number }, { locale }: Ctx): Promise<WritingSettings> {
    const saved = parseWritingSettings(
      await apiRequest('PUT', '/api/me/writing/settings', { locale, body: { ...input, timezone: localTimezone() } }),
    );
    if (!saved) throw new ApiError(200, 'parse');
    return saved;
  },
};

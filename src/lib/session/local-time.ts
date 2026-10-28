// The writer's own clock, for everything counted by local day: the Studio and
// profile writing calendars, and the `timezone` field sent in JSON bodies
// (never as a header: CORS only allows Authorization, Content-Type and
// Accept-Language).

/** The writer's IANA zone, or UTC when the browser cannot tell. */
export function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** The local calendar date (YYYY-MM-DD) of an instant. */
export function localDate(at: Date = new Date()): string {
  const y = at.getFullYear();
  const m = String(at.getMonth() + 1).padStart(2, '0');
  const d = String(at.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

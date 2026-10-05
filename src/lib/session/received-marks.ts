import type { ReceivedMark } from './marks';

// «Marcas recibidas»: duel-story comments and chapter Marcas merged into one
// newest-first list. A port of inkduel_mobile's ReceivedMarksMergeEngine.
//
// Not «first page of A + first page of B, sorted»: with sources of different
// density, B's second page can hold rows that belong above A's first. So it is
// a real k-way merge: each source keeps its own cursor and sorted buffer, and
// a row is only emitted once every active source has a head to compare it
// with (or has ended). A source whose next row is unknown — failed, or paused
// on its empty-page budget — stops the merge rather than letting an older row
// jump the queue; wrong order cannot be taken back once seen.
//
// Web rule (founder, phase 3): a source answering 503 is switched off by the
// backend and leaves the merge, so the inbox keeps working with the other.
// Any other failure blocks, offers a retry of that source alone, and is never
// read as «no Marcas».

export type MarkSource = ReceivedMark['source'];

export type SourcePage = { items: ReceivedMark[]; nextCursor: string | null };

export type SourceConfig = {
  source: MarkSource;
  fetch: (limit: number, cursor: string | null) => Promise<SourcePage>;
};

const SOURCE_ORDER: Record<MarkSource, number> = { duelStory: 0, workChapter: 1 };

/** Newest first; ties broken by source then id so the merge is deterministic. */
export function compareNewestFirst(a: ReceivedMark, b: ReceivedMark): number {
  const byDate = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (byDate !== 0) return byDate;
  const bySource = SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source];
  if (bySource !== 0) return bySource;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Rows are keyed by source AND id: the two domains mint ids independently. */
export const markKey = (mark: ReceivedMark) => `${mark.source}:${mark.id}`;

class SourceState {
  readonly config: SourceConfig;
  buffer: ReceivedMark[] = [];
  cursor: string | null = null;
  /** Only a response without a cursor ends a source, never an empty page. */
  exhausted = false;
  /** Switched off by the backend (503): out of the merge, not an error. */
  unavailable = false;
  loadedOnce = false;
  failure: unknown = null;
  paused = false;

  constructor(config: SourceConfig) {
    this.config = config;
  }

  get needsFill() {
    return this.buffer.length === 0 && !this.exhausted && this.failure === null && !this.paused;
  }
  /** Its next row is known: buffered, or there is none. */
  get hasResolvedHead() {
    return this.buffer.length > 0 || this.exhausted;
  }
  get isBlocking() {
    return this.buffer.length === 0 && !this.exhausted && this.failure !== null;
  }
  get isPaused() {
    return this.buffer.length === 0 && !this.exhausted && this.failure === null && this.paused;
  }
}

export class ReceivedMarksMerge {
  private readonly sources: SourceState[];
  private readonly fetchPageSize: number;
  private readonly maxEmptyPages: number;
  private readonly isUnavailable: (error: unknown) => boolean;

  constructor(
    sources: SourceConfig[],
    options: { isUnavailable: (error: unknown) => boolean; fetchPageSize?: number; maxEmptyPages?: number },
  ) {
    this.sources = sources.map((config) => new SourceState(config));
    this.isUnavailable = options.isUnavailable;
    // A full page even for a preview of three: three per source would run
    // dry at once and turn the preview into a burst of requests.
    this.fetchPageSize = options.fetchPageSize ?? 20;
    this.maxEmptyPages = options.maxEmptyPages ?? 5;
  }

  /** Anything left to emit: a buffered row or a cursor not yet followed. */
  get hasMore(): boolean {
    return this.sources.some((source) => source.buffer.length > 0 || !source.exhausted);
  }

  /** Every source the backend switched off. All of them: nothing to show. */
  get allUnavailable(): boolean {
    return this.sources.length > 0 && this.sources.every((source) => source.unavailable);
  }

  /**
   * Every active source answered, none failed, none paused: the condition to
   * advance «visto hasta». A source switched off by the backend is not active.
   */
  get allSourcesHealthy(): boolean {
    return this.sources.every(
      (source) => source.unavailable || (source.loadedOnce && source.failure === null && !source.isPaused),
    );
  }

  get blockingSource(): MarkSource | null {
    return this.sources.find((source) => source.isBlocking)?.config.source ?? null;
  }

  get blockingFailure(): unknown {
    return this.sources.find((source) => source.isBlocking)?.failure ?? null;
  }

  /** Lets the next take() retry the failed source; healthy ones keep their pages. */
  clearFailures() {
    for (const source of this.sources) source.failure = null;
  }

  /** Up to [target] rows in global order; fewer when sources ended, failed or paused. */
  async take(target: number): Promise<ReceivedMark[]> {
    for (const source of this.sources) source.paused = false;
    const emitted: ReceivedMark[] = [];
    while (emitted.length < target) {
      for (const source of this.sources) {
        if (source.needsFill) await this.fill(source);
      }
      // THE emit condition: every source's next row is known.
      if (!this.sources.every((source) => source.hasResolvedHead)) break;
      let best: SourceState | null = null;
      for (const source of this.sources) {
        if (source.buffer.length === 0) continue;
        if (!best || compareNewestFirst(source.buffer[0], best.buffer[0]) < 0) best = source;
      }
      if (!best) break;
      emitted.push(best.buffer.shift() as ReceivedMark);
    }
    return emitted;
  }

  private async fill(source: SourceState) {
    let emptyPages = 0;
    while (source.buffer.length === 0 && !source.exhausted && emptyPages < this.maxEmptyPages) {
      try {
        const page = await source.config.fetch(this.fetchPageSize, source.cursor);
        source.loadedOnce = true;
        source.failure = null;
        source.cursor = page.nextCursor;
        if (!page.nextCursor) source.exhausted = true;
        if (page.items.length > 0) {
          source.buffer.push(...[...page.items].sort(compareNewestFirst));
          return;
        }
        if (source.exhausted) return;
        // Empty with a cursor: the backend skipped rows the user must not
        // see and wants to be asked again.
        emptyPages += 1;
      } catch (error) {
        source.loadedOnce = true;
        if (this.isUnavailable(error)) {
          source.unavailable = true;
          source.exhausted = true;
          return;
        }
        source.failure = error;
        return;
      }
    }
    if (source.buffer.length === 0 && !source.exhausted && source.failure === null) source.paused = true;
  }
}

// «Visto hasta»: one timestamp per account in this browser, no content. Read
// state is per device, as in the app; it does not sync with the phone.

const SEEN_PREFIX = 'inkduel-marks-seen:';

export function readSeen(uid: string): number | null {
  if (!uid) return null;
  try {
    const raw = window.localStorage.getItem(SEEN_PREFIX + uid);
    const value = raw ? Date.parse(raw) : Number.NaN;
    return Number.isNaN(value) ? null : value;
  } catch {
    return null;
  }
}

/** Advances the marker only forward. */
export function markSeen(uid: string, newestIso: string) {
  const next = Date.parse(newestIso);
  if (!uid || Number.isNaN(next)) return;
  const current = readSeen(uid);
  if (current !== null && next <= current) return;
  try {
    window.localStorage.setItem(SEEN_PREFIX + uid, new Date(next).toISOString());
  } catch {
    // Storage blocked (private mode): rows simply stay new.
  }
}
